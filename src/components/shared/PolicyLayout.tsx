import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Link } from "react-router-dom";

interface Section {
  id: string;
  title: string;
}

interface PolicyLayoutProps {
  title: string;
  subtitle?: string;
  description: string;
  badge?: string;
  sections: Section[];
  children: React.ReactNode;
  ctaTitle?: string;
  ctaDesc?: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
}

export const PolicyCard = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.div
    id={id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
    className="bg-white dark:bg-card rounded-2xl border border-[#EAEAEA] dark:border-border shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-7 scroll-mt-24"
  >
    <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b border-border">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
  </motion.div>
);

const PolicyLayout = ({
  title, subtitle, description, badge, sections, children,
  ctaTitle, ctaDesc, ctaPrimary, ctaSecondary,
}: PolicyLayoutProps) => {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveId(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen bg-background">
      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50"
        style={{ scaleX }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          {badge && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-5">
              {badge}
            </span>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-3">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>}
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">{description}</p>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 flex gap-8 items-start">

        {/* Sticky side nav */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-8 self-start">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-3">Contents</p>
            {sections.map(({ id, title: t }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                  activeId === id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t}
              </a>
            ))}
          </div>
        </aside>

        {/* Cards */}
        <main className="flex-1 space-y-5 min-w-0">{children}</main>
      </div>

      {/* CTA */}
      {ctaTitle && (
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <h2 className="text-3xl font-bold mb-3">{ctaTitle}</h2>
            {ctaDesc && <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">{ctaDesc}</p>}
            <div className="flex flex-wrap justify-center gap-4">
              {ctaPrimary && (
                <Link to={ctaPrimary.href}
                  className="rounded-full bg-white text-primary font-semibold px-8 py-3 hover:bg-white/90 transition text-sm"
                >
                  {ctaPrimary.label}
                </Link>
              )}
              {ctaSecondary && (
                <Link to={ctaSecondary.href}
                  className="rounded-full border border-white/30 text-white font-semibold px-8 py-3 hover:bg-white/10 transition text-sm"
                >
                  {ctaSecondary.label}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default PolicyLayout;
