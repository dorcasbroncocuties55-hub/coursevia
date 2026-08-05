import { useEffect, useState } from "react";
import { GraduationCap, Video, HeartHandshake, Sparkles, CheckCircle2 } from "lucide-react";

type RoleOption = "learner" | "creator" | "coach" | "therapist";

interface OnboardingWelcomeProps {
  name: string;
  role: RoleOption;
  onFinished: () => void;
}

const ROLE_CONFIG: Record<RoleOption, {
  icon: React.ElementType;
  color: string;
  ringColor: string;
  bgGradient: string;
  particleColor: string;
  title: string;
  subtitle: string;
  items: string[];
}> = {
  learner: {
    icon: GraduationCap,
    color: "text-emerald-600",
    ringColor: "ring-emerald-400",
    bgGradient: "from-emerald-50 via-white to-teal-50",
    particleColor: "bg-emerald-400",
    title: "Welcome to Coursevia",
    subtitle: "Your learning journey starts now.",
    items: ["Browse videos & courses", "Book sessions with coaches", "Connect with therapists"],
  },
  creator: {
    icon: Video,
    color: "text-purple-600",
    ringColor: "ring-purple-400",
    bgGradient: "from-purple-50 via-white to-pink-50",
    particleColor: "bg-purple-400",
    title: "Your creator studio is ready",
    subtitle: "Start sharing your expertise with the world.",
    items: ["Upload videos & courses", "Reach thousands of learners", "Earn from your content"],
  },
  coach: {
    icon: Sparkles,
    color: "text-blue-600",
    ringColor: "ring-blue-400",
    bgGradient: "from-blue-50 via-white to-cyan-50",
    particleColor: "bg-blue-400",
    title: "Your coaching profile is live",
    subtitle: "Clients can now find and book you.",
    items: ["Set your services & availability", "Accept bookings from clients", "Grow your practice"],
  },
  therapist: {
    icon: HeartHandshake,
    color: "text-rose-600",
    ringColor: "ring-rose-400",
    bgGradient: "from-rose-50 via-white to-orange-50",
    particleColor: "bg-rose-400",
    title: "Your therapy profile is live",
    subtitle: "You're ready to support your clients.",
    items: ["Manage your services", "Accept session bookings", "Build your client base"],
  },
};

// Floating particle
const Particle = ({
  color,
  style,
}: {
  color: string;
  style: React.CSSProperties;
}) => (
  <div
    className={`absolute rounded-full opacity-0 ${color}`}
    style={style}
  />
);

export const OnboardingWelcome = ({ name, role, onFinished }: OnboardingWelcomeProps) => {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.learner;
  const Icon = config.icon;

  // Animation phases: 0=hidden → 1=icon → 2=text → 3=items → 4=fadeout
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),    // icon bounces in
      setTimeout(() => setPhase(2), 1000),   // name + title slide up
      setTimeout(() => setPhase(3), 2000),   // checklist items appear
      setTimeout(() => setPhase(4), 11000),  // whole screen fades out
      setTimeout(() => onFinished(), 12000), // redirect fires
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const firstName = name?.split(" ")[0] || "there";

  return (
    <div
      className={`
        fixed inset-0 z-[9999] flex flex-col items-center justify-center
        bg-gradient-to-br ${config.bgGradient}
        transition-opacity duration-700 ease-in-out
        ${phase === 4 ? "opacity-0" : "opacity-100"}
      `}
    >
      {/* Floating background particles */}
      {[...Array(12)].map((_, i) => (
        <Particle
          key={i}
          color={config.particleColor}
          style={{
            width: `${6 + (i % 4) * 4}px`,
            height: `${6 + (i % 4) * 4}px`,
            top: `${10 + (i * 7.5) % 80}%`,
            left: `${5 + (i * 8.3) % 90}%`,
            animation: `floatParticle ${3 + (i % 3)}s ease-in-out ${i * 0.25}s infinite alternate`,
            opacity: phase >= 1 ? 0.25 : 0,
            transition: `opacity 1s ease ${i * 0.1}s`,
          }}
        />
      ))}

      {/* Card */}
      <div className="relative flex flex-col items-center gap-6 px-8 text-center max-w-md w-full">

        {/* Icon circle */}
        <div
          className={`
            flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-xl
            ring-4 ${config.ringColor}
            transition-all duration-700 ease-out
            ${phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-50"}
          `}
        >
          <Icon className={`w-12 h-12 ${config.color}`} />
        </div>

        {/* Greeting + title */}
        <div
          className={`
            space-y-2
            transition-all duration-600 ease-out
            ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Account ready
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Hey {firstName}!
          </h1>
          <p className="text-xl font-semibold text-slate-700">{config.title}</p>
          <p className="text-sm text-slate-500">{config.subtitle}</p>
        </div>

        {/* Checklist items */}
        <div className="w-full space-y-3">
          {config.items.map((item, i) => (
            <div
              key={item}
              className={`
                flex items-center gap-3 rounded-2xl bg-white/80 border border-slate-100
                shadow-sm px-4 py-3 text-left
                transition-all duration-500 ease-out
                ${phase >= 3 ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}
              `}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <CheckCircle2 className={`w-5 h-5 shrink-0 ${config.color}`} />
              <span className="text-sm font-medium text-slate-700">{item}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden mt-2">
          <div
            className={`h-full rounded-full ${config.particleColor} transition-all duration-[3000ms] ease-linear`}
            style={{ width: phase >= 3 ? "100%" : "0%" }}
          />
        </div>

        <p className="text-xs text-slate-400 animate-pulse">Taking you to your dashboard…</p>
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes floatParticle {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-20px) scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default OnboardingWelcome;
