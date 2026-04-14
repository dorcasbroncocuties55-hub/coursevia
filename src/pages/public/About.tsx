import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ShieldCheck, Users, Globe, BookOpen, Video,
  Star, TrendingUp, Heart, BadgeCheck, Lock, Zap,
  BarChart3, MessageSquare, Clock, CheckCircle, Target,
} from "lucide-react";
import heroStudent from "@/assets/hero-student.png";
import heroBusiness from "@/assets/hero-business.png";
import heroCreator from "@/assets/hero-creator.png";
import heroTherapist from "@/assets/hero-therapist.png";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
});

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
    features: ["Lifetime access", "Completion certificates", "Downloadable resources"],
  },
  {
    icon: Video,
    title: "Premium Videos",
    desc: "Expert-led short-form content covering hundreds of topics. Pay per video or unlock unlimited access with a monthly or annual subscription.",
    features: ["HD streaming", "Offline downloads", "New content weekly"],
  },
  {
    icon: Users,
    title: "1-on-1 Coaching",
    desc: "Book private sessions with certified coaches across business, fitness, career, finance, and more. Available online or in person.",
    features: ["Flexible scheduling", "Video & in-person", "Progress tracking"],
  },
  {
    icon: Heart,
    title: "Therapy & Wellness",
    desc: "Connect with licensed therapists and mental health professionals for confidential, compassionate support — on your schedule.",
    features: ["Licensed professionals", "Confidential sessions", "Secure messaging"],
  },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Trust & Safety",
    desc: "Every provider undergoes identity verification and credential review before going live. We enforce strict community standards to keep the platform safe for all.",
  },
  {
    icon: Star,
    title: "Quality First",
    desc: "Verified reviews, transparent ratings, and ongoing performance monitoring help learners make confident, informed decisions backed by real feedback.",
  },
  {
    icon: Globe,
    title: "Global Inclusivity",
    desc: "We support multiple currencies, local payment methods, and diverse delivery modes — ensuring geography is never a barrier to growth.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    desc: "All transactions are PCI-DSS compliant. Funds are held in escrow and released to providers only after successful service delivery.",
  },
  {
    icon: Zap,
    title: "Continuous Innovation",
    desc: "From AI-powered search to real-time analytics and creator monetization tools — we invest heavily so providers and learners always have the best tools.",
  },
  {
    icon: Target,
    title: "Community Impact",
    desc: "We actively partner with nonprofits to provide subsidized access to underserved communities around the world.",
  },
];

const providerBenefits = [
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Track earnings, bookings, enrollments, and audience engagement from one dashboard." },
  { icon: Zap, title: "Instant Payouts", desc: "Withdraw earnings to your bank or digital wallet with fast, reliable payout processing." },
  { icon: MessageSquare, title: "Built-In Messaging", desc: "Communicate with clients through our secure, encrypted messaging system." },
  { icon: Clock, title: "Smart Scheduling", desc: "Set availability, manage bookings, and send automated reminders — all in one place." },
  { icon: BadgeCheck, title: "Verified Badge", desc: "Earn a Coursevia Verified badge after completing our identity and credential review." },
  { icon: TrendingUp, title: "Marketing Tools", desc: "Shareable profile links, SEO-optimized listings, and featured placement opportunities." },
];

