import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { courtRoomEmailService } from "./court-room-email-service.js";

// Backend-only Supabase admin client — never import the frontend browser client here
const _url = process.env.SUPABASE_URL || "";
const _key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = _url && _key
  ? createClient(_url, _key, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// Court Room API Routes for Dispute Resolution System
// Integrates with existing Coursevia backend

// ── Utilities ──────────────────────────────────────────────────────────────────

const generateCaseNumber = () => {
  const year = new Date().getFullYear();
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CV-${year}-${randomSuffix}`;
};

const logJudgeActivity = async (judgeId, caseId, activityType, description, metadata = {}) => {
  if (!supabaseAdmin) return;

  await supabaseAdmin.from('judge_activity_log').insert({
    judge_id: judgeId,
    case_id: caseId,
    activity_type: activityType,
    description,
    metadata,
    ip_address: metadata.ip_address || null,
    user_agent: metadata.user_agent || null
  });
};

const checkProviderRestrictions = async (providerId) => {
  if (!supabaseAdmin) return { restricted: false };

  const { data: restrictions } = await supabaseAdmin
    .from('provider_restrictions')
    .select(`
      *,
      court_cases!inner(status)
    `)
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .eq('court_cases.status', 'open');

  return {
    restricted: restrictions && restrictions.length > 0,
    activeRestrictions: restrictions || [],
    mercyEnabled: restrictions?.[0]?.mercy_enabled || false,
    mercyWindowMinutes: restrictions?.[0]?.mercy_window_minutes || 30
  };
};

const checkMercyWindowAccess = async (providerId) => {
  if (!supabaseAdmin) return { hasAccess: false };

  const now = new Date();
  const { data: upcomingBookings } = await supabaseAdmin
    .from('bookings')
    .select('scheduled_at, duration')
    .eq('provider_id', providerId)
    .eq('status', 'confirmed')
    .gte('scheduled_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()) // 2 hours ago
    .lte('scheduled_at', new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()); // 2 hours from now

  if (!upcomingBookings || upcomingBookings.length === 0) {
    return { hasAccess: false };
  }

  // Check if any booking is within mercy window
  for (const booking of upcomingBookings) {
    const bookingStart = new Date(booking.scheduled_at);
    const bookingEnd = new Date(bookingStart.getTime() + (booking.duration || 60) * 60 * 1000);
    const mercyStart = new Date(bookingStart.getTime() - 30 * 60 * 1000); // 30 min before
    const mercyEnd = new Date(bookingEnd.getTime() + 30 * 60 * 1000); // 30 min after

    if (now >= mercyStart && now <= mercyEnd) {
      return {
        hasAccess: true,
        activeBooking: booking,
        mercyStart: mercyStart.toISOString(),
        mercyEnd: mercyEnd.toISOString()
      };
    }
  }

  return { hasAccess: false };
};

// ── Court Room Routes ──────────────────────────────────────────────────────────

export const courtRoomRoutes = (app, supabaseAdmin) => {

  // Get court case details
  app.get("/api/court/case/:caseId", async (req, res) => {
    try {
      const { caseId } = req.params;
      const userId = req.headers['x-user-id'];
      const judgeId = req.headers['x-judge-id'];

      if (!userId && !judgeId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { data: courtCase, error } = await supabaseAdmin
        .from('court_cases')
        .select(`
          *,
          refunds(*),
          case_participants(*),
          dispute_evidence(*),
          case_messages(*),
          judges(full_name, email, rank),
          judge_case_assignments(*)
        `)
        .eq('id', caseId)
        .single();

      if (error || !courtCase) {
        return res.status(404).json({ message: "Court case not found" });
      }

      // Check access permissions
      const hasAccess = judgeId === courtCase.assigned_judge_id ||
        courtCase.case_participants.some(p =>
          p.participant_id === userId &&
          p.participant_type !== 'judge'
        );

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this case" });
      }

      // Log judge activity if judge is viewing
      if (judgeId) {
        await logJudgeActivity(
          judgeId,
          caseId,
          'case_viewed',
          `Judge viewed case ${courtCase.case_number}`,
          { ip_address: req.ip, user_agent: req.get('User-Agent') }
        );
      }

      res.json({
        success: true,
        case: courtCase
      });

    } catch (error) {
      console.error("[court/case] error:", error);
      res.status(500).json({ message: "Failed to fetch case details" });
    }
  });

  // Get judge dashboard data
  app.get("/api/court/judge/dashboard", async (req, res) => {
    try {
      const judgeId = req.headers['x-judge-id'];

      if (!judgeId) {
        return res.status(401).json({ message: "Judge authentication required" });
      }

      // Get assigned cases
      const { data: assignedCases, error: casesError } = await supabaseAdmin
        .from('judge_case_assignments')
        .select(`
          *,
          court_cases(
            *,
            case_participants(*),
            case_messages(id)
          )
        `)
        .eq('judge_id', judgeId)
        .is('completed_at', null)
        .order('assigned_at', { ascending: false });

      if (casesError) {
        throw casesError;
      }

      // Get judge workload statistics
      const { data: workloadStats } = await supabaseAdmin
        .from('court_cases')
        .select('status, priority_level, complexity_score')
        .eq('assigned_judge_id', judgeId);

      // Calculate statistics
      const stats = {
        totalCases: workloadStats?.length || 0,
        openCases: workloadStats?.filter(c => c.status === 'open').length || 0,
        underReview: workloadStats?.filter(c => c.status === 'under_review').length || 0,
        highPriority: workloadStats?.filter(c => c.priority_level === 'high').length || 0,
        avgComplexity: workloadStats?.length > 0
          ? workloadStats.reduce((sum, c) => sum + (c.complexity_score || 1), 0) / workloadStats.length
          : 0
      };

      res.json({
        success: true,
        assignedCases: assignedCases || [],
        statistics: stats
      });

    } catch (error) {
      console.error("[court/judge/dashboard] error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Send message in court case
  app.post("/api/court/case/:caseId/message", async (req, res) => {
    try {
      const { caseId } = req.params;
      const { content, messageType = 'text', evidenceId = null, isInternal = false } = req.body;
      const userId = req.headers['x-user-id'];
      const judgeId = req.headers['x-judge-id'];

      const senderId = judgeId || userId;
      const senderType = judgeId ? 'judge' : (req.headers['x-user-role'] || 'learner');

      if (!senderId || !content?.trim()) {
        return res.status(400).json({ message: "Sender ID and content required" });
      }

      // Verify case access
      const { data: courtCase } = await supabaseAdmin
        .from('court_cases')
        .select('*, case_participants(*)')
        .eq('id', caseId)
        .single();

      if (!courtCase) {
        return res.status(404).json({ message: "Case not found" });
      }

      const hasAccess = judgeId === courtCase.assigned_judge_id ||
        courtCase.case_participants.some(p => p.participant_id === userId);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Create message
      const { data: message, error } = await supabaseAdmin
        .from('case_messages')
        .insert({
          case_id: caseId,
          sender_id: senderId,
          sender_type: senderType,
          message_type: messageType,
          content: content.trim(),
          evidence_id: evidenceId,
          is_internal: isInternal && senderType === 'judge', // Only judges can send internal messages
          visible_to: isInternal ? ['judge'] : ['learner', 'provider', 'judge']
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log activity
      if (judgeId) {
        await logJudgeActivity(
          judgeId,
          caseId,
          'message_sent',
          `Judge sent ${isInternal ? 'internal ' : ''}message in case ${courtCase.case_number}`,
          { message_id: message.id }
        );
      }

      res.json({
        success: true,
        message
      });

    } catch (error) {
      console.error("[court/case/message] error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Upload evidence
  app.post("/api/court/case/:caseId/evidence", async (req, res) => {
    try {
      const { caseId } = req.params;
      const {
        title,
        description,
        evidenceType,
        content,
        fileName,
        fileUrl,
        fileSize,
        fileType,
        evidenceWeight = 'normal'
      } = req.body;

      const userId = req.headers['x-user-id'];
      const judgeId = req.headers['x-judge-id'];

      const submitterId = judgeId || userId;
      const submitterType = judgeId ? 'judge' : (req.headers['x-user-role'] || 'learner');

      if (!submitterId || !title?.trim() || !evidenceType) {
        return res.status(400).json({ message: "Submitter, title, and evidence type required" });
      }

      // Validate file size (25MB limit)
      if (fileSize && fileSize > 25 * 1024 * 1024) {
        return res.status(400).json({ message: "File size exceeds 25MB limit" });
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4', 'video/avi', 'video/mov', 'video/quicktime',
        'audio/mp3', 'audio/wav', 'audio/m4a'
      ];

      if (fileType && !allowedTypes.includes(fileType)) {
        return res.status(400).json({ message: "File type not allowed" });
      }

      // Create evidence record
      const { data: evidence, error } = await supabaseAdmin
        .from('dispute_evidence')
        .insert({
          case_id: caseId,
          submitted_by: submitterId,
          submitter_type: submitterType,
          evidence_type: evidenceType,
          title: title.trim(),
          description: description?.trim(),
          content: content?.trim(),
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
          evidence_weight: evidenceWeight,
          is_public: submitterType !== 'judge' || req.body.isPublic === true
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create system message about evidence submission
      await supabaseAdmin
        .from('case_messages')
        .insert({
          case_id: caseId,
          sender_id: submitterId,
          sender_type: 'system',
          message_type: 'evidence',
          content: `${submitterType === 'judge' ? 'Judge' : 'User'} submitted evidence: ${title}`,
          evidence_id: evidence.id,
          visible_to: ['learner', 'provider', 'judge']
        });

      // Log activity
      if (judgeId) {
        await logJudgeActivity(
          judgeId,
          caseId,
          'evidence_reviewed',
          `Judge uploaded evidence: ${title}`,
          { evidence_id: evidence.id }
        );
      }

      // Send email notification
      const { data: courtCase } = await supabaseAdmin
        .from('court_cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (courtCase) {
        await courtRoomEmailService.sendEvidenceNotification(evidence, courtCase);
      }

      res.json({
        success: true,
        evidence
      });

    } catch (error) {
      console.error("[court/case/evidence] error:", error);
      res.status(500).json({ message: "Failed to upload evidence" });
    }
  });

  // Judge case decision (approve/reject refund)
  app.post("/api/court/case/:caseId/decision", async (req, res) => {
    try {
      const { caseId } = req.params;
      const { decision, refundAmount, reasoning, newStatus = 'resolved' } = req.body;
      const judgeId = req.headers['x-judge-id'];

      if (!judgeId) {
        return res.status(401).json({ message: "Judge authentication required" });
      }

      if (!decision || !['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ message: "Valid decision (approve/reject) required" });
      }

      if (!reasoning?.trim()) {
        return res.status(400).json({ message: "Decision reasoning required" });
      }

      // Get case details
      const { data: courtCase, error: caseError } = await supabaseAdmin
        .from('court_cases')
        .select('*, refunds(*)')
        .eq('id', caseId)
        .eq('assigned_judge_id', judgeId)
        .single();

      if (caseError || !courtCase) {
        return res.status(404).json({ message: "Case not found or not assigned to you" });
      }

      if (courtCase.status === 'resolved' || courtCase.status === 'closed') {
        return res.status(400).json({ message: "Case already resolved" });
      }

      const finalRefundAmount = decision === 'approve'
        ? (refundAmount || courtCase.disputed_amount)
        : 0;

      // Update court case
      const { error: updateError } = await supabaseAdmin
        .from('court_cases')
        .update({
          status: newStatus,
          refund_amount: finalRefundAmount,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (updateError) {
        throw updateError;
      }

      // Update refund status based on decision
      const refundStatus = decision === 'approve' ? 'processed' : 'rejected';
      const { error: refundError } = await supabaseAdmin
        .from('refunds')
        .update({
          status: refundStatus,
          reject_reason: decision === 'reject' ? reasoning : null,
          processed_at: decision === 'approve' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', courtCase.refund_id);

      if (refundError) {
        throw refundError;
      }

      // Remove provider restrictions
      await supabaseAdmin
        .from('provider_restrictions')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString()
        })
        .eq('case_id', caseId);

      // Complete judge assignment
      await supabaseAdmin
        .from('judge_case_assignments')
        .update({
          completed_at: new Date().toISOString()
        })
        .eq('case_id', caseId);

      // Create decision message
      await supabaseAdmin
        .from('case_messages')
        .insert({
          case_id: caseId,
          sender_id: judgeId,
          sender_type: 'judge',
          message_type: 'decision',
          content: `**CASE DECISION: ${decision.toUpperCase()}**\n\n${reasoning}\n\n${decision === 'approve' ? `Refund Amount: $${finalRefundAmount}` : 'No refund authorized'}`,
          visible_to: ['learner', 'provider', 'judge']
        });

      // Log judge activity
      await logJudgeActivity(
        judgeId,
        caseId,
        'decision_made',
        `Judge ${decision}ed case ${courtCase.case_number} with refund amount: $${finalRefundAmount}`,
        {
          decision,
          refund_amount: finalRefundAmount,
          reasoning: reasoning.substring(0, 200)
        }
      );

      // Send decision email notifications
      await courtRoomEmailService.sendCaseDecisionNotification(
        { decision, refund_amount: finalRefundAmount, reasoning },
        courtCase
      );

      // If approved, process the actual refund (integrate with existing refund system)
      if (decision === 'approve' && finalRefundAmount > 0) {
        // This would integrate with the existing Stripe refund logic
        // For now, just mark as processed - actual refund processing would happen via existing system
      }

      res.json({
        success: true,
        message: `Case ${decision}ed successfully`,
        decision: {
          type: decision,
          refundAmount: finalRefundAmount,
          reasoning
        }
      });

    } catch (error) {
      console.error("[court/case/decision] error:", error);
      res.status(500).json({ message: "Failed to process decision" });
    }
  });

  // ── Judge grants temporary portal access to provider for evidence gathering ──
  app.post("/api/court/case/:caseId/grant-access", async (req, res) => {
    try {
      const { caseId } = req.params;
      const { durationMinutes = 60, reason } = req.body;
      const judgeId = req.headers['x-judge-id'];

      if (!judgeId) {
        return res.status(401).json({ message: "Judge authentication required" });
      }
      if (!reason?.trim()) {
        return res.status(400).json({ message: "Reason for granting access is required" });
      }
      const allowed = [30, 60, 120];
      if (!allowed.includes(Number(durationMinutes))) {
        return res.status(400).json({ message: "Duration must be 30, 60 or 120 minutes" });
      }

      // Verify judge is assigned to this case
      const { data: courtCase, error: caseError } = await supabaseAdmin
        .from('court_cases')
        .select('id, case_number, provider_id, status')
        .eq('id', caseId)
        .eq('assigned_judge_id', judgeId)
        .single();

      if (caseError || !courtCase) {
        return res.status(404).json({ message: "Case not found or not assigned to you" });
      }
      if (courtCase.status === 'resolved' || courtCase.status === 'closed') {
        return res.status(400).json({ message: "Cannot grant access on a resolved case" });
      }

      // Deactivate any existing judge-granted access for this case first
      await supabaseAdmin
        .from('provider_restrictions')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('court_case_id', caseId)
        .eq('restriction_type', 'judge_granted_access');

      // Create new judge-granted access window
      const expiresAt = new Date(Date.now() + Number(durationMinutes) * 60 * 1000).toISOString();

      const { data: accessRecord, error: insertError } = await supabaseAdmin
        .from('provider_restrictions')
        .insert({
          provider_id: courtCase.provider_id,
          court_case_id: caseId,
          restriction_type: 'judge_granted_access',
          is_active: true,
          mercy_rule_enabled: false,
          mercy_window_minutes: Number(durationMinutes),
          restriction_metadata: {
            judge_id: judgeId,
            reason: reason.trim(),
            granted_at: new Date().toISOString(),
            expires_at: expiresAt,
            duration_minutes: Number(durationMinutes)
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Post a system message in the court room
      await supabaseAdmin.from('case_messages').insert({
        case_id: caseId,
        sender_type: 'system',
        message_type: 'system_update',
        content: `⚖️ Judge has granted the provider temporary portal access for ${durationMinutes} minutes to gather evidence.\n\nReason: ${reason.trim()}\n\nAccess expires at: ${new Date(expiresAt).toLocaleString()}`,
        visible_to: ['learner', 'provider', 'judge']
      });

      // Log judge activity
      await logJudgeActivity(judgeId, caseId, 'access_granted',
        `Judge granted provider ${durationMinutes}-min portal access for evidence gathering`,
        { reason: reason.trim(), expires_at: expiresAt, duration_minutes: durationMinutes }
      );

      // Send email to provider
      const { data: providerProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', courtCase.provider_id)
        .maybeSingle();

      if (providerProfile?.email) {
        await courtRoomEmailService.sendEmail({
          to: providerProfile.email,
          subject: `✅ Temporary Portal Access Granted — Case ${courtCase.case_number}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#0b7e84">Temporary Portal Access Granted</h2>
              <p>Dear ${providerProfile.full_name || 'Provider'},</p>
              <p>The presiding judge has granted you <strong>temporary access to your portal</strong> for <strong>${durationMinutes} minutes</strong> to gather evidence for your case.</p>
              <table style="border-collapse:collapse;width:100%;margin:16px 0">
                <tr><td style="padding:8px;color:#666">Case Number</td><td style="padding:8px;font-weight:bold">${courtCase.case_number}</td></tr>
                <tr><td style="padding:8px;color:#666">Access Duration</td><td style="padding:8px;font-weight:bold">${durationMinutes} minutes</td></tr>
                <tr><td style="padding:8px;color:#666">Expires At</td><td style="padding:8px;font-weight:bold">${new Date(expiresAt).toLocaleString()}</td></tr>
                <tr><td style="padding:8px;color:#666">Reason</td><td style="padding:8px">${reason.trim()}</td></tr>
              </table>
              <p style="color:#e65c00"><strong>Important:</strong> Your portal access will be automatically revoked when the timer expires. Please gather your evidence and upload it to the court room before the deadline.</p>
              <p>Log in to your portal now: <a href="${process.env.APP_URL}/login" style="color:#0b7e84">${process.env.APP_URL}/login</a></p>
              <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
              <p style="color:#999;font-size:12px">Coursevia Court Administration</p>
            </div>
          `
        });
      }

      res.json({
        success: true,
        message: `Portal access granted for ${durationMinutes} minutes`,
        access: {
          providerId: courtCase.provider_id,
          expiresAt,
          durationMinutes: Number(durationMinutes),
          reason: reason.trim()
        }
      });

    } catch (error) {
      console.error("[court/case/grant-access] error:", error);
      res.status(500).json({ message: "Failed to grant access" });
    }
  });

  // Check provider access restrictions — now also returns judge-granted access
  app.get("/api/court/provider/restrictions/:providerId", async (req, res) => {
    try {
      const { providerId } = req.params;

      const restrictions = await checkProviderRestrictions(providerId);
      const mercyAccess = await checkMercyWindowAccess(providerId);

      // Check for active judge-granted access
      const now = new Date().toISOString();
      const { data: judgeGranted } = await supabaseAdmin
        .from('provider_restrictions')
        .select('restriction_metadata')
        .eq('provider_id', providerId)
        .eq('restriction_type', 'judge_granted_access')
        .eq('is_active', true)
        .gt('restriction_metadata->>expires_at', now)
        .maybeSingle();

      const judgeGrantedActive = !!judgeGranted;
      const judgeGrantedExpiresAt = judgeGranted?.restriction_metadata?.expires_at || null;
      const judgeGrantedReason = judgeGranted?.restriction_metadata?.reason || null;

      res.json({
        success: true,
        isRestricted: restrictions.restricted,
        restrictions: restrictions.activeRestrictions,
        mercyWindow: {
          hasAccess: mercyAccess.hasAccess,
          activeBooking: mercyAccess.activeBooking,
          accessStart: mercyAccess.mercyStart,
          accessEnd: mercyAccess.mercyEnd
        },
        judgeGrantedAccess: {
          hasAccess: judgeGrantedActive,
          expiresAt: judgeGrantedExpiresAt,
          reason: judgeGrantedReason
        }
      });

    } catch (error) {
      console.error("[court/provider/restrictions] error:", error);
      res.status(500).json({ message: "Failed to check restrictions" });
    }
  });

  // Get all cases (for judge admin interface)
  app.get("/api/court/cases", async (req, res) => {
    try {
      const judgeId = req.headers['x-judge-id'];
      const { status, priority, limit = 50, offset = 0 } = req.query;

      if (!judgeId) {
        return res.status(401).json({ message: "Judge authentication required" });
      }

      let query = supabaseAdmin
        .from('court_cases')
        .select(`
          *,
          judges(full_name),
          case_participants(*),
          case_messages(id)
        `)
        .order('opened_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (priority && priority !== 'all') {
        query = query.eq('priority_level', priority);
      }

      const { data: cases, error } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        cases: cases || [],
        total: cases?.length || 0
      });

    } catch (error) {
      console.error("[court/cases] error:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

};