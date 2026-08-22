import { useState, useEffect } from "react";
import { X, Sparkles, Heart, BookOpen, Users, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Role-specific configurations (all using brand color #2D9E6B)
const ROLE_CONFIGS = {
  coach: {
    gradient: "linear-gradient(135deg, #2D9E6B 0%, #1A7A4D 100%)",
    icon: Users,
    message: "Your coaching journey starts now. Inspire and guide others!",
    emoji: "🎯"
  },
  therapist: {
    gradient: "linear-gradient(135deg, #2D9E6B 0%, #1A7A4D 100%)",
    icon: Heart,
    message: "Your therapy practice is ready. Make a difference in lives!",
    emoji: "💜"
  },
  creator: {
    gradient: "linear-gradient(135deg, #2D9E6B 0%, #1A7A4D 100%)",
    icon: BookOpen,
    message: "Your creator studio awaits. Share your knowledge with the world!",
    emoji: "🚀"
  },
  learner: {
    gradient: "linear-gradient(135deg, #2D9E6B 0%, #1A7A4D 100%)",
    icon: GraduationCap,
    message: "Your learning adventure begins! Explore endless possibilities!",
    emoji: "🎓"
  }
};

export default function WelcomeBanner() {
  const { profile } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if user just completed onboarding
    const justOnboarded = sessionStorage.getItem('just_onboarded');

    if (justOnboarded === 'true') {
      setShouldShow(true);
      setIsVisible(true);

      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        sessionStorage.removeItem('just_onboarded');
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.removeItem('just_onboarded');
  };

  if (!shouldShow || !isVisible) return null;

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const role = (profile?.role || "learner") as keyof typeof ROLE_CONFIGS;

  // Don't show banner for admin or judge
  if (role === 'admin' || role === 'judge') return null;

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.learner;
  const Icon = config.icon;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        maxWidth: 600,
        width: "calc(100% - 40px)",
        animation: "slideDown 0.5s ease-out",
      }}
    >
      <div
        style={{
          background: config.gradient,
          borderRadius: 16,
          padding: "20px 24px",
          boxShadow: "0 10px 40px rgba(45, 158, 107, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          position: "relative",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "rgba(255, 255, 255, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={24} color="#FFFFFF" />
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#FFFFFF",
              margin: 0,
              marginBottom: 4,
            }}
          >
            Welcome to Coursevia, {firstName}! {config.emoji}
          </h3>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              color: "rgba(255, 255, 255, 0.9)",
              margin: 0,
            }}
          >
            {config.message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: 8,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          }}
        >
          <X size={16} color="#FFFFFF" />
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}
