import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Video, DollarSign, Zap, HeadphonesIcon,
  BarChart3, BookOpen, Users, Heart, Star, ShieldCheck,
  Globe, Lock, BadgeCheck, CheckCircle,
} from "lucide-react";
import heroStudent from "@/assets/hero-student.png";
import heroBusiness from "@/assets/hero-business.png";
import heroCreator from "@/assets/hero-creator.png";
import heroTherapist from "@/assets/hero-therapist.png";
import PolicyLayout, { PolicyCard } from "@/components/shared/PolicyLayout";

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

    {/* ── Hero ── */}
    <section className="relative overflow-hidden bg-primary/5 py-16 lg:py-24">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-5">
              About Coursevia
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-foreground leading-[1.1] mb-5">
              Redefining how people{" "}
              <span className="text-primary">learn, teach, and grow</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg leading-relaxed">
              Coursevia is a modern platform built for creators, coaches, and professionals to share knowledge, deliver value, and build sustainable income — all through powerful video-based content.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild className="rounded-full px-8">
                <Link to="/courses">Explore Courses <ArrowRight className="ml-2" size={18} /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-8">
                <Link to="/signup">Become a Creator</Link>
              </Button>
            </div>
          </motion.div>

          {/* Image collage */}
          <motion.div className="relative flex justify-center lg:justify-end"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative">
              <motion.img src={heroStudent} alt="Learner"
                className="relative z-10 w-64 sm:w-72 lg:w-80 object-contain"
                animate={{ rotate: [3, -3, 3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "bottom center" }}
              />
              <motion.div className="absolute -top-2 -right-4 z-20 rounded-xl overflow-hidden border-[3px] border-background shadow-lg"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}>
                <img src={heroTherapist} alt="Therapist" className="w-24 h-20 sm:w-28 sm:h-24 object-cover" />
              </motion.div>
              <motion.div className="absolute bottom-12 -left-8 sm:-left-12 z-20 rounded-xl overflow-hidden border-[3px] border-background shadow-lg"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
                <img src={heroBusiness} alt="Business" className="w-24 h-20 sm:w-28 sm:h-24 object-cover" />
              </motion.div>
              <motion.div className="absolute bottom-4 -right-6 sm:-right-8 z-20 rounded-xl overflow-hidden border-[3px] border-background shadow-lg"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: "spring" }}>
                <img src={heroCreator} alt="Creator" className="w-24 h-20 sm:w-28 sm:h-24 object-cover" />
              </motion.div>
              <motion.div className="absolute top-6 left-0 z-30 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-md flex items-center gap-1.5"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: "spring" }}>
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
          {[
            { value: "150K+", label: "Active Learners" },
            { value: "8,000+", label: "Verified Providers" },
            { value: "120+", label: "Countries Served" },
            { value: "98%", label: "Satisfaction Rate" },
          ].map(({ value, label }, i) => (
            <motion.div key={label} {...fadeUp(i * 0.1)}>
              <p className="text-4xl font-bold text-primary mb-1">{value}</p>
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Card sections with sticky nav ── */}
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 flex gap-8">

      {/* Sticky side nav */}
      <aside className="hidden lg:block w-52 shrink-0">
        <div className="sticky top-24 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-3">On this page</p>
          {sections.map(({ id, title }) => (
            <a key={id} href={`#${id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}
              className="block text-sm px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {title}
            </a>
          ))}
        </div>
      </aside>

      {/* Cards */}
      <main className="flex-1 space-y-5 min-w-0">

        <PolicyCard id="mission" title="Our Mission">
          <p>Our mission is simple: <strong className="text-foreground">to make high-quality knowledge accessible while empowering creators to monetize their expertise without limits.</strong></p>
          <p>We believe learning should be:</p>
          <ul className="space-y-1.5 mt-2">
            {["Practical — focused on real-world skills that create real results", "Accessible — available to anyone, anywhere, at any time", "Scalable — growing with both the creator and the learner", "Profitable — rewarding creators fairly for the value they deliver"].map((item) => (
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
          <p>What makes us different:</p>
          <ul className="space-y-2 mt-2">
            {[
              { icon: Video, text: "Video-first product system — not classroom-based" },
              { icon: DollarSign, text: "Built for monetization from day one" },
              { icon: Zap, text: "Fast onboarding and content publishing" },
              { icon: HeadphonesIcon, text: "Integrated support & communication tools" },
              { icon: BarChart3, text: "Analytics and performance insights" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon size={14} className="text-primary shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </PolicyCard>

        <PolicyCard id="who-its-for" title="Who It's For">
          <p>Coursevia is designed for anyone who wants to <strong className="text-foreground">turn knowledge into income</strong> or access expert-led learning:</p>
          <div className="grid sm:grid-cols-2 gap-2 mt-3">
            {["Content creators", "Coaches & consultants", "Digital entrepreneurs", "Educators with practical skills", "Therapists & wellness professionals", "Anyone building a knowledge business"].map((item) => (
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
            {["Knowledge becomes a digital asset that generates lasting income", "Creators build real, sustainable businesses — not just side projects", "Learning becomes flexible, on-demand, and deeply personal", "Every expert in the world has a professional home online"].map((item) => (
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

      </main>
    </div>

    {/* ── CTA ── */}
    <section className="bg-primary text-primary-foreground">
      <div className="container-wide py-20 text-center">
        <motion.div {...fadeUp()}>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start Your Journey</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg max-w-xl mx-auto">
            Whether you're here to learn or to build your own digital product business — Coursevia gives you the tools to succeed.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild className="rounded-full px-8 bg-white text-primary hover:bg-white/90">
              <Link to="/courses">🚀 Explore Courses</Link>
            </Button>
            <Button size="lg" asChild className="rounded-full px-8 border-white/30 text-white hover:bg-white/10 bg-transparent border">
              <Link to="/signup">💼 Become a Creator</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>

  </div>
);

export default About;
