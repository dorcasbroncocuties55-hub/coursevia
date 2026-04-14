import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  ShieldCheck, Users, Globe, BookOpen, Video, Star, TrendingUp, Heart,
  Award, Zap, Lock, CheckCircle, ArrowRight, Target, Lightbulb, HandHeart,
  BadgeCheck, BarChart3, MessageSquare, Clock
} from "lucide-react";

const stats = [
  { value: "150K+", label: "Active Learners" },
  { value: "8,000+", label: "Verified Providers" },
  { value: "120+", label: "Countries Served" },
  { value: "98%", label: "Satisfaction Rate" },
];

const offerings = [
  {
    icon: BookOpen,
    title: "Online Courses",
    desc: "Structured, self-paced learning paths built by verified creators. Purchase once and access your content forever — including all future updates.",
    features: ["Lifetime access", "Completion certificates", "Downloadable resources", "Mobile-friendly"],
  },
  {
    icon: Video,
    title: "Premium Videos",
    desc: "Expert-led short-form content covering hundreds of topics. Pay per video or unlock unlimited access with a monthly or annual subscription.",
    features: ["HD streaming", "Offline downloads", "Curated playlists", "New content weekly"],
  },
  {
    icon: Users,
    title: "1-on-1 Coaching",
    desc: "Book private sessions with certified coaches across business, fitness, career, finance, and more. Available online or in person.",
    features: ["Flexible scheduling", "Video & in-person", "Session recordings", "Progress tracking"],
  },
  {
    icon: Heart,
    title: "Therapy & Wellness",
    desc: "Connect with licensed therapists and mental health professionals for confidential, compassionate support — on your schedule.",
    features: ["Licensed professionals", "Confidential sessions", "Secure messaging", "Crisis resources"],
  },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Trust & Safety",
    desc: "Every provider on Coursevia undergoes identity verification and credential review before their profile goes live. We enforce strict community standards and take swift action against any violations to keep the platform safe for all users.",
  },
  {
    icon: Star,
    title: "Quality First",
    desc: "We hold providers to high standards through verified reviews, transparent ratings, and ongoing performance monitoring. Learners can make confident, informed decisions backed by real feedback from real people.",
  },
  {
    icon: Globe,
    title: "Global Inclusivity",
    desc: "Coursevia is built for the world. We support multiple currencies, local payment methods, and diverse delivery modes — ensuring that geography or economic circumstance is never a barrier to growth.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    desc: "All transactions are processed through encrypted, PCI-compliant payment infrastructure. Funds are held in escrow and released to providers only after successful service delivery, protecting both parties.",
  },
  {
    icon: Lightbulb,
    title: "Continuous Innovation",
    desc: "We invest heavily in our platform technology — from AI-powered search and smart scheduling to real-time analytics and creator monetization tools — so providers and learners always have the best tools available.",
  },
  {
    icon: HandHeart,
    title: "Community Impact",
    desc: "We believe education changes lives. Coursevia actively partners with nonprofits and social enterprises to provide subsidized access to underserved communities around the world.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Create Your Account",
    desc: "Sign up in minutes as a learner, coach, therapist, or creator. Complete your profile and verify your identity to unlock full platform access.",
  },
  {
    step: "02",
    title: "Discover What You Need",
    desc: "Browse thousands of courses, videos, coaches, and therapists. Use smart filters, verified reviews, and AI-powered recommendations to find the perfect match.",
  },
  {
    step: "03",
    title: "Book, Enroll, or Subscribe",
    desc: "Purchase a course, book a session, or subscribe for unlimited access. All payments are secure, and your funds are protected until delivery is confirmed.",
  },
  {
    step: "04",
    title: "Learn, Grow, and Achieve",
    desc: "Attend sessions, complete courses, and track your progress. Leave reviews, earn certificates, and keep building on your success.",
  },
];

