import { motion } from "framer-motion";
import { BookOpen, Users, Video, Wallet, Shield, MessageSquare } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Course Marketplace",
    description: "Discover high-quality courses from verified professionals across practical and in-demand categories.",
  },
  {
    icon: Users,
    title: "Expert Coaching",
    description: "Book one-to-one sessions with qualified coaches and receive focused guidance tailored to your goals.",
  },
  {
    icon: Video,
    title: "Premium Video Content",
    description: "Access high-quality educational content designed for real-world learning, flexible viewing, and premium delivery.",
  },
  {
    icon: Wallet,
    title: "Secure Payments",
    description: "Seamlessly manage payments, subscriptions, earnings, and withdrawals through a reliable and transparent payment experience.",
  },
  {
    icon: Shield,
    title: "Verified & Trusted",
    description: "Providers are reviewed before approval so learners can engage with greater confidence.",
  },
  {
    icon: MessageSquare,
    title: "Professional Messaging",
    description: "Communicate safely inside the platform with structured conversations built for serious collaboration.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="section-spacing bg-secondary/50">
      <div className="container-wide">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Everything you need to learn, teach, and grow
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            One platform that brings together content, coaching, messaging, and secure payments in a professional experience.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <feature.icon className="text-primary" size={20} />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
