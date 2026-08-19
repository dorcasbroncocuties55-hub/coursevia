// Court Room Email Notification Service
// Handles automated email notifications for dispute resolution events

import { supabase } from "../src/integrations/supabase/client.js";

// Email templates for different court room events
const EMAIL_TEMPLATES = {
  CASE_OPENED: {
    subject: "⚖️ Court Case Opened - Case #{CASE_NUMBER}",
    learnerTemplate: `
Dear {LEARNER_NAME},

Your refund request has been escalated to our Court Room dispute resolution system. 

**Case Details:**
- Case Number: {CASE_NUMBER}
- Dispute Type: {DISPUTE_TYPE}
- Disputed Amount: ${DISPUTED_AMOUNT}
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
- Disputed Amount: ${DISPUTED_AMOUNT}
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
- Disputed Amount: ${DISPUTED_AMOUNT}
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
  }
};
CASE_DECISION: {
  subject: "⚖️ Court Decision - Case #{CASE_NUMBER}",
    approvedTemplate: `
Dear {RECIPIENT_NAME},

The judge has made a decision on your court case.

**DECISION: REFUND APPROVED**

**Case Details:**
- Case Number: {CASE_NUMBER}
- Disputed Amount: ${DISPUTED_AMOUNT}
- Approved Refund: ${REFUND_AMOUNT}
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
- Disputed Amount: ${DISPUTED_AMOUNT}
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
// Email notification functions
export const courtRoomEmailService = {

  /**
   * Send case opened notifications to all parties
   */
  async sendCaseOpenedNotifications(caseData) {
    try {
      const { case_number, dispute_type, disputed_amount, learner_id, provider_id, assigned_judge_id, priority_level, complexity_score } = caseData;

      // Get participant details
      const [learnerProfile, providerProfile, judgeProfile] = await Promise.all([
        this.getProfile(learner_id),
        this.getProfile(provider_id),
        this.getJudgeProfile(assigned_judge_id)
      ]);

      const courtRoomUrl = `${process.env.APP_URL}/court-room/${caseData.id}`;
      const judgePortalUrl = `${process.env.JUDGE_PORTAL_URL || process.env.APP_URL}/judge-portal`;

      // Send to learner
      if (learnerProfile?.email) {
        await this.sendEmail({
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
        });
      }

      // Send to provider
      if (providerProfile?.email) {
        await this.sendEmail({
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
        });
      }

      // Send to judge
      if (judgeProfile?.email) {
        await this.sendEmail({
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
        });
      }

      console.log(`Case opened notifications sent for case ${case_number}`);
    } catch (error) {
      console.error('Error sending case opened notifications:', error);
    }
  },

  /**
   * Send evidence submitted notification
   */
  async sendEvidenceNotification(evidenceData, caseData) {
    try {
      const { submitter_type, evidence_type, title, evidence_weight } = evidenceData;
      const { case_number, learner_id, provider_id, assigned_judge_id } = caseData;

      const courtRoomUrl = `${process.env.APP_URL}/court-room/${caseData.id}?tab=evidence`;

      // Get all participant emails except submitter
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

      // Send notifications
      for (const participant of participants) {
        await this.sendEmail({
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
        });
      }

      console.log(`Evidence notification sent for case ${case_number}`);
    } catch (error) {
      console.error('Error sending evidence notification:', error);
    }
  }
};
  /**
   * Send case decision notification
   */
  async sendCaseDecisionNotification(decisionData, caseData) {
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

    const participants = [
      { profile: learnerProfile, type: 'learner' },
      { profile: providerProfile, type: 'provider' }
    ];

    // Send to learner and provider
    for (const { profile } of participants) {
      if (profile?.email) {
        await this.sendEmail({
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
        });
      }
    }

    console.log(`Case decision notification sent for case ${case_number}: ${decision}`);
  } catch (error) {
    console.error('Error sending case decision notification:', error);
  }
},

  /**
   * Send provider restriction notice
   */
  async sendProviderRestrictionNotice(caseData, nextMercyTime = null) {
  try {
    const { case_number, provider_id } = caseData;
    const providerProfile = await this.getProfile(provider_id);

    if (!providerProfile?.email) return;

    const courtRoomUrl = `${process.env.APP_URL}/court-room/${caseData.id}`;

    await this.sendEmail({
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

    console.log(`Provider restriction notice sent for case ${case_number}`);
  } catch (error) {
    console.error('Error sending provider restriction notice:', error);
  }
},

  /**
   * Send mercy window activation notice
   */
  async sendMercyWindowNotice(providerData, sessionData, caseData) {
  try {
    const providerProfile = await this.getProfile(providerData.provider_id);
    const studentProfile = await this.getProfile(sessionData.learner_id);

    if (!providerProfile?.email) return;

    await this.sendEmail({
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

    console.log(`Mercy window notice sent to ${providerProfile.email}`);
  } catch (error) {
    console.error('Error sending mercy window notice:', error);
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
}
};
/**
 * Template processing helper
 */
processTemplate(template, variables) {
  let processedTemplate = template;

  Object.keys(variables).forEach(key => {
    const placeholder = `{${key}}`;
    const value = variables[key] || '';
    processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), value);
  });

  return processedTemplate;
},

  /**
   * Email sending function (integrates with existing email system)
   */
  async sendEmail({ to, subject, html }) {
  try {
    // This would integrate with your existing email service
    // For now, we'll use the Supabase notifications table as a fallback

    // Try to send via external email service first
    if (process.env.EMAIL_SERVICE_URL) {
      const response = await fetch(process.env.EMAIL_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EMAIL_SERVICE_KEY}`
        },
        body: JSON.stringify({
          to,
          subject,
          html
        })
      });

      if (response.ok) {
        console.log(`Email sent to ${to}: ${subject}`);
        return;
      }
    }

    // Fallback: Store in notifications table
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: null, // Will be resolved by email
        title: subject,
        message: html.replace(/<[^>]*>/g, ''), // Strip HTML for message
        type: 'court_case',
        metadata: { email: to, html_content: html }
      });

    if (error) {
      console.error('Error storing notification:', error);
    } else {
      console.log(`Notification stored for ${to}: ${subject}`);
    }

  } catch (error) {
    console.error('Error sending email:', error);
  }
},

  /**
   * Schedule reminder emails
   */
  async scheduleReminders(caseId, caseData) {
  try {
    // Schedule 24-hour reminder for inactive cases
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

    // Schedule 7-day escalation warning
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

  /**
   * Send inactivity reminder
   */
  async sendInactivityReminder(caseData) {
  // Implementation for inactivity reminders
  console.log(`Sending inactivity reminder for case ${caseData.case_number}`);
},

  /**
   * Send escalation warning
   */
  async sendEscalationWarning(caseData) {
  // Implementation for escalation warnings
  console.log(`Sending escalation warning for case ${caseData.case_number}`);
}
};

export default courtRoomEmailService;