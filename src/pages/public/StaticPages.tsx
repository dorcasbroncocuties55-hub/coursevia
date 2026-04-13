import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const simplePage = (title: string, content: string) => () => (
  <div className="min-h-screen bg-background"><Navbar />
    <div className="container-tight section-spacing">
      <h1 className="text-4xl font-bold text-foreground mb-6">{title}</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">{content}</div>
    </div>
    <Footer />
  </div>
);

export const Terms = simplePage("Terms of Service", `By using Coursevia, you agree to these terms of service. Coursevia provides a platform for learning, coaching, and content creation.\n\nUsers must be at least 18 years old to create an account. You are responsible for maintaining the security of your account credentials.\n\nContent creators retain ownership of their content but grant Coursevia a license to display and distribute it on the platform.\n\nCoursevia reserves the right to suspend or terminate accounts that violate these terms.\n\nLast updated: March 2026`);

export const Privacy = simplePage("Privacy Policy", `Coursevia respects your privacy and is committed to protecting your personal data.\n\nWe collect information you provide during registration, including your name, email, and payment details. This data is used to provide our services and improve your experience.\n\nWe do not sell your personal data to third parties. Financial information is processed securely and never stored in plain text.\n\nYou can request deletion of your account and associated data at any time by contacting support.\n\nLast updated: March 2026`);

export const RefundPolicy = simplePage("Refund Policy", `Coursevia offers refunds on a case-by-case basis.\n\nCourse purchases may be refunded within 7 days if less than 30% of the content has been accessed.\n\nCoaching session refunds must be requested at least 24 hours before the scheduled session.\n\nSubscription refunds are prorated based on remaining time.\n\nTo request a refund, please contact our support team with your payment details and reason for the request.\n\nLast updated: March 2026`);

export const Blog = simplePage("Blog", "Coursevia publishes practical insights on learning strategy, provider growth, digital education, booking workflows, and premium content operations. New editorial pieces are being prepared for release.");

export const Contact = simplePage("Contact Us", "Have questions or need help? Reach out to our support team.\n\nEmail: support@coursevia.com\n\nWe typically respond within 24 hours during business days.");

export const HelpCenter = simplePage("Help Center", "Welcome to the Coursevia Help Center.\n\nFor account issues, payment questions, or technical support, please visit our FAQ page or contact us directly.\n\nCommon topics:\n• Account setup and verification\n• Payment and billing\n• Course access issues\n• Booking and scheduling\n• Withdrawal requests");
