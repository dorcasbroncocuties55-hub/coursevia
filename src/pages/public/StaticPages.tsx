import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const PageWrapper = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-3">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    <div className="mx-auto max-w-3xl px-6 py-14 space-y-10 text-muted-foreground leading-relaxed">
      {children}
    </div>
    <Footer />
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h2 className="text-xl font-bold text-foreground mb-3">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed">{children}</div>
  </div>
);

export const Terms = () => (
  <PageWrapper
    title="Terms of Service"
    subtitle="Last updated: April 14, 2026 — Please read these terms carefully before using Coursevia."
  >
    <Section title="1. Acceptance of Terms">
      <p>
        By accessing or using the Coursevia platform, website, mobile applications, or any associated services (collectively, the "Platform"), you agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and any additional guidelines or policies incorporated herein by reference. If you do not agree to these Terms, you must not access or use the Platform.
      </p>
      <p>
        These Terms constitute a legally binding agreement between you ("User," "you," or "your") and Coursevia Inc. ("Coursevia," "we," "us," or "our"). We reserve the right to update or modify these Terms at any time. Continued use of the Platform following any changes constitutes your acceptance of the revised Terms.
      </p>
    </Section>

    <Section title="2. Eligibility">
      <p>
        You must be at least 18 years of age to create an account and use the Platform. By registering, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into a binding agreement. If you are accessing the Platform on behalf of a company or organization, you represent that you have the authority to bind that entity to these Terms.
      </p>
      <p>
        Coursevia reserves the right to refuse service, terminate accounts, or cancel transactions at its sole discretion, including in cases where eligibility requirements are not met.
      </p>
    </Section>

    <Section title="3. Account Registration and Security">
      <p>
        To access certain features of the Platform, you must register for an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated at all times.
      </p>
      <p>
        You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify Coursevia immediately at support@coursevia.com if you suspect any unauthorized use of your account or any other security breach.
      </p>
      <p>
        Coursevia will not be liable for any loss or damage arising from your failure to comply with these security obligations. You may not share your account credentials with any third party or allow others to access your account.
      </p>
    </Section>

    <Section title="4. User Roles and Responsibilities">
      <p>
        The Platform supports multiple user roles, including Learners, Coaches, Therapists, and Creators (collectively, "Providers"). Each role carries specific rights and responsibilities as outlined below.
      </p>
      <p>
        <strong className="text-foreground">Learners</strong> may browse, purchase, and access content and services offered on the Platform. Learners agree to use purchased content solely for personal, non-commercial purposes and not to reproduce, distribute, or resell any content without explicit written permission from the content owner.
      </p>
      <p>
        <strong className="text-foreground">Providers</strong> (Coaches, Therapists, and Creators) must complete Coursevia's identity verification (KYC) process before offering services. Providers are responsible for the accuracy, legality, and quality of the services and content they offer. Providers agree not to misrepresent their qualifications, credentials, or experience.
      </p>
      <p>
        All users agree to treat others with respect and professionalism. Harassment, discrimination, hate speech, or any form of abusive behavior is strictly prohibited and may result in immediate account termination.
      </p>
    </Section>

    <Section title="5. Content Ownership and Licensing">
      <p>
        Creators and Providers retain full ownership of the content they upload to the Platform, including courses, videos, session materials, and any other intellectual property. By uploading content, you grant Coursevia a non-exclusive, worldwide, royalty-free license to host, display, distribute, and promote your content on the Platform for the purpose of providing our services.
      </p>
      <p>
        This license does not transfer ownership of your content to Coursevia. You may remove your content from the Platform at any time, subject to any existing learner access rights for purchased content.
      </p>
      <p>
        Coursevia's own platform content, branding, trademarks, logos, and technology are the exclusive property of Coursevia Inc. and may not be used, copied, or reproduced without prior written consent.
      </p>
    </Section>

    <Section title="6. Payments, Fees, and Escrow">
      <p>
        All transactions on the Platform are processed through our secure, PCI-DSS compliant payment infrastructure. By making a purchase, you authorize Coursevia to charge the applicable fees to your selected payment method.
      </p>
      <p>
        Coursevia operates an escrow model for session-based services. Funds paid by Learners are held securely until the service has been delivered and confirmed. Upon successful delivery, funds are released to the Provider minus Coursevia's platform fee, which is disclosed at the time of listing.
      </p>
      <p>
        Coursevia reserves the right to adjust its fee structure at any time. Providers will be notified of any changes to platform fees with reasonable advance notice.
      </p>
    </Section>

    <Section title="7. Refunds and Cancellations">
      <p>
        Refund eligibility varies by product type. Please refer to our Refund Policy for full details. In general: course purchases may be refunded within 7 days if less than 30% of the content has been accessed; session bookings may be cancelled and refunded if cancelled at least 24 hours before the scheduled time; subscription fees are non-refundable except where required by applicable law.
      </p>
      <p>
        Coursevia reserves the right to issue refunds at its discretion in cases of provider misconduct, technical failure, or other exceptional circumstances.
      </p>
    </Section>

    <Section title="8. Prohibited Conduct">
      <p>You agree not to engage in any of the following prohibited activities on the Platform:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Uploading, posting, or transmitting any content that is unlawful, harmful, defamatory, obscene, or otherwise objectionable.</li>
        <li>Impersonating any person or entity, or falsely representing your affiliation with any person or entity.</li>
        <li>Attempting to gain unauthorized access to any part of the Platform or its underlying systems.</li>
        <li>Using automated tools, bots, or scrapers to extract data from the Platform without prior written consent.</li>
        <li>Engaging in any activity that disrupts, damages, or impairs the Platform's functionality or availability.</li>
        <li>Circumventing or attempting to circumvent any security or access control measures.</li>
        <li>Using the Platform to facilitate any illegal activity, including fraud, money laundering, or the distribution of illegal content.</li>
        <li>Soliciting other users to conduct transactions outside of the Platform in order to avoid fees.</li>
      </ul>
    </Section>

    <Section title="9. Dispute Resolution">
      <p>
        In the event of a dispute between a Learner and a Provider, Coursevia offers a mediation process to help resolve the issue fairly. Both parties agree to engage in good faith with Coursevia's dispute resolution process before pursuing any external legal remedies.
      </p>
      <p>
        Any disputes arising out of or relating to these Terms that cannot be resolved through mediation shall be subject to binding arbitration in accordance with the rules of a recognized arbitration body, unless prohibited by applicable law. You waive any right to participate in a class action lawsuit or class-wide arbitration.
      </p>
    </Section>

    <Section title="10. Limitation of Liability">
      <p>
        To the maximum extent permitted by applicable law, Coursevia shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or other intangible losses, arising out of or in connection with your use of the Platform.
      </p>
      <p>
        Coursevia's total liability to you for any claims arising under these Terms shall not exceed the total amount paid by you to Coursevia in the twelve (12) months preceding the claim.
      </p>
    </Section>

    <Section title="11. Termination">
      <p>
        Coursevia reserves the right to suspend or terminate your account and access to the Platform at any time, with or without notice, for any reason, including but not limited to a violation of these Terms. Upon termination, your right to use the Platform ceases immediately.
      </p>
      <p>
        You may terminate your account at any time by contacting support@coursevia.com. Termination does not entitle you to a refund of any fees paid, except as provided in our Refund Policy.
      </p>
    </Section>

    <Section title="12. Governing Law">
      <p>
        These Terms shall be governed by and construed in accordance with applicable law. Any legal proceedings arising out of or relating to these Terms shall be brought in a court of competent jurisdiction.
      </p>
    </Section>

    <Section title="13. Contact Information">
      <p>
        If you have any questions about these Terms of Service, please contact us at:
      </p>
      <p>
        <strong className="text-foreground">Coursevia Inc.</strong><br />
        Email: legal@coursevia.com<br />
        Support: support@coursevia.com
      </p>
    </Section>
  </PageWrapper>
);

