import { motion } from "framer-motion";
import { PlayCircle, Video, MessageSquare, Sparkles } from "lucide-react";

const promoVideo = "/coursevia-brand-promo.mp4";

const highlights = [
  {
    icon: Video,
    title: "Premium video learning",
    text: "Showcase focused lessons, premium content, and a smoother learning journey in one place.",
  },
  {
    icon: MessageSquare,
    title: "Sessions and messaging",
    text: "Highlight how learners can connect with coaches and therapists beyond static course content.",
  },
  {
    icon: Sparkles,
    title: "A better platform overview",
    text: "Give visitors a clear introduction without crowding the homepage hero area.",
  },
];

const PromoVideoSection = () => {
  return (
    <section className="bg-background py-16 lg:py-20">
      <div className="container-wide">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
            className="space-y-5"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-primary shadow-sm">
              <PlayCircle size={16} />
              Platform walkthrough
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                See how Coursevia works without crowding the hero section.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                This quick overview gives visitors a fitting place to watch the platform in action after they understand the main value of courses, coaching, and guided wellness.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {highlights.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon size={18} />
                  </div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl"
          >
            <div className="border-b border-border px-5 py-4">
              <p className="text-base font-semibold text-foreground">Coursevia brand overview</p>
              <p className="text-sm text-muted-foreground">
                A quick homepage video introducing learning, sessions, messaging, and premium content.
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <video
                className="aspect-video w-full rounded-2xl bg-black object-cover"
                src={promoVideo}
                controls
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PromoVideoSection;
