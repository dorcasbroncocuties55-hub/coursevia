import { useEffect, useState } from "react";

const Preloader = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // enter → hold after 600ms, hold → exit after 2000ms, then call onDone
    const t1 = setTimeout(() => setPhase("hold"), 600);
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    const t3 = setTimeout(onDone, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #111827 50%, #0a0a0a 100%)",
        opacity: phase === "exit" ? 0 : 1,
        transform: phase === "exit" ? "scale(1.04)" : "scale(1)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
        pointerEvents: phase === "exit" ? "none" : "all",
      }}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{ background: "radial-gradient(circle, #10b981, transparent)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl animate-pulse"
        style={{ background: "radial-gradient(circle, #0d9488, transparent)", animationDelay: "0.8s" }} />

      {/* Main content */}
      <div
        className="relative z-10 flex flex-col items-center gap-6"
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(24px)" : "translateY(0)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        {/* Logo mark */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M8 20C8 13.373 13.373 8 20 8s12 5.373 12 12-5.373 12-12 12S8 26.627 8 20z"
                stroke="white" strokeWidth="2.5" fill="none" />
              <path d="M14 20l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Spinning ring */}
          <div className="absolute -inset-2 rounded-[28px] border-2 border-transparent animate-spin"
            style={{
              borderTopColor: "#10b981",
              borderRightColor: "transparent",
              borderBottomColor: "transparent",
              borderLeftColor: "transparent",
              animationDuration: "1.2s",
            }}
          />
          {/* Glow */}
          <div className="absolute inset-0 rounded-3xl blur-xl opacity-60"
            style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }} />
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #d1fae5 40%, #10b981 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Coursevia
          </h1>
          <p className="mt-2 text-sm font-medium tracking-[0.3em] uppercase"
            style={{ color: "#6ee7b7" }}>
            Learn · Grow · Connect
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #10b981, #0d9488)",
              width: phase === "hold" || phase === "exit" ? "100%" : "0%",
              transition: "width 1.4s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 0 12px #10b981",
            }}
          />
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                background: "#10b981",
                animationDelay: `${i * 0.15}s`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Preloader;