export const Privacy = () => (
  <PageWrapper
    title="Privacy Policy"
    subtitle="Last updated: April 14, 2026 — Your privacy matters to us. This policy explains how we handle your data."
  >
    <Section title="1. Introduction">
      <p>
        Coursevia Inc. ("Coursevia," "we," "us," or "our") is committed to protecting the privacy and security of your personal information. This Privacy Policy describes how we collect, use, disclose, and safeguard your data when you use the Coursevia platform, website, and associated services (collectively, the "Platform").
      </p>
      <p>
        By using the Platform, you consent to the data practices described in this Privacy Policy. If you do not agree with this policy, please do not use the Platform.
      </p>
    </Section>

    <Section title="2. Information We Collect">
      <p>We collect the following categories of personal information:</p>
      <p>
        <strong className="text-foreground">Account Information:</strong> When you register, we collect your name, email address, password (stored in hashed form), profile photo, and role (Learner, Coach, Therapist, or Creator).
      </p>
      <p>
        <strong className="text-foreground">Identity Verification Data:</strong> Providers are required to complete a KYC (Know Your Customer) process. This may include government-issued ID documents, selfies for liveness verification, and professional credentials. This data is processed by our verified KYC partner and is subject to their privacy practices.
      </p>
      <p>
        <strong className="text-foreground">Payment Information:</strong> We collect billing details necessary to process transactions. Raw card numbers are never stored on our servers — all payment data is tokenized and processed through our PCI-DSS compliant payment partners.
      </p>
      <p>
        <strong className="text-foreground">Usage Data:</strong> We automatically collect information about how you interact with the Platform, including pages visited, features used, session duration, device type, browser type, IP address, and referring URLs.
      </p>
      <p>
        <strong className="text-foreground">Communications:</strong> If you contact us or communicate with other users through the Platform's messaging system, we may retain those communications to provide support and ensure platform safety.
      </p>
      <p>
        <strong className="text-foreground">Content and Submissions:</strong> Any content you upload, including courses, videos, reviews, and profile information, is stored on our servers and associated with your account.
      </p>
    </Section>

    <Section title="3. How We Use Your Information">
      <p>We use the information we collect for the following purposes:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>To create and manage your account and provide access to Platform features.</li>
        <li>To process payments, manage escrow, and facilitate payouts to Providers.</li>
        <li>To verify the identity and credentials of Providers through our KYC process.</li>
        <li>To personalize your experience and provide relevant recommendations.</li>
        <li>To communicate with you about your account, transactions, and Platform updates.</li>
        <li>To send marketing communications where you have opted in to receive them.</li>
        <li>To monitor and enforce compliance with our Terms of Service and community guidelines.</li>
        <li>To detect, investigate, and prevent fraudulent transactions and other illegal activities.</li>
        <li>To analyze usage patterns and improve the Platform's features and performance.</li>
        <li>To comply with applicable legal obligations and respond to lawful requests from authorities.</li>
      </ul>
    </Section>

    <Section title="4. How We Share Your Information">
      <p>
        We do not sell your personal data to third parties. We may share your information in the following limited circumstances:
      </p>
      <p>
        <strong className="text-foreground">Service Providers:</strong> We share data with trusted third-party vendors who assist us in operating the Platform, including payment processors, cloud hosting providers, identity verification services, analytics platforms, and customer support tools. These vendors are contractually obligated to protect your data and use it only for the purposes we specify.
      </p>
      <p>
        <strong className="text-foreground">Between Users:</strong> Certain profile information (such as your name, photo, bio, and reviews) is visible to other users as part of the Platform's marketplace functionality. Session participants can see each other's names and profile details.
      </p>
      <p>
        <strong className="text-foreground">Legal Requirements:</strong> We may disclose your information if required to do so by law, court order, or governmental authority, or if we believe in good faith that such disclosure is necessary to protect the rights, property, or safety of Coursevia, our users, or the public.
      </p>
      <p>
        <strong className="text-foreground">Business Transfers:</strong> In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you via email or prominent notice on the Platform before your data is transferred and becomes subject to a different privacy policy.
      </p>
    </Section>

    <Section title="5. Data Retention">
      <p>
        We retain your personal data for as long as your account is active or as needed to provide you with our services. If you close your account, we will delete or anonymize your personal data within 90 days, except where we are required to retain it for legal, regulatory, or legitimate business purposes (such as resolving disputes or complying with tax obligations).
      </p>
      <p>
        Transaction records and financial data may be retained for up to 7 years in accordance with applicable accounting and tax regulations.
      </p>
    </Section>

    <Section title="6. Cookies and Tracking Technologies">
      <p>
        We use cookies, web beacons, and similar tracking technologies to enhance your experience on the Platform, analyze usage patterns, and deliver relevant content and advertising. You can control cookie preferences through your browser settings, though disabling certain cookies may affect Platform functionality.
      </p>
      <p>
        We use both session cookies (which expire when you close your browser) and persistent cookies (which remain on your device for a set period). We also use third-party analytics tools such as Google Analytics to understand how users interact with the Platform.
      </p>
    </Section>

    <Section title="7. Your Rights and Choices">
      <p>Depending on your location, you may have the following rights regarding your personal data:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you.</li>
        <li><strong className="text-foreground">Correction:</strong> Request that we correct inaccurate or incomplete data.</li>
        <li><strong className="text-foreground">Deletion:</strong> Request that we delete your personal data, subject to legal retention requirements.</li>
        <li><strong className="text-foreground">Portability:</strong> Request that we provide your data in a structured, machine-readable format.</li>
        <li><strong className="text-foreground">Objection:</strong> Object to the processing of your data for direct marketing purposes.</li>
        <li><strong className="text-foreground">Restriction:</strong> Request that we restrict the processing of your data in certain circumstances.</li>
        <li><strong className="text-foreground">Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
      </ul>
      <p>
        To exercise any of these rights, please contact us at privacy@coursevia.com. We will respond to your request within 30 days.
      </p>
    </Section>

    <Section title="8. Data Security">
      <p>
        We implement industry-standard technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include TLS/SSL encryption for data in transit, AES-256 encryption for sensitive data at rest, multi-factor authentication for administrative access, regular security audits and penetration testing, and strict access controls limiting data access to authorized personnel only.
      </p>
      <p>
        While we take every reasonable precaution to protect your data, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we are committed to promptly notifying you in the event of a data breach that affects your personal information.
      </p>
    </Section>

    <Section title="9. International Data Transfers">
      <p>
        Coursevia operates globally, and your data may be transferred to and processed in countries other than your country of residence. We ensure that any international transfers of personal data are conducted in compliance with applicable data protection laws, including through the use of Standard Contractual Clauses or other approved transfer mechanisms where required.
      </p>
    </Section>

    <Section title="10. Children's Privacy">
      <p>
        The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from children. If we become aware that we have inadvertently collected data from a minor, we will take immediate steps to delete that information. If you believe we have collected data from a child, please contact us at privacy@coursevia.com.
      </p>
    </Section>

    <Section title="11. Changes to This Policy">
      <p>
        We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by posting the updated policy on the Platform and updating the "Last updated" date at the top of this page. We encourage you to review this policy periodically.
      </p>
    </Section>

    <Section title="12. Contact Us">
      <p>
        If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Data Protection team:
      </p>
      <p>
        <strong className="text-foreground">Coursevia Inc. — Privacy Team</strong><br />
        Email: privacy@coursevia.com<br />
        Support: support@coursevia.com
      </p>
    </Section>
  </PageWrapper>
);

