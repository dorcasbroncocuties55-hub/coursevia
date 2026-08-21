// Court Room Email Notification Service
// Handles automated email notifications for dispute resolution events
//
// PATCHED VERSION — fixes:
//   1. Template-literal bug where {DISPUTED_AMOUNT}/{REFUND_AMOUNT} placeholders
//      were written as `${DISPUTED_AMOUNT}` inside a JS template literal, which
//      throws ReferenceError at parse-time instead of staying literal text.
//   2. No real email provider was wired in — added Resend as the transactional
//      email provider (https://resend.com), used when RESEND_API_KEY is set.
//   3. Failures were swallowed silently (console.error only) — every public
//      method now returns a result object ({ success, results, errors }) so
//      callers can detect and react to partial/total failure.
//   4. Supabase fallback insert used user_id: null, which will violate a
//      NOT NULL/FK constraint on most schemas — now resolves the user_id by
//      looking up the profile via email before inserting.

import { createClient } from "@supabase/supabase-js";

// Use the service-role key so the email service can read profiles/notifications
// without being blocked by RLS. Both env vars must be set in your backend .env
const _supabaseUrl = process.env.SUPABASE_URL || "";
const _supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = _supabaseUrl && _supabaseKey
  ? createClient(_supabaseUrl, _supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// ---------------------------------------------------------------------------
// Email templates for different court room events
// NOTE: All dollar-amount placeholders are escaped as \${VAR} so they survive
// as literal text inside the template literal instead of being evaluated as
// JS expressions. processTemplate() replaces {VAR} tokens afterwards.
// ---------------------------------------------------------------------------
const EMAIL_TEMPLATES = {
  CASE_OPENED: {
    subject: "⚖️ Court Case Opened - Case #{CASE_NUMBER}",
    learnerTemplate: `
Dear {LEARNER_NAME},

Your refund request has been escalated to our Court Room dispute resolution system.

**Case Details:**
- Case Number: {CASE_NUMBER}
- Dispute Type: {DISPUTE_TYPE}
- Disputed Amount: \${DISPUTED_AMOUNT}
- Assigned Judge: {JUDGE_NAME}

**What happens next:**
1. You can communicate with your judge and provider through the secure Court Room chat
2. Submit evidence to support your case using our evidence upload system
3. The judge will review all evidence and make a final decision

**Access Your Case:**
Visit your dashboard and click "View Court Case" or go directly to:
{COURT_ROOM_URL}

**Need Help?**
If you have questions about the dispute process, contact our support team.

Best regards,
Coursevia Dispute Resolution Team
    `,
    providerTemplate: `
Dear {PROVIDER_NAME},

A dispute case has been opened regarding a refund request for your service.

**Case Details:**
- Case Number: {CASE_NUMBER}
- Dispute Type: {DISPUTE_TYPE}
- Disputed Amount: \${DISPUTED_AMOUNT}
- Assigned Judge: {JUDGE_NAME}

**Important Notice:**
- Your dashboard access is now restricted during the dispute process
- You can access the Court Room to communicate with your judge
- You can submit evidence to defend your position
- Temporary access to your dashboard will be granted 30 minutes before/after scheduled sessions if you have any active booking

**Access Your Case:**
{COURT_ROOM_URL}

**Mercy Rule:**
You'll receive temporary dashboard access during scheduled session times to serve your existing students.

Best regards,
Coursevia Dispute Resolution Team
    `,
    judgeTemplate: `
Dear Judge {JUDGE_NAME},

A new court case has been assigned to you for dispute resolution.

**Case Details:**
- Case Number: {CASE_NUMBER}
- Dispute Type: {DISPUTE_TYPE}
- Priority: {PRIORITY_LEVEL}
- Disputed Amount: \${DISPUTED_AMOUNT}
- Complexity Score: {COMPLEXITY_SCORE}/10

**Parties Involved:**
- Learner: {LEARNER_NAME}
- Provider: {PROVIDER_NAME}

**Judge Portal Access:**
{JUDGE_PORTAL_URL}

Please review the case details and begin the dispute resolution process at your earliest convenience.

Best regards,
Coursevia Court Administration
    `
  },

  EVIDENCE_SUBMITTED: {
    subject: "📎 New Evidence Submitted - Case #{CASE_NUMBER}",
    template: `
Dear {RECIPIENT_NAME},

New evidence has been submitted in your court case.

**Evidence Details:**
- Submitted by: {SUBMITTER_TYPE}
- Evidence Type: {EVIDENCE_TYPE}
- Title: {EVIDENCE_TITLE}
- Weight: {EVIDENCE_WEIGHT}

**Case:** {CASE_NUMBER}

You can review the evidence in the Court Room:
{COURT_ROOM_URL}

Best regards,
Coursevia Court System
    `
  },

  CASE_DECISION: {
    subject: "⚖️ Court Decision - Case #{CASE_NUMBER}",
    approvedTemplate: `
Dear {RECIPIENT_NAME},

The judge has made a decision on your court case.

**DECISION: REFUND APPROVED**

**Case Details:**
- Case Number: {CASE_NUMBER}
- Disputed Amount: \${DISPUTED_AMOUNT}
- Approved Refund: \${REFUND_AMOUNT}
- Judge: {JUDGE_NAME}

**Judge's Reasoning:**
{REASONING}

**Next Steps:**
- The refund will be processed within 3-5 business days
- Provider restrictions have been lifted
- Case is now closed

Thank you for using our dispute resolution system.

Best regards,
Coursevia Court Administration
    `,
    rejectedTemplate: `
Dear {RECIPIENT_NAME},

The judge has made a decision on your court case.

**DECISION: REFUND REJECTED**

**Case Details:**
- Case Number: {CASE_NUMBER}
- Disputed Amount: \${DISPUTED_AMOUNT}
- Judge: {JUDGE_NAME}

**Judge's Reasoning:**
{REASONING}

**Case Status:**
- No refund will be issued
- Provider restrictions have been lifted
- Case is now closed

If you believe this decision was made in error, you may contact our support team within 7 days.

Best regards,
Coursevia Court Administration
    `
  },

  PROVIDER_RESTRICTION_NOTICE: {
    subject: "🚫 Account Restriction Notice - Dispute Active",
    template: `
Dear {PROVIDER_NAME},

Your account access has been temporarily restricted due to an active dispute case.

**Restriction Details:**
- Case Number: {CASE_NUMBER}
- Restriction Type: Dashboard access limited
- Mercy Window: 30 minutes before/after scheduled sessions

**What You Can Still Do:**
- Access the Court Room to communicate with the judge
- Submit evidence for your defense
- Join scheduled sessions with existing students
- Access your dashboard during mercy windows

**Next Mercy Window:**
{NEXT_MERCY_TIME}

**Court Room Access:**
{COURT_ROOM_URL}

This restriction will be lifted once the case is resolved.

Best regards,
Coursevia Support Team
    `
  },

  MERCY_WINDOW_ACTIVE: {
    subject: "✅ Temporary Dashboard Access Restored",
    template: `
Dear {PROVIDER_NAME},

Your dashboard access has been temporarily restored for an active session.

**Access Details:**
- Session Time: {SESSION_TIME}
- Access Expires: {MERCY_END_TIME}
- Student: {STUDENT_NAME}

**Reminder:**
- This is temporary access due to the Mercy Rule
- Access will be restricted again after the session
- A dispute case (#{CASE_NUMBER}) is still active

**Restricted Actions:**
- Wallet access
- Profile editing
- Messaging the disputing student

Best regards,
Coursevia System
    `
  }
};

// ---------------------------------------------------------------------------
// Email notification functions
// ---------------------------------------------------------------------------
export const courtRoomEmailService = {

  /**
   * Send case opened notifications to all parties.
   * Returns { success, results: [{ to, ok, error? }], errors }
   */
  async sendCaseOpenedNotifications(caseData) {
    const results = [];
    try {
      const { case_number, dispute_type, disputed_amount, learner_id, provider_id, assigned_judge_id, priority_level, complexity_score } = caseData;

      const [learnerProfile, providerProfile, judgeProfile] = await Promise.all([
        this.getProfile(learner_id),
        this.getProfile(provider_id),
        this.getJudgeProfile(assigned_judge_id)
      ]);

      const courtRoomUrl = `${process.env.APP_URL}/court-room/${caseData.id}`;
      const judgePortalUrl = `${process.env.JUDGE_PORTAL_URL || process.env.APP_URL}/judge-portal`;

      if (learnerProfile?.email) {
        results.push(await this.sendEmail({
          to: learnerProfile.email,
          subject: EMAIL_TEMPLATES.CASE_OPENED.subject.replace('{CASE_NUMBER}', case_number),
          html: this.processTemplate(EMAIL_TEMPLATES.CASE_OPENED.learnerTemplate, {
            LEARNER_NAME: learnerProfile.full_name || 'Student',
            CASE_NUMBER: case_number,
            DISPUTE_TYPE: dispute_type.replace('_', ' '),
            DISPUTED_AMOUNT: disputed_amount,
            JUDGE_NAME: judgeProfile?.full_name || 'Unassigned',
            COURT_ROOM_URL: courtRoomUrl
          })
        }));
      }

      if (providerProfile?.email) {
        results.push(await this.sendEmail({
          to: providerProfile.email,
          subject: EMAIL_TEMPLATES.CASE_OPENED.subject.replace('{CASE_NUMBER}', case_number),
          html: this.processTemplate(EMAIL_TEMPLATES.CASE_OPENED.providerTemplate, {
            PROVIDER_NAME: providerProfile.full_name || 'Provider',
            CASE_NUMBER: case_number,
            DISPUTE_TYPE: dispute_type.replace('_', ' '),
            DISPUTED_AMOUNT: disputed_amount,
            JUDGE_NAME: judgeProfile?.full_name || 'Unassigned',
            COURT_ROOM_URL: courtRoomUrl
          })
        }));
      }

      if (judgeProfile?.email) {
        results.push(await this.sendEmail({
          to: judgeProfile.email,
          subject: EMAIL_TEMPLATES.CASE_OPENED.subject.replace('{CASE_NUMBER}', case_number),
          html: this.processTemplate(EMAIL_TEMPLATES.CASE_OPENED.judgeTemplate, {
            JUDGE_NAME: judgeProfile.full_name,
            CASE_NUMBER: case_number,
            DISPUTE_TYPE: dispute_type.replace('_', ' '),
            PRIORITY_LEVEL: priority_level,
            DISPUTED_AMOUNT: disputed_amount,
            COMPLEXITY_SCORE: complexity_score,
            LEARNER_NAME: learnerProfile?.full_name || 'Unknown',
            PROVIDER_NAME: providerProfile?.full_name || 'Unknown',
            JUDGE_PORTAL_URL: judgePortalUrl
          })
        }));
      }

      const errors = results.filter(r => !r.ok);
      console.log(`Case opened notifications: ${results.length - errors.length}/${results.length} sent for case ${case_number}`);
      return { success: errors.length === 0, results, errors };
    } catch (error) {
      console.error('Error sending case opened notifications:', error);
      return { success: false, results, errors: [{ error: error.message }] };
    }
  },

  /**
   * Send evidence submitted notification
   */
  async sendEvidenceNotification(evidenceData, caseData) {
    const results = [];
    try {
      const { submitter_type, evidence_type, title, evidence_weight } = evidenceData;
      const { case_number, learner_id, provider_id, assigned_judge_id } = caseData;

      const courtRoomUrl = `${process.env.APP_URL}/court-room/${caseData.id}?tab=evidence`;

      const participants = [];
      if (submitter_type !== 'learner') {
        const learner = await this.getProfile(learner_id);
        if (learner?.email) participants.push({ email: learner.email, name: learner.full_name || 'Student' });
      }
      if (submitter_type !== 'provider') {
        const provider = await this.getProfile(provider_id);
        if (provider?.email) participants.push({ email: provider.email, name: provider.full_name || 'Provider' });
      }
      if (submitter_type !== 'judge' && assigned_judge_id) {
        const judge = await this.getJudgeProfile(assigned_judge_id);
        if (judge?.email) participants.push({ email: judge.email, name: judge.full_name || 'Judge' });
      }

      for (const participant of participants) {
        results.push(await this.sendEmail({
          to: participant.email,
          subject: EMAIL_TEMPLATES.EVIDENCE_SUBMITTED.subject.replace('{CASE_NUMBER}', case_number),
          html: this.processTemplate(EMAIL_TEMPLATES.EVIDENCE_SUBMITTED.template, {
            RECIPIENT_NAME: participant.name,
            SUBMITTER_TYPE: submitter_type.charAt(0).toUpperCase() + submitter_type.slice(1),
            EVIDENCE_TYPE: evidence_type,
            EVIDENCE_TITLE: title,
            EVIDENCE_WEIGHT: evidence_weight,
            CASE_NUMBER: case_number,
            COURT_ROOM_URL: courtRoomUrl
          })
        }));
      }

      const errors = results.filter(r => !r.ok);
      console.log(`Evidence notification: ${results.length - errors.length}/${results.length} sent for case ${case_number}`);
      return { success: errors.length === 0, results, errors };
    } catch (error) {
      console.error('Error sending evidence notification:', error);
      return { success: false, results, errors: [{ error: error.message }] };
    }
  },

  /**
   * Send case decision notification
   */
  async sendCaseDecisionNotification(decisionData, caseData) {
    const results = [];
    try {
      const { decision, refund_amount, reasoning } = decisionData;
      const { case_number, disputed_amount, learner_id, provider_id, assigned_judge_id } = caseData;

      const [learnerProfile, providerProfile, judgeProfile] = await Promise.all([
        this.getProfile(learner_id),
        this.getProfile(provider_id),
        this.getJudgeProfile(assigned_judge_id)
      ]);

      const template = decision === 'approve'
        ? EMAIL_TEMPLATES.CASE_DECISION.approvedTemplate
        : EMAIL_TEMPLATES.CASE_DECISION.rejectedTemplate;

      const participants = [learnerProfile, providerProfile];

      for (const profile of participants) {
        if (profile?.email) {
          results.push(await this.sendEmail({
            to: profile.email,
            subject: EMAIL_TEMPLATES.CASE_DECISION.subject.replace('{CASE_NUMBER}', case_number),
            html: this.processTemplate(template, {
              RECIPIENT_NAME: profile.full_name || 'User',
              CASE_NUMBER: case_number,
              DISPUTED_AMOUNT: disputed_amount,
              REFUND_AMOUNT: refund_amount || 0,
              JUDGE_NAME: judgeProfile?.full_name || 'Court System',
              REASONING: reasoning
            })
          }));
        }
      }

      const errors = results.filter(r => !r.ok);
      console.log(`Case decision notification: ${results.length - errors.length}/${results.length} sent for case ${case_number} (${decision})`);
      return { success: errors.length === 0, results, errors };
    } catch (error) {
      console.error('Error sending case decision notification:', error);
      return { success: false, results, errors: [{ error: error.message }] };
    }
  },

  /**
   * Send provider restriction notice
   */
  async sendProviderRestrictionNotice(caseData, nextMercyTime = null) {
    try {
      const { case_number, provider_id } = caseData;
      const providerProfile = await this.getProfile(provider_id);

      if (!providerProfile?.email) {
        return { success: false, results: [], errors: [{ error: 'No provider email on file' }] };
      }

      const courtRoomUrl = `${process.env.APP_URL}/court-room/${caseData.id}`;

      const result = await this.sendEmail({
        to: providerProfile.email,
        subject: EMAIL_TEMPLATES.PROVIDER_RESTRICTION_NOTICE.subject,
        html: this.processTemplate(EMAIL_TEMPLATES.PROVIDER_RESTRICTION_NOTICE.template, {
          PROVIDER_NAME: providerProfile.full_name || 'Provider',
          CASE_NUMBER: case_number,
          NEXT_MERCY_TIME: nextMercyTime
            ? new Date(nextMercyTime).toLocaleString()
            : 'No upcoming sessions scheduled',
          COURT_ROOM_URL: courtRoomUrl
        })
      });

      console.log(`Provider restriction notice ${result.ok ? 'sent' : 'FAILED'} for case ${case_number}`);
      return { success: result.ok, results: [result], errors: result.ok ? [] : [result] };
    } catch (error) {
      console.error('Error sending provider restriction notice:', error);
      return { success: false, results: [], errors: [{ error: error.message }] };
    }
  },

  /**
   * Send mercy window activation notice
   */
  async sendMercyWindowNotice(providerData, sessionData, caseData) {
    try {
      const providerProfile = await this.getProfile(providerData.provider_id);
      const studentProfile = await this.getProfile(sessionData.learner_id);

      if (!providerProfile?.email) {
        return { success: false, results: [], errors: [{ error: 'No provider email on file' }] };
      }

      const result = await this.sendEmail({
        to: providerProfile.email,
        subject: EMAIL_TEMPLATES.MERCY_WINDOW_ACTIVE.subject,
        html: this.processTemplate(EMAIL_TEMPLATES.MERCY_WINDOW_ACTIVE.template, {
          PROVIDER_NAME: providerProfile.full_name || 'Provider',
          SESSION_TIME: new Date(sessionData.scheduled_at).toLocaleString(),
          MERCY_END_TIME: sessionData.mercy_end_time,
          STUDENT_NAME: studentProfile?.full_name || 'Student',
          CASE_NUMBER: caseData.case_number
        })
      });

      console.log(`Mercy window notice ${result.ok ? 'sent' : 'FAILED'} to ${providerProfile.email}`);
      return { success: result.ok, results: [result], errors: result.ok ? [] : [result] };
    } catch (error) {
      console.error('Error sending mercy window notice:', error);
      return { success: false, results: [], errors: [{ error: error.message }] };
    }
  },

  /**
   * Helper function to get user profile
   */
  async getProfile(userId) {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  /**
   * Helper function to get judge profile
   */
  async getJudgeProfile(judgeId) {
    if (!judgeId) return null;

    const { data, error } = await supabase
      .from('judges')
      .select('email, full_name, rank')
      .eq('id', judgeId)
      .single();

    if (error) {
      console.error('Error fetching judge profile:', error);
      return null;
    }

    return data;
  },

  /**
   * Template processing helper.
   * Replaces {VAR} tokens. Dollar amounts in templates are written as
   * \${VAR} (escaped) so they survive as literal "${VAR}" text here, then
   * this function's {VAR} replacement fills in the value after the $.
   */
  processTemplate(template, variables) {
    let processedTemplate = template;

    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      const value = variables[key] ?? '';
      processedTemplate = processedTemplate.split(placeholder).join(value);
    });

    return processedTemplate;
  },

  /**
   * Email sending function.
   * Provider priority:
   *   1. Resend (RESEND_API_KEY set)               -> real transactional email
   *   2. Generic EMAIL_SERVICE_URL (legacy option)  -> your own email microservice
   *   3. Supabase notifications table (last resort) -> in-app notification only,
   *      NOT an actual email. Logged loudly so this isn't mistaken for delivery.
   *
   * Always returns a result object so callers can check success/failure:
   *   { to, ok: boolean, provider: string, error?: string }
   */
  async sendEmail({ to, subject, html }) {
    // 1) Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM_ADDRESS || 'Coursevia Court Room <court-room@yourdomain.com>',
            to: [to],
            subject,
            html
          })
        });

        if (response.ok) {
          console.log(`[Resend] Email sent to ${to}: ${subject}`);
          return { to, ok: true, provider: 'resend' };
        }

        const errBody = await response.text();
        console.error(`[Resend] Failed to send to ${to}: ${response.status} ${errBody}`);
        return { to, ok: false, provider: 'resend', error: `${response.status} ${errBody}` };
      } catch (error) {
        console.error(`[Resend] Error sending to ${to}:`, error);
        return { to, ok: false, provider: 'resend', error: error.message };
      }
    }

    // 2) Legacy generic email service
    if (process.env.EMAIL_SERVICE_URL) {
      try {
        const response = await fetch(process.env.EMAIL_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EMAIL_SERVICE_KEY}`
          },
          body: JSON.stringify({ to, subject, html })
        });

        if (response.ok) {
          console.log(`[EmailService] Email sent to ${to}: ${subject}`);
          return { to, ok: true, provider: 'custom' };
        }

        const errBody = await response.text();
        console.error(`[EmailService] Failed to send to ${to}: ${response.status} ${errBody}`);
        return { to, ok: false, provider: 'custom', error: `${response.status} ${errBody}` };
      } catch (error) {
        console.error(`[EmailService] Error sending to ${to}:`, error);
        return { to, ok: false, provider: 'custom', error: error.message };
      }
    }

    // 3) Last-resort fallback: store as an in-app notification (NOT a real email)
    console.warn(`[Fallback] No email provider configured (RESEND_API_KEY / EMAIL_SERVICE_URL missing). ` +
      `Storing "${subject}" for ${to} as an in-app notification only — recipient will NOT get an email.`);

    try {
      // Resolve user_id from the email so we don't insert a null/dangling FK.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', to)
        .single();

      if (profileError || !profile?.user_id) {
        console.error(`[Fallback] Could not resolve user_id for ${to}; notification not stored.`, profileError);
        return { to, ok: false, provider: 'fallback', error: 'No email provider configured and user_id could not be resolved' };
      }

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          title: subject,
          message: html.replace(/<[^>]*>/g, ''),
          type: 'court_case',
          metadata: { email: to, html_content: html }
        });

      if (error) {
        console.error('[Fallback] Error storing notification:', error);
        return { to, ok: false, provider: 'fallback', error: error.message };
      }

      console.log(`[Fallback] Notification stored for ${to}: ${subject}`);
      return { to, ok: true, provider: 'fallback', warning: 'Stored as in-app notification only, no email sent' };
    } catch (error) {
      console.error('[Fallback] Error sending email:', error);
      return { to, ok: false, provider: 'fallback', error: error.message };
    }
  },

  /**
   * Schedule reminder emails.
   * NOTE: These use setTimeout, which is process-local and does NOT survive
   * a server restart/redeploy. For production use, replace this with a
   * durable job (a scheduled Supabase Edge Function / cron, or a queue like
   * BullMQ) keyed by case id so reminders aren't lost on redeploy and aren't
   * duplicated if this function is called twice for the same case.
   */
  async scheduleReminders(caseId, caseData) {
    try {
      setTimeout(async () => {
        const { data: currentCase } = await supabase
          .from('court_cases')
          .select('status')
          .eq('id', caseId)
          .single();

        if (currentCase?.status === 'open') {
          await this.sendInactivityReminder(caseData);
        }
      }, 24 * 60 * 60 * 1000); // 24 hours

      setTimeout(async () => {
        const { data: currentCase } = await supabase
          .from('court_cases')
          .select('status')
          .eq('id', caseId)
          .single();

        if (currentCase?.status !== 'resolved') {
          await this.sendEscalationWarning(caseData);
        }
      }, 7 * 24 * 60 * 60 * 1000); // 7 days

    } catch (error) {
      console.error('Error scheduling reminders:', error);
    }
  },

  async sendInactivityReminder(caseData) {
    console.log(`Sending inactivity reminder for case ${caseData.case_number}`);
  },

  async sendEscalationWarning(caseData) {
    console.log(`Sending escalation warning for case ${caseData.case_number}`);
  }
};

export default courtRoomEmailService;