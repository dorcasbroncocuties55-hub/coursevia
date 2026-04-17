import { useEffect, useState } from "react";

const Preloader = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("exit"), 2000);
    const t3 = setTimeout(onDone, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        opacity: phase === "exit" ? 0 : 1,
        transform: phase === "exit" ? "scale(1.03)" : "scale(1)",
        transition: "opacity 0.55s ease, transform 0.55s ease",
        pointerEvents: phase === "exit" ? "none" : "all",
      }}
    >
      {/* Soft radial glow behind logo */}
      <div style={{
        position: "absolute",
        width: 420,
        height: 420,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(20px)" : "translateY(0)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        {/* favicon.ico as the icon */}
        <div style={{ position: "relative" }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 22,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px rgba(16,185,129,0.35), 0 4px 16px rgba(16,185,129,0.2)",
          }}>
            <img
              src="/favicon.ico"
              alt="Coursevia"
              style={{ width: 44, height: 44, objectFit: "contain" }}
              onError={(e) => {
                // fallback: show "C" letter if favicon fails
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Fallback "C" shown via CSS if image fails */}
            <span style={{
              position: "absolute",
              fontSize: 36,
              fontWeight: 900,
              color: "white",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1,
              display: "none",
            }} className="favicon-fallback">C</span>
          </div>

          {/* Spinning ring */}
          <div style={{
            position: "absolute",
            inset: -6,
            borderRadius: 28,
            border: "2.5px solid transparent",
            borderTopColor: "#10b981",
            borderRightColor: "rgba(16,185,129,0.3)",
            animation: "coursevia-spin 1.1s linear infinite",
          }} />

          {/* Glow pulse */}
          <div style={{
            position: "absolute",
            inset: -2,
            borderRadius: 24,
            background: "linear-gradient(135deg, #10b981, #059669)",
            opacity: 0.25,
            filter: "blur(14px)",
            animation: "coursevia-pulse 1.8s ease-in-out infinite",
          }} />
        </div>

        {/* Brand name — exactly as in Navbar */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            fontFamily: "system-ui, -apple-system, sans-serif",
            background: "linear-gradient(135deg, #111827 0%, #10b981 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.1,
          }}>
            Coursevia
          </div>
          <div style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#6ee7b7",
            fontFamily: "system-ui, sans-serif",
          }}>
            Learn · Grow · Connect
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: 160,
          height: 3,
          borderRadius: 99,
          background: "rgba(16,185,129,0.15)",
          overflow: "hidden",
          marginTop: 4,
        }}>
          <div style={{
            height: "100%",
            borderRadius: 99,
            background: "linear-gradient(90deg, #10b981, #059669)",
            boxShadow: "0 0 10px rgba(16,185,129,0.6)",
            width: phase === "hold" || phase === "exit" ? "100%" : "0%",
            transition: "width 1.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>

        {/* Bouncing dots */}
        <div style={{ display: "flex", gap: 6, marginTop: -4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#10b981",
              opacity: 0.6,
              animation: `coursevia-bounce 0.9s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
      </div>

      {/* Keyframes injected inline */}
      <style>{`
        @keyframes coursevia-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes coursevia-pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        @keyframes coursevia-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default Preloader;
