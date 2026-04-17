import { useEffect, useState } from "react";

const Preloader = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 300);
    const t2 = setTimeout(() => setPhase("exit"), 1800);
    const t3 = setTimeout(onDone, 2300);
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
        transform: phase === "exit" ? "scale(1.02)" : "scale(1)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        pointerEvents: phase === "exit" ? "none" : "all",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(16px)" : "translateY(0)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Logo icon — favicon with spinning ring, NO background box */}
        <div style={{ position: "relative", width: 72, height: 72 }}>
          {/* Spinning ring */}
          <div style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: "2.5px solid transparent",
            borderTopColor: "#10b981",
            borderRightColor: "rgba(16,185,129,0.25)",
            animation: "cv-spin 1s linear infinite",
          }} />

          {/* Favicon */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}>
            <img
              src="/favicon.ico"
              alt="Coursevia"
              style={{ width: 52, height: 52, objectFit: "contain" }}
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                const fallback = el.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            {/* Fallback letter */}
            <div style={{
              display: "none",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981, #059669)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
              color: "white",
              fontFamily: "system-ui, sans-serif",
            }}>C</div>
          </div>
        </div>

        {/* Brand name */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#111827",
            lineHeight: 1.1,
          }}>
            Coursevia
          </div>
          <div style={{
            marginTop: 4,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#10b981",
            fontFamily: "system-ui, sans-serif",
          }}>
            Learn · Grow · Connect
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: 140,
          height: 2,
          borderRadius: 99,
          background: "rgba(16,185,129,0.15)",
          overflow: "hidden",
          marginTop: 4,
        }}>
          <div style={{
            height: "100%",
            borderRadius: 99,
            background: "linear-gradient(90deg, #10b981, #059669)",
            width: phase === "hold" || phase === "exit" ? "100%" : "0%",
            transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>
      </div>

      <style>{`
        @keyframes cv-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Preloader;