export const RefundPolicy = () => (
  <PageWrapper
    title="Refund Policy"
    subtitle="Last updated: April 14, 2026 — We want every experience on Coursevia to be exceptional."
  >
    <Section title="1. Overview">
      <p>
        Coursevia is committed to ensuring that every learner and client has a positive experience on our platform. We understand that circumstances change, and we have designed our refund policy to be fair, transparent, and easy to understand. This policy applies to all purchases made through the Coursevia platform, including courses, premium videos, coaching sessions, therapy sessions, and subscriptions.
      </p>
    </Section>

    <Section title="2. Course Purchases">
      <p>
        You may request a full refund for a course purchase within 7 calendar days of the purchase date, provided that you have accessed less than 30% of the course content. Refund requests that meet these criteria will be processed within 5–10 business days to your original payment method.
      </p>
      <p>
        Refunds will not be granted if more than 30% of the course content has been accessed, if the 7-day window has passed, or if the course was purchased as part of a bundle or promotional offer with specific non-refund terms.
      </p>
    </Section>

    <Section title="3. Session Bookings (Coaching & Therapy)">
      <p>
        Session bookings may be cancelled and fully refunded if the cancellation is made at least 24 hours before the scheduled session start time. Cancellations made less than 24 hours before the session are not eligible for a refund, though a credit may be issued at Coursevia's discretion.
      </p>
      <p>
        If a Provider cancels a session, you will receive a full refund automatically within 3–5 business days. If a Provider fails to attend a scheduled session without prior notice, you are entitled to a full refund and may also be eligible for a service credit.
      </p>
    </Section>

    <Section title="4. Premium Video Purchases">
      <p>
        Individual video purchases are non-refundable once the video has been accessed or streamed. If you experience a technical issue that prevents you from accessing purchased video content, please contact our support team within 48 hours and we will investigate and resolve the issue or issue a refund as appropriate.
      </p>
    </Section>

    <Section title="5. Subscriptions">
      <p>
        Subscription fees are billed in advance on a monthly or annual basis and are generally non-refundable. If you cancel your subscription, you will retain access to subscription benefits until the end of your current billing period. No partial refunds are issued for unused subscription time, except where required by applicable consumer protection law.
      </p>
      <p>
        If you believe you were charged in error, please contact support@coursevia.com within 14 days of the charge and we will investigate promptly.
      </p>
    </Section>

    <Section title="6. How to Request a Refund">
      <p>
        To request a refund, please contact our support team at support@coursevia.com with the following information: your account email address, the order or transaction ID, the reason for your refund request, and any supporting documentation if applicable.
      </p>
      <p>
        We aim to respond to all refund requests within 2 business days. Approved refunds are processed within 5–10 business days, depending on your payment method and financial institution.
      </p>
    </Section>

    <Section title="7. Disputes and Escalations">
      <p>
        If you are not satisfied with the outcome of your refund request, you may escalate the matter to our Trust & Safety team at disputes@coursevia.com. We are committed to resolving all disputes fairly and in a timely manner.
      </p>
    </Section>
  </PageWrapper>
);