const About = () => (
  <div className="min-h-screen bg-background">

    {/* ── Hero ── */}
    <section className="relative overflow-hidden bg-primary/5 py-16 lg:py-24">
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-5">
              About Coursevia
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              Where learning meets{" "}
              <span className="text-primary">real human connection</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg leading-relaxed">
              Coursevia is a global marketplace connecting learners, coaches, therapists, and creators. We make quality education and expert guidance accessible to everyone — regardless of where they are or where they come from.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild className="rounded-full px-8">
                <Link to="/signup">
                  Get started free <ArrowRight className="ml-2" size={18} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-8">
                <Link to="/coaches">Browse providers</Link>
              </Button>
            </div>
          </motion.div>

          {/* Right — image collage */}
          <motion.div
            className="relative flex justify-center lg:justify-end"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative">
              <motion.img
                src={heroStudent}
                alt="Learner on Coursevia"
                className="relative z-10 w-64 sm:w-72 lg:w-80 object-contain"
                animate={{ rotate: [3, -3, 3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "bottom center" }}
              />
              <motion.div
                className="absolute -top-2 -right-4 z-20 rounded-xl overflow-hidden border-[3px] border-background shadow-lg"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <img src={heroTherapist} alt="Therapist" className="w-24 h-20 sm:w-28 sm:h-24 object-cover" />
              </motion.div>
              <motion.div
                className="absolute bottom-12 -left-8 sm:-left-12 z-20 rounded-xl overflow-hidden border-[3px] border-background shadow-lg"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
              >
                <img src={heroBusiness} alt="Business coach" className="w-24 h-20 sm:w-28 sm:h-24 object-cover" />
              </motion.div>
              <motion.div
                className="absolute bottom-4 -right-6 sm:-right-8 z-20 rounded-xl overflow-hidden border-[3px] border-background shadow-lg"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
              >
                <img src={heroCreator} alt="Creator" className="w-24 h-20 sm:w-28 sm:h-24 object-cover" />
              </motion.div>
              <motion.div
                className="absolute top-6 left-0 z-30 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-md flex items-center gap-1.5"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
              >
                <span className="text-lg font-bold text-foreground">5.0</span>
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* ── Stats ── */}
    <section className="border-y border-border bg-secondary/40">
      <div className="container-wide py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label }, i) => (
            <motion.div key={label} {...fadeUp(i * 0.1)}>
              <p className="text-4xl font-bold text-primary mb-1">{value}</p>
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Mission ── */}
    <section className="section-spacing">
      <div className="container-wide">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeUp()}>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Our Mission</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-5">
              Democratizing access to expertise
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We believe that access to quality education and professional guidance should not be limited by geography, income, or circumstance. Coursevia was built to break down those barriers — connecting people who want to grow with the experts who can help them get there.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Founded on the principle that human potential is universal, we serve learners in emerging markets just as powerfully as professionals in major cities. Our technology is fast, accessible, and intuitive — because the best learning experience gets out of the way and lets the real work happen.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Whether you are a learner seeking new skills, a professional looking for a coach, someone navigating life with the help of a therapist, or a creator ready to share your knowledge — Coursevia is your platform.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: "Verified Providers", desc: "Every coach and therapist is identity-verified and credential-reviewed before going live." },
              { icon: ShieldCheck, label: "Secure Payments", desc: "Funds are held in escrow and released only after confirmed service delivery." },
              { icon: Globe, label: "Global Reach", desc: "Providers and learners from over 120 countries connected on one platform." },
              { icon: TrendingUp, label: "Creator Tools", desc: "Publish courses and videos with built-in monetization, analytics, and scheduling." },
            ].map(({ icon: Icon, label, desc }, i) => (
              <motion.div key={label} {...fadeUp(i * 0.1)}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <Icon size={22} className="text-primary mb-3" />
                <p className="font-semibold text-foreground text-sm mb-1">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* ── What We Offer ── */}
    <section className="section-spacing bg-secondary/50">
      <div className="container-wide">
        <motion.div {...fadeUp()} className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">What We Offer</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-3">
            One platform, four powerful experiences
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Coursevia brings together the most important forms of expert-led learning and personal development under one roof — with the tools, trust, and technology to make every experience exceptional.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {offerings.map(({ icon: Icon, title, desc, features }, i) => (
            <motion.div key={title} {...fadeUp(i * 0.1)}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon size={20} className="text-primary" />
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ── How It Works ── */}
    <section className="section-spacing">
      <div className="container-wide">
        <motion.div {...fadeUp()} className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">How It Works</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-3">
            Getting started is simple
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From sign-up to your first session or course completion, Coursevia is designed to be seamless at every step.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Create Your Account", desc: "Sign up in minutes as a learner, coach, therapist, or creator. Verify your identity to unlock full platform access." },
            { step: "02", title: "Discover What You Need", desc: "Browse thousands of courses, videos, coaches, and therapists. Use smart filters and verified reviews to find the perfect match." },
            { step: "03", title: "Book, Enroll, or Subscribe", desc: "Purchase a course, book a session, or subscribe for unlimited access. All payments are secure and your funds are protected." },
            { step: "04", title: "Learn, Grow, and Achieve", desc: "Attend sessions, complete courses, and track your progress. Earn certificates and keep building on your success." },
          ].map(({ step, title, desc }, i) => (
            <motion.div key={step} {...fadeUp(i * 0.1)}>
              <div className="text-5xl font-black text-primary/10 mb-3 leading-none">{step}</div>
              <h3 className="font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Values ── */}
    <section className="section-spacing bg-secondary/50">
      <div className="container-wide">
        <motion.div {...fadeUp()} className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Our Values</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-3">What we stand for</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Our values guide every product decision, every policy, and every interaction on Coursevia.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} {...fadeUp(i * 0.1)}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ── For Providers ── */}
    <section className="section-spacing">
      <div className="container-wide">
        <motion.div {...fadeUp()} className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">For Providers</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-3">
            Everything you need to grow your practice
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Coursevia gives coaches, therapists, and creators a complete professional toolkit — so you can focus on delivering exceptional experiences while we handle the rest.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {providerBenefits.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} {...fadeUp(i * 0.1)}
              className="flex gap-4 p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Icon size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div {...fadeUp(0.3)} className="mt-10 text-center">
          <Button size="lg" asChild className="rounded-full px-8">
            <Link to="/signup">
              Become a provider <ArrowRight className="ml-2" size={18} />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>

    {/* ── Trust & Compliance ── */}
    <section className="section-spacing bg-secondary/50">
      <div className="container-wide">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeUp()}>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Trust & Compliance</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-5">
              Built on a foundation of security
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Coursevia takes the security and privacy of our users seriously. Our platform is built with enterprise-grade infrastructure, end-to-end encryption for sensitive communications, and strict data governance policies that comply with international privacy regulations including GDPR.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All payment processing is handled through PCI-DSS compliant gateways. We never store raw card data, and all financial transactions are monitored for fraud in real time. Our escrow system ensures providers are paid fairly and learners are protected against non-delivery.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our KYC process verifies the identity of every provider before they can offer services — giving learners the confidence to book with trust.
            </p>
          </motion.div>
          <div className="space-y-4">
            {[
              { icon: BadgeCheck, title: "Identity Verification (KYC)", desc: "All providers complete a government ID and liveness check before activation." },
              { icon: Lock, title: "End-to-End Encryption", desc: "Messages and session data are encrypted in transit and at rest." },
              { icon: ShieldCheck, title: "PCI-DSS Compliant Payments", desc: "Card data is never stored on our servers. All payments are tokenized." },
              { icon: Globe, title: "GDPR & Privacy Compliance", desc: "We respect your data rights and comply with international privacy regulations." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.1)}
                className="flex gap-4 p-4 rounded-xl border border-border bg-card shadow-sm"
              >
                <Icon size={20} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* ── Legal Links ── */}
    <section className="section-spacing">
      <div className="container-wide">
        <motion.div {...fadeUp()} className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Legal & Policies</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-3">Transparency you can count on</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We believe in clear, honest policies. Review our legal documents to understand your rights and how we operate.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { title: "Terms of Service", desc: "The rules and guidelines that govern your use of the Coursevia platform, including provider and learner obligations.", href: "/terms" },
            { title: "Privacy Policy", desc: "How we collect, use, store, and protect your personal data — and your rights under applicable privacy laws.", href: "/privacy" },
            { title: "Refund Policy", desc: "Our fair and transparent refund guidelines for courses, sessions, subscriptions, and digital content purchases.", href: "/refund-policy" },
          ].map(({ title, desc, href }, i) => (
            <motion.div key={title} {...fadeUp(i * 0.1)}>
              <Link to={href}
                className="group block rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Read more <ArrowRight size={12} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ── CTA ── */}
    <section className="bg-primary text-primary-foreground">
      <div className="container-wide py-20 text-center">
        <motion.div {...fadeUp()}>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to start your journey?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg max-w-xl mx-auto">
            Join over 150,000 learners and 8,000 verified providers already growing on Coursevia. Your next breakthrough starts here.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild className="rounded-full px-8 bg-white text-primary hover:bg-white/90">
              <Link to="/signup">
                Get started free <ArrowRight className="ml-2" size={18} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild
              className="rounded-full px-8 border-white/30 text-white hover:bg-white/10 bg-transparent"
            >
              <Link to="/coaches">Browse coaches</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>

  </div>
);

export default About;
