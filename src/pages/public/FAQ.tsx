import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const faqItems = [
  { q: "What is Coursevia?", a: "Coursevia is a platform that combines course creation, expert coaching, and premium video content. Learners can access courses and coaching, while creators and coaches can monetize their expertise." },
  { q: "How do payments work?", a: "We support bank transfers and card payments. All funds are processed through our secure escrow system. Creators and coaches receive their earnings minus a platform fee." },
  { q: "How do I become a coach?", a: "Sign up, select 'Coach' during onboarding, and complete the secure KYC verification flow. Once approved, you can start offering services." },
  { q: "Is my data secure?", a: "Yes. We use industry-standard encryption and security practices. Contact information is protected in our messaging system, and financial data is never stored in plain text." },
  { q: "Can I get a refund?", a: "Refund requests are handled on a case-by-case basis. Please review our refund policy or contact support for assistance." },
  { q: "What are the platform fees?", a: "We charge a small platform fee on course and coaching transactions. Subscription fees go 100% to the platform to maintain and improve our services." },
];

const FAQ = () => (
  <div className="min-h-screen bg-background"><Navbar />
    <div className="container-tight section-spacing">
      <h1 className="text-4xl font-bold text-foreground mb-8">Frequently Asked Questions</h1>
      <div className="space-y-4">
        {faqItems.map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
    <Footer />
  </div>
);
export default FAQ;
