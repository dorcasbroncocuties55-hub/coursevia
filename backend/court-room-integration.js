// Court Room Integration Middleware
// Handles integration between existing Coursevia systems and the Court Room dispute resolution
//
// PATCHED VERSION — fixes:
//   1. evaluateEscalationRules had an `if (true) return true` short-circuit that made
//      all the real criteria below it dead/unreachable code. Now controlled by an
//      explicit ESCALATE_ALL_REFUNDS flag so the "always escalate" behavior is
//      intentional and documented, and the real rules actually run when disabled.
//   2. assignJudgeToCase used `.eq('judge_availability.is_available', true)` on a
//      joined table, which supabase-js/PostgREST does not support via plain `.eq()`
//      on a nested resource — it was silently not filtering. Fixed with `!inner`
//      join syntax so unavailable judges are correctly excluded.
//   3. judge.specialization.includes(...) crashed (TypeError) if a judge row had a
//      null specialization, silently aborting judge assignment via the catch block.
//      Now guards with `?? []`.
//   4. applyProviderRestrictions and assignJudgeToCase failures were swallowed
//      (console.error only) — autoEscalateToCourtRoom would report `escalated: true`
//      even if the provider restriction never landed or no judge got assigned.
//      Both now return { success, error } and autoEscalateToCourtRoom surfaces
//      partial failures in its result instead of hiding them.
//   5. case_load increment was a non-atomic read-then-write, vulnerable to lost
//      updates under concurrent escalations. Switched to a Postgres RPC call
//      (see increment_judge_case_load SQL below) with a safe JS fallback.
//   6. checkMercyWindowAccess now orders bookings by scheduled_at so the picked
//      "active booking" is deterministic when multiple overlap the mercy window.
//
// --- REQUIRED SQL (run once in Supabase) for the atomic case_load increment ---
// create or replace function increment_judge_case_load(judge_id uuid)
// returns void as $$
//   update judges set case_load = coalesce(case_load, 0) + 1 where id = judge_id;
// $$ language sql volatile;
// -------------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const _supabaseUrl = process.env.SUPABASE_URL || "";
const _supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = _supabaseUrl && _supabaseKey
  ? createClient(_supabaseUrl, _supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
import { courtRoomEmailService } from "./court-room-email-service.js";
import crypto from "crypto";

// Set to false to enable the real weighted escalation criteria below instead of
// escalating every refund unconditionally. Kept as an explicit flag (rather than
// a stray `if (true)`) so the current "escalate everything" behavior is a
// deliberate, documented choice and not dead code masking real rules.
const ESCALATE_ALL_REFUNDS = true;

/**
 * Auto-escalate refund requests to court room based on business rules
 */
export const autoEscalateToCourtRoom = async (refundData) => {
  try {
    console.log('Evaluating refund for court room escalation:', refundData);

    const {
      booking_id,
      learner_id,
      provider_id,
      amount,
      reason,
      refund_type = 'dispute'
    } = refundData;

    const shouldEscalate = evaluateEscalationRules(refundData);

    if (!shouldEscalate) {
      console.log('Refund does not meet escalation criteria');
      return { escalated: false, reason: 'Does not meet escalation criteria' };
    }

    // Create court case
    const courtCase = await createCourtCase({
      booking_id,
      learner_id,
      provider_id,
      disputed_amount: amount,
      dispute_type: mapReasonToDisputeType(reason),
      refund_type
    });

    // Apply provider restrictions (mercy rule system) — failure is tracked, not hidden
    const restrictionResult = await applyProviderRestrictions(provider_id, courtCase.id);

    // Assign judge — failure is tracked, not hidden
    const judgeAssignmentResult = await assignJudgeToCase(courtCase.id);

    // Send notifications — courtRoomEmailService now returns { success, errors }
    const emailResult = await courtRoomEmailService.sendCaseOpenedNotifications(courtCase);
    await courtRoomEmailService.scheduleReminders(courtCase.id, courtCase);

    const warnings = [];
    if (!restrictionResult.success) {
      warnings.push(`Provider restriction failed to apply: ${restrictionResult.error}`);
      console.error(`[autoEscalateToCourtRoom] Case ${courtCase.case_number}: provider restriction FAILED — provider may retain unrestricted access.`);
    }
    if (!judgeAssignmentResult.success) {
      warnings.push(`Judge assignment failed: ${judgeAssignmentResult.error}`);
      console.error(`[autoEscalateToCourtRoom] Case ${courtCase.case_number}: no judge assigned — case will sit unassigned until manually handled.`);
    }
    if (!emailResult.success) {
      warnings.push(`Some notifications failed to send: ${emailResult.errors?.length || 0} error(s)`);
    }

    console.log(`Refund escalated to court room. Case: ${courtCase.case_number}${warnings.length ? ` (with ${warnings.length} warning(s))` : ''}`);

    return {
      escalated: true,
      courtCase,
      success: warnings.length === 0,
      warnings,
      message: `Refund request has been escalated to dispute resolution. Case ${courtCase.case_number} created.`
    };

  } catch (error) {
    console.error('Error escalating to court room:', error);
    return {
      escalated: false,
      error: error.message
    };
  }
};

/**
 * Evaluate if refund should be escalated to court room
 */
function evaluateEscalationRules(refundData) {
  // Rule 1a: ANY refund triggers court room (current business rule).
  // Controlled by ESCALATE_ALL_REFUNDS at the top of this file — flip it to
  // false to activate the weighted criteria below instead.
  if (ESCALATE_ALL_REFUNDS) {
    return true;
  }

  const { amount, reason, provider_history, learner_history } = refundData;

  const escalationCriteria = [
    amount > 100, // High value disputes
    reason?.toLowerCase().includes('fraud'),
    reason?.toLowerCase().includes('unauthorized'),
    reason?.toLowerCase().includes('quality'),
    provider_history?.dispute_count > 2, // Repeat offender
    learner_history?.refund_count > 5 // Frequent refunder
  ];

  return escalationCriteria.some(criteria => criteria);
}

/**
 * Map refund reason to dispute type
 */
function mapReasonToDisputeType(reason) {
  if (!reason) return 'service_quality';

  const reasonLower = reason.toLowerCase();

  if (reasonLower.includes('fraud') || reasonLower.includes('unauthorized')) {
    return 'fraud_suspicion';
  }
  if (reasonLower.includes('quality') || reasonLower.includes('poor')) {
    return 'service_quality';
  }
  if (reasonLower.includes('refund') || reasonLower.includes('cancel')) {
    return 'refund_request';
  }
  if (reasonLower.includes('billing') || reasonLower.includes('charge')) {
    return 'billing_dispute';
  }

  return 'service_quality'; // Default
}

/**
 * Create new court case
 */
async function createCourtCase(caseData) {
  const {
    booking_id,
    learner_id,
    provider_id,
    disputed_amount,
    dispute_type,
    refund_type
  } = caseData;

  const caseNumber = await generateCaseNumber();
  const priority = calculatePriority(disputed_amount, dispute_type);
  const complexity = calculateComplexity(caseData);

  const { data: courtCase, error: caseError } = await supabase
    .from('court_cases')
    .insert({
      case_number: caseNumber,
      booking_id,
      learner_id,
      provider_id,
      dispute_type,
      disputed_amount,
      priority_level: priority,
      complexity_score: complexity,
      status: 'open',
      case_metadata: {
        refund_type,
        auto_escalated: true,
        escalation_timestamp: new Date().toISOString()
      }
    })
    .select()
    .single();

  if (caseError) throw caseError;

  const { error: participantsError } = await supabase
    .from('case_participants')
    .insert([
      {
        case_id: courtCase.id,
        participant_id: learner_id,
        participant_type: 'learner'
      },
      {
        case_id: courtCase.id,
        participant_id: provider_id,
        participant_type: 'provider'
      }
    ]);

  if (participantsError) {
    console.error(`[createCourtCase] Failed to add participants for case ${caseNumber}:`, participantsError);
  }

  const { error: messageError } = await supabase
    .from('case_messages')
    .insert({
      case_id: courtCase.id,
      sender_type: 'system',
      message_type: 'system',
      content: `Court case ${caseNumber} has been opened for dispute resolution. Disputed amount: $${disputed_amount}. Dispute type: ${dispute_type.replace('_', ' ')}.`,
      visible_to: ['learner', 'provider', 'judge']
    });

  if (messageError) {
    console.error(`[createCourtCase] Failed to create system message for case ${caseNumber}:`, messageError);
  }

  return courtCase;
}

/**
 * Generate unique case number
 */
async function generateCaseNumber() {
  const year = new Date().getFullYear();
  const randomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CR${year}${randomId}`;
}

/**
 * Calculate case priority based on amount and type
 */
function calculatePriority(amount, disputeType) {
  if (amount > 1000 || disputeType === 'fraud_suspicion') {
    return 'urgent';
  }
  if (amount > 500) {
    return 'high';
  }
  if (amount > 100) {
    return 'medium';
  }
  return 'low';
}

/**
 * Calculate case complexity score (1-10)
 */
function calculateComplexity(caseData) {
  let score = 3; // Base score

  if (caseData.disputed_amount > 500) score += 2;
  if (caseData.dispute_type === 'fraud_suspicion') score += 3;
  if (caseData.refund_type === 'chargeback') score += 2;

  return Math.min(score, 10);
}

/**
 * Apply provider restrictions with mercy rule.
 * Returns { success, error? } instead of swallowing failures.
 */
async function applyProviderRestrictions(providerId, caseId) {
  try {
    const { error } = await supabase
      .from('provider_restrictions')
      .insert({
        provider_id: providerId,
        court_case_id: caseId,
        restriction_type: 'dashboard_access',
        is_active: true,
        mercy_rule_enabled: true,
        mercy_window_minutes: 30,
        restriction_metadata: {
          applied_at: new Date().toISOString(),
          reason: 'Active dispute case'
        }
      });

    if (error) {
      console.error('Error applying provider restrictions:', error);
      return { success: false, error: error.message };
    }

    console.log(`Provider restrictions applied for provider ${providerId}`);
    return { success: true };
  } catch (error) {
    console.error('Error applying provider restrictions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-assign judge to case based on specialization and workload.
 * Returns { success, judgeId?, error? } instead of swallowing failures.
 */
async function assignJudgeToCase(caseId) {
  try {
    const { data: courtCase, error: caseError } = await supabase
      .from('court_cases')
      .select('dispute_type, priority_level, complexity_score')
      .eq('id', caseId)
      .single();

    if (caseError || !courtCase) {
      const msg = caseError?.message || 'Case not found';
      console.error(`Error fetching case ${caseId} for judge assignment:`, msg);
      return { success: false, error: msg };
    }

    // NOTE: `.eq('judge_availability.is_available', true)` on the original code
    // does not filter a joined/nested resource in supabase-js — it was silently
    // ignored. Using `!inner` forces an inner join and makes the nested `.eq()`
    // apply correctly, so unavailable judges are actually excluded.
    const { data: judges, error: judgesError } = await supabase
      .from('judges')
      .select(`
        id,
        specialization,
        rank,
        case_load,
        judge_availability!inner (is_available)
      `)
      .eq('judge_availability.is_available', true);

    if (judgesError) {
      console.error('Error fetching available judges:', judgesError);
      return { success: false, error: judgesError.message };
    }

    if (!judges || judges.length === 0) {
      console.log('No available judges found');
      return { success: false, error: 'No available judges found' };
    }

    const scoredJudges = judges.map(judge => {
      let score = 0;
      // Guard against null/undefined specialization instead of crashing.
      const specialization = judge.specialization ?? [];

      if (specialization.includes(courtCase.dispute_type)) {
        score += 50;
      }
      if (specialization.includes('general')) {
        score += 20;
      }

      const rankBonus = { senior: 30, associate: 20, junior: 10 };
      score += rankBonus[judge.rank] || 0;

      score -= (judge.case_load || 0) * 5;

      if (courtCase.complexity_score >= 7 && judge.rank === 'senior') {
        score += 25;
      }

      return { ...judge, score };
    });

    const selectedJudge = scoredJudges.sort((a, b) => b.score - a.score)[0];

    if (!selectedJudge) {
      return { success: false, error: 'No suitable judge found after scoring' };
    }

    const { error: assignError } = await supabase
      .from('court_cases')
      .update({ assigned_judge_id: selectedJudge.id })
      .eq('id', caseId);

    if (assignError) {
      console.error('Error assigning judge to case:', assignError);
      return { success: false, error: assignError.message };
    }

    // Atomic increment via RPC to avoid a lost update if two escalations happen
    // concurrently for the same judge. Falls back to the old read-then-write
    // behavior if the RPC hasn't been created yet, so this doesn't hard-fail
    // deployments that haven't run the migration.
    const { error: incrementError } = await supabase.rpc('increment_judge_case_load', {
      judge_id: selectedJudge.id
    });

    if (incrementError) {
      console.warn(`[assignJudgeToCase] increment_judge_case_load RPC unavailable (${incrementError.message}), falling back to non-atomic update. Run the SQL in this file's header comment to fix.`);
      const { error: fallbackError } = await supabase
        .from('judges')
        .update({ case_load: (selectedJudge.case_load || 0) + 1 })
        .eq('id', selectedJudge.id);

      if (fallbackError) {
        console.error('Error updating judge case_load (fallback):', fallbackError);
        // Judge is still assigned to the case even if the load counter update
        // failed — that's a minor stats issue, not a functional failure, so we
        // don't fail the whole assignment for it.
      }
    }

    console.log(`Judge ${selectedJudge.id} assigned to case ${caseId}`);
    return { success: true, judgeId: selectedJudge.id };
  } catch (error) {
    console.error('Error assigning judge:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check mercy window access for providers
 */
export const checkMercyWindowAccess = async (providerId) => {
  try {
    const now = new Date();
    const mercyStart = new Date(now.getTime() - 30 * 60 * 1000);
    const mercyEnd = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: activeBookings, error } = await supabase
      .from('bookings')
      .select('id, scheduled_at, learner_id, profiles:learner_id(full_name)')
      .eq('provider_id', providerId)
      .gte('scheduled_at', mercyStart.toISOString())
      .lte('scheduled_at', mercyEnd.toISOString())
      .eq('status', 'confirmed')
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error checking mercy window access:', error);
      return {
        hasAccess: false,
        activeBooking: null,
        mercyStart: mercyStart.toISOString(),
        mercyEnd: mercyEnd.toISOString(),
        nextBooking: null
      };
    }

    const hasAccess = activeBookings && activeBookings.length > 0;
    const activeBooking = hasAccess ? activeBookings[0] : null;

    return {
      hasAccess,
      activeBooking,
      mercyStart: mercyStart.toISOString(),
      mercyEnd: mercyEnd.toISOString(),
      nextBooking: activeBooking ? {
        id: activeBooking.id,
        time: activeBooking.scheduled_at,
        student: activeBooking.profiles?.full_name
      } : null
    };
  } catch (error) {
    console.error('Error checking mercy window access:', error);
    return {
      hasAccess: false,
      activeBooking: null,
      mercyStart: null,
      mercyEnd: null,
      nextBooking: null
    };
  }
};

export default {
  autoEscalateToCourtRoom,
  checkMercyWindowAccess
};