const providerBenefits = [
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Track earnings, session bookings, course enrollments, and audience engagement from a single dashboard." },
  { icon: Zap, title: "Instant Payouts", desc: "Withdraw your earnings to your bank account or digital wallet with fast, reliable payout processing." },
  { icon: MessageSquare, title: "Built-In Messaging", desc: "Communicate with clients directly through our secure, encrypted messaging system — no third-party tools needed." },
  { icon: Clock, title: "Smart Scheduling", desc: "Set your availability, manage bookings, and send automated reminders — all from your provider dashboard." },
  { icon: Award, title: "Verified Badge", desc: "Earn a Coursevia Verified badge after completing our identity and credential review process, boosting client trust." },
  { icon: Target, title: "Marketing Tools", desc: "Promote your services with shareable profile links, SEO-optimized listings, and featured placement opportunities." },
];

const About = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="bg-gradient-to-br from-primary/8 via-background to-background border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-6">
          About Coursevia
        </span>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
          Where learning meets<br />
          <span className="text-primary">real human connection</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-10">
          Coursevia is a global marketplace connecting learners, coaches, therapists, and creators. We make quality education and expert guidance accessible to everyone — regardless of where they are or where they come from.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/signup" className="rounded-xl bg-primary text-primary-foreground font-semibold px-8 py-3 hover:bg-primary/90 transition inline-flex items-center gap-2">
            Get started free <ArrowRight size={16} />
          </a>
          <a href="/coaches" className="rounded-xl border border-border text-foreground font-semibold px-8 py-3 hover:bg-muted transition">
            Browse providers
          </a>
        </div>
      </div>
    </section>

    {/* Stats */}
    <section className="border-b border-border bg-muted/20">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-4xl font-bold text-primary mb-1">{value}</p>
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Mission */}
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="grid md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Our Mission</span>
          <h2 className="text-3xl font-bold text-foreground mt-3 mb-5">Democratizing access to expertise</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We believe that access to quality education and professional guidance should not be limited by geography, income, or circumstance. Coursevia was built to break down those barriers — connecting people who want to grow with the experts who can help them get there.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Founded on the principle that human potential is universal, we have built a platform that serves learners in emerging markets just as powerfully as it serves professionals in major cities. Our technology is designed to be fast, accessible, and intuitive — because the best learning experience is one that gets out of the way and lets the real work happen.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you are a learner seeking new skills, a professional looking for a coach, someone navigating life with the help of a therapist, or a creator ready to share your knowledge — Coursevia is your platform.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Users, label: "Verified Providers", desc: "Every coach and therapist is identity-verified and credential-reviewed before going live." },
            { icon: ShieldCheck, label: "Secure Payments", desc: "Funds are held in escrow and released only after confirmed service delivery." },
            { icon: Globe, label: "Global Reach", desc: "Providers and learners from over 120 countries connected on one platform." },
            { icon: TrendingUp, label: "Creator Tools", desc: "Publish courses and videos with built-in monetization, analytics, and scheduling." },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5">
              <Icon size={22} className="text-primary mb-3" />
              <p className="font-semibold text-foreground text-sm mb-1">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* What We Offer */}
    <section className="bg-muted/30 border-y border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">What We Offer</span>
          <h2 className="text-3xl font-bold text-foreground mt-3">One platform, four powerful experiences</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Coursevia brings together the most important forms of expert-led learning and personal development under one roof — with the tools, trust, and technology to make every experience exceptional.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {offerings.map(({ icon: Icon, title, desc, features }) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-6 flex flex-col">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon size={22} className="text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{desc}</p>
              <ul className="space-y-1.5">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle size={12} className="text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="text-center mb-14">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">How It Works</span>
        <h2 className="text-3xl font-bold text-foreground mt-3">Getting started is simple</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
          From sign-up to your first session or course completion, Coursevia is designed to be seamless at every step.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {howItWorks.map(({ step, title, desc }) => (
          <div key={step} className="relative">
            <div className="text-5xl font-black text-primary/10 mb-3 leading-none">{step}</div>
            <h3 className="font-bold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Our Values */}
    <section className="bg-muted/30 border-y border-border">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Our Values</span>
          <h2 className="text-3xl font-bold text-foreground mt-3">What we stand for</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Our values are not just words on a page — they are the principles that guide every product decision, every policy, and every interaction on Coursevia.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {values.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon size={22} className="text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* For Providers */}
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="text-center mb-14">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">For Providers</span>
        <h2 className="text-3xl font-bold text-foreground mt-3">Everything you need to grow your practice</h2>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
          Coursevia gives coaches, therapists, and creators a complete professional toolkit — so you can focus on delivering exceptional experiences while we handle the rest.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {providerBenefits.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-4 p-5 rounded-2xl border border-border bg-card">
            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Icon size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <a href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold px-8 py-3 hover:bg-primary/90 transition">
          Become a provider <ArrowRight size={16} />
        </a>
      </div>
    </section>

    {/* Trust & Compliance */}
    <section className="bg-muted/30 border-y border-border">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Trust & Compliance</span>
            <h2 className="text-3xl font-bold text-foreground mt-3 mb-5">Built on a foundation of security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Coursevia takes the security and privacy of our users seriously. Our platform is built with enterprise-grade infrastructure, end-to-end encryption for sensitive communications, and strict data governance policies that comply with international privacy regulations including GDPR and applicable data protection laws.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All payment processing is handled through PCI-DSS compliant gateways. We never store raw card data, and all financial transactions are monitored for fraud in real time. Our escrow system ensures that providers are paid fairly and learners are protected against non-delivery.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our KYC (Know Your Customer) process verifies the identity of every provider before they can offer services on the platform — giving learners the confidence to book with trust.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: BadgeCheck, title: "Identity Verification (KYC)", desc: "All providers complete a government ID and liveness check before activation." },
              { icon: Lock, title: "End-to-End Encryption", desc: "Messages and session data are encrypted in transit and at rest." },
              { icon: ShieldCheck, title: "PCI-DSS Compliant Payments", desc: "Card data is never stored on our servers. All payments are tokenized." },
              { icon: Globe, title: "GDPR & Privacy Compliance", desc: "We respect your data rights and comply with international privacy regulations." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-4 rounded-xl border border-border bg-background">
                <Icon size={20} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Legal Links */}
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Legal & Policies</span>
        <h2 className="text-3xl font-bold text-foreground mt-3">Transparency you can count on</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
          We believe in clear, honest policies. Review our legal documents to understand your rights and how we operate.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-6">
        {[
          { title: "Terms of Service", desc: "The rules and guidelines that govern your use of the Coursevia platform, including provider and learner obligations.", href: "/terms" },
          { title: "Privacy Policy", desc: "How we collect, use, store, and protect your personal data — and your rights under applicable privacy laws.", href: "/privacy" },
          { title: "Refund Policy", desc: "Our fair and transparent refund guidelines for courses, sessions, subscriptions, and digital content purchases.", href: "/refund-policy" },
        ].map(({ title, desc, href }) => (
          <a key={title} href={href} className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-primary/5 transition block">
            <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Read more <ArrowRight size={12} />
            </span>
          </a>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to start your journey?</h2>
        <p className="text-primary-foreground/80 mb-8 text-lg max-w-xl mx-auto">
          Join over 150,000 learners and 8,000 verified providers already growing on Coursevia. Your next breakthrough starts here.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/signup" className="rounded-xl bg-white text-primary font-semibold px-8 py-3 hover:bg-white/90 transition inline-flex items-center gap-2">
            Get started free <ArrowRight size={16} />
          </a>
          <a href="/coaches" className="rounded-xl border border-white/30 text-white font-semibold px-8 py-3 hover:bg-white/10 transition">
            Browse coaches
          </a>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default About;