export const Blog = () => (
  <PageWrapper title="Blog" subtitle="Insights on learning, growth, and the future of education.">
    <Section title="Coming Soon">
      <p>
        Coursevia publishes practical insights on learning strategy, provider growth, digital education, booking workflows, and premium content operations. Our editorial team is preparing a series of in-depth articles, case studies, and expert interviews for release soon.
      </p>
      <p>
        Topics will include how top coaches build their client base, how creators monetize their expertise, mental health trends in digital therapy, and the future of online learning. Subscribe to our newsletter to be notified when new content is published.
      </p>
    </Section>
  </PageWrapper>
);

export const Contact = () => (
  <PageWrapper title="Contact Us" subtitle="We're here to help. Reach out and we'll get back to you quickly.">
    <Section title="Get in Touch">
      <p>
        Whether you have a question about your account, need help with a payment, want to report an issue, or are interested in partnering with Coursevia — our team is ready to assist.
      </p>
    </Section>
    <Section title="Support">
      <p>
        For general support, account issues, and billing inquiries:<br />
        <strong className="text-foreground">Email:</strong> support@coursevia.com<br />
        We typically respond within 24 hours on business days.
      </p>
    </Section>
    <Section title="Legal & Privacy">
      <p>
        For legal inquiries, data requests, or privacy concerns:<br />
        <strong className="text-foreground">Email:</strong> legal@coursevia.com / privacy@coursevia.com
      </p>
    </Section>
    <Section title="Provider & Partnership Inquiries">
      <p>
        Interested in becoming a featured provider or exploring a partnership with Coursevia?<br />
        <strong className="text-foreground">Email:</strong> partners@coursevia.com
      </p>
    </Section>
  </PageWrapper>
);

