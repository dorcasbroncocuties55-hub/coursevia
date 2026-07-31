import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PolicyLayout, { PolicyCard } from "@/components/shared/PolicyLayout";
import {
  ArrowRight, Video, DollarSign, Zap, HeadphonesIcon,
  BarChart3, BookOpen, Users, Heart, ShieldCheck,
  Globe, Lock, BadgeCheck, CheckCircle,
} from "lucide-react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, delay },
});

const sections = [
  { id: "mission", title: "Our Mission" },
  { id: "what-we-do", title: "What We Do" },
  { id: "why-coursevia", title: "Why Coursevia" },
  { id: "who-its-for", title: "Who It's For" },
  { id: "vision", title: "Our Vision" },
  { id: "trust", title: "Built for Trust" },
];

const About = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    <PolicyLayout
      title="About Coursevia"
      subtitle="Redefining how people learn, teach, and grow through video-first experiences."
      description="Coursevia is a modern platform built for creators, coaches, and professionals to share knowledge, deliver value, and build sustainable income — all through powerful video-based content."
      badge="Video-First • Creator-Powered • Global"
      sections={sections}
      ctaTitle="Start Your Journey"
      ctaDesc="Whether you're here to learn or to build your own digital product business — Coursevia gives you the tools to succeed."
      ctaPrimary={{ label: "🚀 Explore Courses", href: "/courses" }}
      ctaSecondary={{ label: "💼 Become a Creator", href: "/signup" }}
    >
      {/* Stats row inside cards area */}
      <motion.div {...fadeUp()}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white dark:bg-card rounded-2xl border border-[#EAEAEA] dark:border-border shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6"
      >
        {[
          { value: "150K+", label: "Active Learners" },
          { value: "8,000+", label: "Verified Providers" },
          { value: "120+", label: "Countries Served" },
          { value: "98%", label: "Satisfaction Rate" },
        ].map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-3xl font-bold text-primary mb-1">{value}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
        ))}
      </motion.div>

      <PolicyCard id="mission" title="Our Mission">
        <p>Our mission is simple: <strong className="text-foreground">to make high-quality knowledge accessible while empowering creators to monetize their expertise without limits.</strong></p>
        <p className="mt-2">We believe learning should be:</p>
        <ul className="space-y-1.5 mt-2">
          {[
            "Practical — focused on real-world skills that create real results",
            "Accessible — available to anyone, anywhere, at any time",
            "Scalable — growing with both the creator and the learner",
            "Profitable — rewarding creators fairly for the value they deliver",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle size={14} className="text-primary shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </PolicyCard>

      <PolicyCard id="what-we-do" title="What We Do">
        <p>Coursevia is a <strong className="text-foreground">video-course marketplace</strong>, not a traditional learning platform. We enable:</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {[
            { icon: Video, label: "Creators", desc: "Upload and sell video content to a global audience" },
            { icon: Users, label: "Coaches", desc: "Offer structured 1-on-1 and group learning experiences" },
            { icon: BookOpen, label: "Educators", desc: "Build and monetize practical, real-world skill courses" },
            { icon: Heart, label: "Therapists", desc: "Deliver wellness and mental health services securely" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex gap-3 p-3 rounded-xl border border-border bg-background">
              <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10">
                <Icon size={15} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-xs">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3">Everything is built around <strong className="text-foreground">video as a product</strong>, not just content.</p>
      </PolicyCard>

      <PolicyCard id="why-coursevia" title="Why Coursevia">
        <p>Most platforms are built for institutions. <strong className="text-foreground">Coursevia is built for real creators and modern businesses.</strong></p>
        <p className="mt-2">What makes us different:</p>
        <ul className="space-y-2 mt-2">
          {[
            { icon: Video, text: "Video-first product system — not classroom-based" },
            { icon: DollarSign, text: "Built for monetization from day one" },
            { icon: Zap, text: "Fast onboarding and content publishing" },
            { icon: HeadphonesIcon, text: "Integrated support & communication tools" },
            { icon: BarChart3, text: "Analytics and performance insights" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2 list-none">
              <Icon size={14} className="text-primary shrink-0" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </PolicyCard>

      <PolicyCard id="who-its-for" title="Who It's For">
        <p>Coursevia is designed for anyone who wants to <strong className="text-foreground">turn knowledge into income</strong> or access expert-led learning:</p>
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {[
            "Content creators",
            "Coaches & consultants",
            "Digital entrepreneurs",
            "Educators with practical skills",
            "Therapists & wellness professionals",
            "Anyone building a knowledge business",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <CheckCircle size={13} className="text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </PolicyCard>

      <PolicyCard id="vision" title="Our Vision">
        <p>We are building more than a platform. Our vision is to create a <strong className="text-foreground">global ecosystem</strong> where:</p>
        <ul className="space-y-1.5 mt-2">
          {[
            "Knowledge becomes a digital asset that generates lasting income",
            "Creators build real, sustainable businesses — not just side projects",
            "Learning becomes flexible, on-demand, and deeply personal",
            "Every expert in the world has a professional home online",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle size={14} className="text-primary shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </PolicyCard>

      <PolicyCard id="trust" title="Built for Trust">
        <p>We prioritize the security and reliability that both creators and learners deserve:</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {[
            { icon: Lock, label: "Secure Payments", desc: "PCI-DSS compliant, escrow-protected transactions" },
            { icon: ShieldCheck, label: "Verified Providers", desc: "KYC identity checks before any provider goes live" },
            { icon: BadgeCheck, label: "Reliable Data Handling", desc: "GDPR-compliant, encrypted at rest and in transit" },
            { icon: Globe, label: "Scalable Infrastructure", desc: "Built to grow with creators and users worldwide" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex gap-3 p-3 rounded-xl border border-border bg-background">
              <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10">
                <Icon size={15} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-xs">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3">Coursevia is designed to grow with both creators and users — not just today, but for the long term.</p>
      </PolicyCard>

      {/* Legal links card */}
      <motion.div {...fadeUp()}
        className="bg-white dark:bg-card rounded-2xl border border-[#EAEAEA] dark:border-border shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-7"
      >
        <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b border-border">Legal & Policies</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: "Terms of Service", desc: "Rules governing your use of the platform.", href: "/terms" },
            { title: "Privacy Policy", desc: "How we collect and protect your data.", href: "/privacy" },
            { title: "Refund Policy", desc: "Conditions for refunds and cancellations.", href: "/refund-policy" },
          ].map(({ title, desc, href }) => (
            <Link key={title} to={href}
              className="group block p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-2">
                Read more <ArrowRight size={11} />
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </PolicyLayout>

    <Footer />
  </div>
);

export default About;
