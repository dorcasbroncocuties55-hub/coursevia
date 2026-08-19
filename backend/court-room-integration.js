// Court Room Integration Middleware
// Handles integration between existing Coursevia systems and the Court Room dispute resolution

import { supabase } from "../src/integrations/supabase/client.js";
import { courtRoomEmailService } from "./court-room-email-service.js";
import crypto from "crypto";

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

    // Business rules for auto-escalation (as per user requirements: 1a - any refund triggers court room)
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

    // Apply provider restrictions (mercy rule system)
    await applyProviderRestrictions(provider_id, courtCase.id);

    // Assign judge
    await assignJudgeToCase(courtCase.id);

    // Send notifications
    await courtRoomEmailService.sendCaseOpenedNotifications(courtCase);
    await courtRoomEmailService.scheduleReminders(courtCase.id, courtCase);

    console.log(`Refund escalated to court room. Case: ${courtCase.case_number}`);

    return {
      escalated: true,
      courtCase,
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
  // Rule 1a: ANY refund triggers court room (as per user requirements)
  // This is the primary rule - all refunds go to court room
  
  const { amount, reason, provider_history, learner_history } = refundData;

  // Always escalate (Rule 1a)
  if (true) {
    return true;
  }

  // Additional escalation rules (for future flexibility)
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

  // Generate case number
  const caseNumber = await generateCaseNumber();

  // Calculate priority and complexity
  const priority = calculatePriority(disputed_amount, dispute_type);
  const complexity = calculateComplexity(caseData);

  // Create court case
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

  // Add case participants
  await supabase
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

  // Create initial system message
  await supabase
    .from('case_messages')
    .insert({
      case_id: courtCase.id,
      sender_type: 'system',
      message_type: 'system',
      content: `Court case ${caseNumber} has been opened for dispute resolution. Disputed amount: $${disputed_amount}. Dispute type: ${dispute_type.replace('_', ' ')}.`,
      visible_to: ['learner', 'provider', 'judge']
    });

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
 * Apply provider restrictions with mercy rule
 */
async function applyProviderRestrictions(providerId, caseId) {
  try {
    // Create provider restriction record
    await supabase
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

    console.log(`Provider restrictions applied for provider ${providerId}`);
  } catch (error) {
    console.error('Error applying provider restrictions:', error);
  }
}

/**
 * Auto-assign judge to case based on specialization and workload
 */
async function assignJudgeToCase(caseId) {
  try {
    // Get case details
    const { data: courtCase } = await supabase
      .from('court_cases')
      .select('dispute_type, priority_level, complexity_score')
      .eq('id', caseId)
      .single();

    if (!courtCase) return;

    // Find suitable judges
    const { data: judges } = await supabase
      .from('judges')
      .select(`
        id, 
        specialization, 
        rank, 
        case_load,
        judge_availability (is_available)
      `)
      .eq('judge_availability.is_available', true);

    if (!judges || judges.length === 0) {
      console.log('No available judges found');
      return;
    }

    // Score judges based on specialization, rank, and current workload
    const scoredJudges = judges.map(judge => {
      let score = 0;
      
      // Specialization match
      if (judge.specialization.includes(courtCase.dispute_type)) {
        score += 50;
      }
      if (judge.specialization.includes('general')) {
        score += 20;
      }
      
      // Rank bonus
      const rankBonus = { 'senior': 30, 'associate': 20, 'junior': 10 };
      score += rankBonus[judge.rank] || 0;
      
      // Workload penalty (prefer judges with lower case load)
      score -= (judge.case_load || 0) * 5;
      
      // Complexity match
      if (courtCase.complexity_score >= 7 && judge.rank === 'senior') {
        score += 25;
      }
      
      return { ...judge, score };
    });

    // Select judge with highest score
    const selectedJudge = scoredJudges.sort((a, b) => b.score - a.score)[0];

    if (selectedJudge) {
      // Assign judge to case
      await supabase
        .from('court_cases')
        .update({ assigned_judge_id: selectedJudge.id })
        .eq('id', caseId);

      // Increment judge's case load
      await supabase
        .from('judges')
        .update({ case_load: (selectedJudge.case_load || 0) + 1 })
        .eq('id', selectedJudge.id);

      console.log(`Judge ${selectedJudge.id} assigned to case ${caseId}`);
    }
  } catch (error) {
    console.error('Error assigning judge:', error);
  }
}

/**
 * Check mercy window access for providers
 */
export const checkMercyWindowAccess = async (providerId) => {
  try {
    // Get active bookings within mercy window (30 minutes before/after)
    const now = new Date();
    const mercyStart = new Date(now.getTime() - 30 * 60 * 1000);
    const mercyEnd = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('id, scheduled_at, learner_id, profiles:learner_id(full_name)')
      .eq('provider_id', providerId)
      .gte('scheduled_at', mercyStart.toISOString())
      .lte('scheduled_at', mercyEnd.toISOString())
      .eq('status', 'confirmed');

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