export const HelpCenter = () => (
  <PageWrapper title="Help Center" subtitle="Find answers to common questions and get the support you need.">
    <Section title="Getting Started">
      <p>
        New to Coursevia? Start by creating a free account at coursevia.com/signup. Once registered, you can browse courses, videos, coaches, and therapists. Complete your profile to get personalized recommendations.
      </p>
    </Section>
    <Section title="Account & Verification">
      <p>
        To access all platform features, verify your email address after registration. Providers (coaches, therapists, creators) must also complete our KYC identity verification process. This typically takes 1–2 business days.
      </p>
    </Section>
    <Section title="Payments & Billing">
      <p>
        We accept major credit and debit cards, as well as select local payment methods. All transactions are secured with industry-standard encryption. For billing questions or to dispute a charge, contact support@coursevia.com.
      </p>
    </Section>
    <Section title="Courses & Content Access">
      <p>
        Purchased courses are accessible from your learner dashboard indefinitely. If you experience issues accessing content, try clearing your browser cache or contact our support team.
      </p>
    </Section>
    <Section title="Booking & Scheduling">
      <p>
        To book a session, visit a provider's profile and select an available time slot. You'll receive a confirmation email with session details and a link to join. Sessions can be cancelled up to 24 hours in advance for a full refund.
      </p>
    </Section>
    <Section title="Withdrawals & Payouts">
      <p>
        Providers can request withdrawals from their wallet dashboard. Payouts are processed within 3–5 business days to your registered bank account or digital wallet. Minimum withdrawal amounts and supported methods vary by region.
      </p>
    </Section>
    <Section title="Still Need Help?">
      <p>
        If you can't find the answer you're looking for, our support team is available at support@coursevia.com. We're here Monday through Friday and aim to respond within 24 hours.
      </p>
    </Section>
  </PageWrapper>
);
