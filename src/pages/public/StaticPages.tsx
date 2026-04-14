import PolicyLayout, { PolicyCard } from "@/components/shared/PolicyLayout";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const lastUpdated = `Last updated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;

// ─── TERMS OF SERVICE ────────────────────────────────────────────────────────

const termsSections = [
  { id: "intro", title: "Introduction" },
  { id: "eligibility", title: "Eligibility" },
  { id: "accounts", title: "User Accounts" },
  { id: "services", title: "Platform Services" },
  { id: "payments", title: "Payments & Transactions" },
  { id: "creators", title: "Creator Responsibilities" },
  { id: "prohibited", title: "Prohibited Activities" },
  { id: "ip", title: "Intellectual Property" },
  { id: "termination", title: "Termination" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "changes", title: "Changes to Terms" },
  { id: "contact", title: "Contact" },
];

export const Terms = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <PolicyLayout
      title="Terms of Service"
      subtitle={lastUpdated}
      description="These Terms govern your use of Coursevia — a marketplace for video-based learning, coaching, and digital services. By accessing or using the platform, you agree to these terms."
      badge="Secure • Transparent • User-first"
      sections={termsSections}
      ctaTitle="Ready to start learning or selling?"
      ctaDesc="Join thousands of creators and learners already growing on Coursevia."
      ctaPrimary={{ label: "Explore Courses", href: "/courses" }}
      ctaSecondary={{ label: "Become a Creator", href: "/signup" }}
    >
      <PolicyCard id="intro" title="Introduction">
        <p>Welcome to Coursevia. Coursevia is a platform that enables creators, coaches, and professionals to offer video-based courses and services to users worldwide.</p>
        <p>By accessing or using our platform, you agree to comply with and be bound by these Terms of Service. If you do not agree, you may not use Coursevia.</p>
      </PolicyCard>

      <PolicyCard id="eligibility" title="Eligibility">
        <p>To use Coursevia, you must:</p>
        <ul className="space-y-1.5 mt-1">
          {["Be at least 18 years old", "Provide accurate registration information", "Use the platform in compliance with all applicable laws"].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span><span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">We reserve the right to suspend or terminate accounts that violate these conditions.</p>
      </PolicyCard>

      <PolicyCard id="accounts" title="User Accounts">
        <p>You are responsible for maintaining the confidentiality of your account credentials. You agree:</p>
        <ul className="space-y-1.5 mt-1">
          {["Not to share your login details with anyone", "To notify us immediately of any unauthorized access", "That you are fully responsible for all activities under your account"].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span><span>{item}</span>
            </li>
          ))}
        </ul>
      </PolicyCard>

      <PolicyCard id="services" title="Platform Services">
        <p>Coursevia provides:</p>
        <ul className="space-y-1.5 mt-1">
          {["Video-based course hosting", "Creator onboarding and monetization tools", "Customer support systems", "Marketplace features for discovering content"].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span><span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">We do not directly provide the content — creators are responsible for what they upload.</p>
      </PolicyCard>

      <PolicyCard id="payments" title="Payments & Transactions">
        <p>All payments on Coursevia are processed through secure third-party providers. By making a purchase, you agree:</p>
        <ul className="space-y-1.5 mt-1">
          {["Prices are set by creators", "Payments are non-refundable unless stated otherwise", "Coursevia may charge platform or service fees"].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span><span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">We are not responsible for payment processing errors caused by third-party providers.</p>
      </PolicyCard>

      <PolicyCard id="creators" title="Creator Responsibilities">
        <p>If you upload or sell content on Coursevia, you agree:</p>
        <ul className="space-y-1.5 mt-1">
          {["You own or have rights to all content you upload", "Your content does not violate any laws or copyrights", "You provide accurate descriptions of your services and products"].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span><span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">We reserve the right to remove content that violates these terms without prior notice.</p>
      </PolicyCard>

      <PolicyCard id="prohibited" title="Prohibited Activities">
        <p>You agree not to:</p>
        <ul className="space-y-1.5 mt-1">
          {[
            "Use the platform for illegal activities of any kind",
            "Upload harmful, abusive, or misleading content",
            "Attempt to hack, disrupt, or exploit the platform",
            "Copy or redistribute content without permission",
            "Impersonate any person or entity on the platform",
            "Solicit users to transact outside of Coursevia to avoid fees",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span><span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">Violations may result in account suspension or permanent ban.</p>
      </PolicyCard>

      <PolicyCard id="ip" title="Intellectual Property">
        <p>All platform design, branding, and system functionality belong to Coursevia Inc.</p>
        <p className="mt-2">Users retain ownership of their uploaded content but grant Coursevia a non-exclusive, worldwide, royalty-free license to display and distribute it within the platform for the purpose of providing our services.</p>
        <p className="mt-2">This license does not transfer ownership of your content to Coursevia.</p>
      </PolicyCard>

      <PolicyCard id="termination" title="Termination">
        <p>We may suspend or terminate your account at any time if:</p>
        <ul className="space-y-1.5 mt-1">
          {["You violate these Terms of Service", "Your activity poses a risk to the platform or other users"].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span><span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">You may also stop using the platform at any time by contacting support@coursevia.com.</p>
      </PolicyCard>

      <PolicyCard id="liability" title="Limitation of Liability">
        <p>Coursevia is provided "as is" without warranties of any kind. We are not liable for:</p>
        <ul className="space-y-1.5 mt-1">
          {["Loss of revenue or data", "Disputes between users and creators", "Content uploaded by third parties", "Interruptions or errors in platform availability"].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span><span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">Use of the platform is at your own risk. To the maximum extent permitted by law, Coursevia's total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
      </PolicyCard>

      <PolicyCard id="changes" title="Changes to Terms">
        <p>We may update these Terms from time to time to reflect changes in our practices, technology, or legal requirements.</p>
        <p className="mt-2">You will be notified of significant changes via email or a prominent notice on the platform. Continued use of Coursevia after changes are posted means you accept the updated terms.</p>
      </PolicyCard>

      <PolicyCard id="contact" title="Contact">
        <p>If you have any questions about these Terms, you can contact us at:</p>
        <div className="mt-2 p-3 rounded-xl bg-muted/50 space-y-1">
          <p><strong className="text-foreground">Email:</strong> support@coursevia.com</p>
          <p><strong className="text-foreground">Platform:</strong> Coursevia Support Dashboard</p>
        </div>
      </PolicyCard>
    </PolicyLayout>
    <Footer />
  </div>
);

// ─── PRIVACY POLICY ──────────────────────────────────────────────────────────

const privacySections = [
  { id: "intro", title: "Introduction" },
  { id: "collect", title: "Information We Collect" },
  { id: "use", title: "How We Use Your Info" },
  { id: "third-party", title: "Payments & Third Parties" },
  { id: "sharing", title: "Data Sharing" },
  { id: "security", title: "Data Security" },
  { id: "cookies", title: "Cookies & Tracking" },
  { id: "rights", title: "Your Rights" },
  { id: "retention", title: "Data Retention" },
  { id: "children", title: "Children's Privacy" },
  { id: "policy-changes", title: "Changes to Policy" },
  { id: "contact-privacy", title: "Contact Us" },
];

export const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <PolicyLayout
      title="Privacy Policy"
      subtitle={lastUpdated}
      description="Coursevia is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information when you use our platform."
      badge="Secure • Transparent • GDPR-Ready"
      sections={privacySections}
      ctaTitle="Your Privacy, Our Priority"
      ctaDesc="We are committed to keeping your data secure while providing a seamless and powerful learning experience."
      ctaPrimary={{ label: "Explore Courses", href: "/courses" }}
      ctaSecondary={{ label: "Contact Support", href: "/contact" }}
    >
      <PolicyCard id="intro" title="Introduction">
        <p>Coursevia ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you access or use our platform.</p>
        <p className="mt-2">By using Coursevia, you agree to the practices described in this policy. If you do not agree, please do not use the platform.</p>
      </PolicyCard>

      <PolicyCard id="collect" title="Information We Collect">
        <p>We may collect the following types of information:</p>
        <div className="space-y-3 mt-2">
          <div>
            <p className="font-semibold text-foreground text-xs mb-1">1. Personal Information</p>
            <ul className="space-y-1">{["Full name", "Email address", "Account credentials and profile details"].map((i) => <li key={i} className="flex items-start gap-2"><span className="text-primary">•</span><span>{i}</span></li>)}</ul>
          </div>
          <div>
            <p className="font-semibold text-foreground text-xs mb-1">2. Usage Data</p>
            <ul className="space-y-1">{["Pages visited and features used", "Actions taken on the platform", "Device type, browser, and IP address"].map((i) => <li key={i} className="flex items-start gap-2"><span className="text-primary">•</span><span>{i}</span></li>)}</ul>
          </div>
          <div>
            <p className="font-semibold text-foreground text-xs mb-1">3. Transaction Data</p>
            <ul className="space-y-1">{["Payment activity (processed via third-party providers)", "Purchase history and subscription status"].map((i) => <li key={i} className="flex items-start gap-2"><span className="text-primary">•</span><span>{i}</span></li>)}</ul>
          </div>
        </div>
      </PolicyCard>

      <PolicyCard id="use" title="How We Use Your Information">
        <p>We use your information to:</p>
        <ul className="space-y-1.5 mt-1">
          {["Provide and continuously improve our platform", "Process transactions and manage your account", "Communicate with you about updates and support", "Personalize your experience and recommendations", "Ensure platform security and prevent fraud", "Comply with applicable legal obligations"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
      </PolicyCard>

      <PolicyCard id="third-party" title="Payments & Third Parties">
        <p>Payments on Coursevia are processed through secure third-party providers (e.g., Stripe, Paystack). We do not store your full payment details — all card data is tokenized.</p>
        <p className="mt-2">Third-party services we use may include:</p>
        <ul className="space-y-1.5 mt-1">
          {["Payment processors", "Analytics tools", "Email delivery systems", "Identity verification (KYC) providers"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">These providers have their own privacy policies and are contractually bound to protect your data.</p>
      </PolicyCard>

      <PolicyCard id="sharing" title="Data Sharing">
        <p>We do not sell your personal data. We may share information only when necessary:</p>
        <ul className="space-y-1.5 mt-1">
          {["To operate and improve the platform", "To comply with legal obligations or court orders", "To protect users and platform integrity from fraud or abuse"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
      </PolicyCard>

      <PolicyCard id="security" title="Data Security">
        <p>We implement appropriate security measures to protect your data, including:</p>
        <ul className="space-y-1.5 mt-1">
          {["TLS/SSL encryption for all data in transit", "AES-256 encryption for sensitive data at rest", "Secure, access-controlled servers", "Regular security audits and penetration testing"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">However, no system is completely secure. We cannot guarantee absolute protection, but we will notify you promptly in the event of a data breach.</p>
      </PolicyCard>

      <PolicyCard id="cookies" title="Cookies & Tracking">
        <p>We use cookies and similar technologies to:</p>
        <ul className="space-y-1.5 mt-1">
          {["Improve user experience and remember preferences", "Analyze platform usage and performance", "Deliver relevant content and features"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">You can control cookie settings through your browser. Disabling certain cookies may affect platform functionality.</p>
      </PolicyCard>

      <PolicyCard id="rights" title="Your Rights">
        <p>You have the right to:</p>
        <ul className="space-y-1.5 mt-1">
          {["Access the personal data we hold about you", "Request corrections to inaccurate data", "Request deletion of your account and data", "Opt out of marketing communications", "Request data portability in a machine-readable format"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">To exercise any of these rights, contact us at privacy@coursevia.com. We will respond within 30 days.</p>
      </PolicyCard>

      <PolicyCard id="retention" title="Data Retention">
        <p>We retain your information only as long as necessary to:</p>
        <ul className="space-y-1.5 mt-1">
          {["Provide our services to you", "Comply with legal and regulatory obligations", "Resolve disputes and enforce agreements"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">Upon account deletion, personal data is removed within 90 days. Financial records may be retained for up to 7 years for legal compliance.</p>
      </PolicyCard>

      <PolicyCard id="children" title="Children's Privacy">
        <p>Coursevia is not intended for individuals under the age of 18. We do not knowingly collect personal data from children.</p>
        <p className="mt-2">If we become aware that we have inadvertently collected data from a minor, we will take immediate steps to delete that information. Please contact privacy@coursevia.com if you believe this has occurred.</p>
      </PolicyCard>

      <PolicyCard id="policy-changes" title="Changes to This Policy">
        <p>We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.</p>
        <p className="mt-2">Significant changes will be communicated via email or a prominent notice on the platform. Continued use of Coursevia after changes are posted means you accept the updated policy.</p>
      </PolicyCard>

      <PolicyCard id="contact-privacy" title="Contact Us">
        <p>If you have questions about this Privacy Policy or our data practices:</p>
        <div className="mt-2 p-3 rounded-xl bg-muted/50 space-y-1">
          <p><strong className="text-foreground">Email:</strong> privacy@coursevia.com</p>
          <p><strong className="text-foreground">Support:</strong> support@coursevia.com</p>
          <p><strong className="text-foreground">Platform:</strong> Coursevia Support Dashboard</p>
        </div>
      </PolicyCard>
    </PolicyLayout>
    <Footer />
  </div>
);

// ─── REFUND POLICY ───────────────────────────────────────────────────────────

const refundSections = [
  { id: "r-intro", title: "Introduction" },
  { id: "digital", title: "Digital Products" },
  { id: "general", title: "General Refund Rule" },
  { id: "eligible", title: "Eligible Refund Cases" },
  { id: "non-refundable", title: "Non-Refundable Cases" },
  { id: "consumption", title: "Content Consumption" },
  { id: "timeframe", title: "Request Timeframe" },
  { id: "how-to", title: "How to Request" },
  { id: "review", title: "Review Process" },
  { id: "method", title: "Refund Processing" },
  { id: "creator-protection", title: "Creator Protection" },
  { id: "disputes", title: "Disputes & Chargebacks" },
  { id: "r-changes", title: "Policy Updates" },
  { id: "r-contact", title: "Contact Support" },
];

export const RefundPolicy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <PolicyLayout
      title="Refund Policy"
      subtitle={lastUpdated}
      description="This Refund Policy outlines the conditions under which refunds may be issued for purchases made on Coursevia. We strive to be fair to both learners and creators."
      badge="Fair • Transparent • Creator-Protected"
      sections={refundSections}
      ctaTitle="Need Help With a Purchase?"
      ctaDesc="Our team is here to ensure fairness for both users and creators. If you're experiencing an issue, reach out — we'll review it carefully."
      ctaPrimary={{ label: "Contact Support", href: "/contact" }}
      ctaSecondary={{ label: "Help Center", href: "/help" }}
    >
      <PolicyCard id="r-intro" title="Introduction">
        <p>At Coursevia, we strive to provide high-quality digital learning experiences through our video-based marketplace.</p>
        <p className="mt-2">This Refund Policy explains how refunds are handled for purchases made on the platform. By purchasing any course or digital product on Coursevia, you agree to this policy.</p>
      </PolicyCard>

      <PolicyCard id="digital" title="Nature of Digital Products">
        <p>All products on Coursevia are digital and delivered instantly upon purchase. This includes:</p>
        <ul className="space-y-1.5 mt-1">
          {["Video courses and educational content", "Creator-based digital services", "Subscriptions and premium access"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">Due to the nature of digital products, refunds are limited and subject to the conditions outlined below.</p>
      </PolicyCard>

      <PolicyCard id="general" title="General Refund Policy">
        <p>As a general rule, <strong className="text-foreground">all sales are considered final.</strong></p>
        <p className="mt-2">However, we may issue refunds under specific circumstances where fairness and user protection apply. Refund eligibility is determined based on usage, access, and the nature of the issue reported.</p>
      </PolicyCard>

      <PolicyCard id="eligible" title="When Refunds May Be Granted">
        <p>You may be eligible for a refund if:</p>
        <ul className="space-y-1.5 mt-1">
          {["You were charged multiple times for the same product", "The content is completely inaccessible due to a verified platform issue", "The product was significantly misrepresented by the creator", "There is a verified technical error preventing access"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">All refund requests must be supported with valid evidence.</p>
      </PolicyCard>

      <PolicyCard id="non-refundable" title="Non-Refundable Cases">
        <p>Refunds will <strong className="text-foreground">not</strong> be granted in the following situations:</p>
        <ul className="space-y-1.5 mt-1">
          {["You changed your mind after purchase", "You did not complete or enjoy the course", "You misunderstood the product description", "You have already consumed a significant portion of the content", "Your issue is based on personal expectations rather than factual problems"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">This protects creators and ensures fairness across the platform.</p>
      </PolicyCard>

      <PolicyCard id="consumption" title="Content Access & Consumption">
        <p>If a user has viewed or downloaded a substantial portion of the content, or completed key sections of a course, the purchase may no longer be eligible for a refund.</p>
        <p className="mt-2">Coursevia tracks usage activity to ensure fair evaluation of all refund requests.</p>
      </PolicyCard>

      <PolicyCard id="timeframe" title="Refund Request Window">
        <p>All refund requests must be submitted within <strong className="text-foreground">7 days of purchase.</strong></p>
        <p className="mt-2">Requests made after this period may not be considered, except in exceptional circumstances at Coursevia's sole discretion.</p>
      </PolicyCard>

      <PolicyCard id="how-to" title="Requesting a Refund">
        <p>To request a refund:</p>
        <ol className="space-y-1.5 mt-1 list-decimal pl-4">
          {["Contact support via the Coursevia platform or email support@coursevia.com", "Provide your order ID and account email", "Clearly explain the issue you experienced", "Attach any relevant evidence (screenshots, error messages, etc.)"].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="mt-2">Our team will review your request and respond within a reasonable timeframe.</p>
      </PolicyCard>

      <PolicyCard id="review" title="Refund Review Process">
        <p>All refund requests are carefully reviewed by our support team. We consider:</p>
        <ul className="space-y-1.5 mt-1">
          {["Usage activity and content access logs", "Technical logs and platform error records", "Nature and validity of the complaint", "Accuracy of the creator's content description"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">Coursevia reserves the right to approve or deny any request based on these factors.</p>
      </PolicyCard>

      <PolicyCard id="method" title="Refund Processing">
        <p>If approved:</p>
        <ul className="space-y-1.5 mt-1">
          {["Refunds will be issued to the original payment method", "Processing time may vary depending on your payment provider (typically 5–10 business days)", "Platform fees may be non-refundable in certain cases"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
      </PolicyCard>

      <PolicyCard id="creator-protection" title="Creator Protection">
        <p>Coursevia is committed to protecting creators from abuse. We actively monitor:</p>
        <ul className="space-y-1.5 mt-1">
          {["Excessive or repeated refund requests", "Fraudulent behavior and content exploitation", "Patterns of abuse targeting specific creators"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">Accounts found abusing the refund system may be restricted or permanently suspended.</p>
      </PolicyCard>

      <PolicyCard id="disputes" title="Disputes & Chargebacks">
        <p>If you initiate a chargeback with your bank or payment provider without first contacting Coursevia:</p>
        <ul className="space-y-1.5 mt-1">
          {["Your account may be suspended pending investigation", "Access to purchased content may be revoked", "You may be liable for chargeback fees"].map((item) => (
            <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{item}</span></li>
          ))}
        </ul>
        <p className="mt-2">We strongly encourage resolving all issues through our support system first.</p>
      </PolicyCard>

      <PolicyCard id="r-changes" title="Policy Updates">
        <p>We may update this Refund Policy from time to time. Continued use of Coursevia means you accept any updated terms.</p>
        <p className="mt-2">Significant changes will be communicated via email or a prominent notice on the platform.</p>
      </PolicyCard>

      <PolicyCard id="r-contact" title="Contact Us">
        <p>For any refund-related questions or to submit a request:</p>
        <div className="mt-2 p-3 rounded-xl bg-muted/50 space-y-1">
          <p><strong className="text-foreground">Email:</strong> support@coursevia.com</p>
          <p><strong className="text-foreground">Platform:</strong> Coursevia Support Dashboard</p>
        </div>
      </PolicyCard>
    </PolicyLayout>
    <Footer />
  </div>
);

// ─── SIMPLE PAGES ────────────────────────────────────────────────────────────

const simplePage = (title: string, content: string) => () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container-tight section-spacing">
      <h1 className="text-4xl font-bold text-foreground mb-6">{title}</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">{content}</div>
    </div>
    <Footer />
  </div>
);

export const Blog = simplePage("Blog", "Coursevia publishes practical insights on learning strategy, provider growth, digital education, booking workflows, and premium content operations. New editorial pieces are being prepared for release.");

export const Contact = simplePage("Contact Us", "Have questions or need help? Reach out to our support team.\n\nEmail: support@coursevia.com\n\nWe typically respond within 24 hours during business days.");

export const HelpCenter = simplePage("Help Center", "Welcome to the Coursevia Help Center.\n\nFor account issues, payment questions, or technical support, please visit our FAQ page or contact us directly.\n\nCommon topics:\n• Account setup and verification\n• Payment and billing\n• Course access issues\n• Booking and scheduling\n• Withdrawal requests");
