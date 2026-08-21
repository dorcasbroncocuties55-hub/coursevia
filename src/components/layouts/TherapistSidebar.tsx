import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ClipboardList,
  MessageSquare,
  Wallet,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getInitials } from "@/lib/portalEngine";

// ── Figma-exact Coursevia brand tokens ─────────────────────────────────────────
const S = {
  bg: "#0F3D2E",   // sidebar dark green
  accent: "#2D9E6B",   // Coursevia primary green
  activeBg: "rgba(255,255,255,0.08)",
  hover: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.12)",
  dim: "rgba(255,255,255,0.65)",
  full: "#FFFFFF",
};

// Figma nav: Dashboard, Patients, Books, Session Notes, Messages, Wallet, Payouts, Settings
const NAV = [
  { href: "/therapist/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/therapist/clients", label: "Patients", icon: Users },
  { href: "/therapist/services", label: "Services", icon: ClipboardList },
  { href: "/therapist/bookings", label: "Books", icon: CalendarCheck },
  { href: "/therapist/sessions", label: "Session Notes", icon: ClipboardList },
  { href: "/therapist/messages", label: "Messages", icon: MessageSquare },
  { href: "/therapist/wallet", label: "Wallet", icon: Wallet },
  { href: "/therapist/withdrawals", label: "Payouts", icon: CreditCard },
  { href: "/therapist/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/therapist/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/therapist/clients", label: "Patients", icon: Users },
  { href: "/therapist/bookings", label: "Books", icon: CalendarCheck },
  { href: "/therapist/messages", label: "Messages", icon: MessageSquare },
  { href: "/therapist/settings", label: "Settings", icon: Settings },
];

export default function TherapistSidebar() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const initials = getInitials(profile?.full_name);

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{ width: 220, minHeight: "100vh", background: S.bg, padding: "24px 16px", gap: 0 }}
      >
        {/* Logo — Figma exact */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, height: 40, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, background: S.accent, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>CV</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 15, color: S.full, whiteSpace: "nowrap" }}>
              Coursevia
            </span>
            <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 400, fontSize: 11, color: S.dim, whiteSpace: "nowrap" }}>
              Therapist Portal
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location.pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                style={{
                  position: "relative", display: "flex", alignItems: "center", gap: 12,
                  padding: "0 12px", height: 44, borderRadius: 12,
                  background: active ? S.activeBg : "transparent",
                  textDecoration: "none", transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = S.hover; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {/* Figma active-accent bar */}
                {active && (
                  <span style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
                    background: S.accent, borderRadius: "12px 0 0 12px"
                  }} />
                )}
                <Icon size={18} style={{ color: active ? S.full : S.dim, flexShrink: 0, zIndex: 1 }} />
                <span style={{
                  fontFamily: "Inter,sans-serif", fontWeight: active ? 600 : 400,
                  fontSize: 14, color: active ? S.full : S.dim, whiteSpace: "nowrap", zIndex: 1
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User footer — data from DB via AuthContext */}
        <div style={{
          borderTop: `1px solid ${S.border}`, paddingTop: 14, display: "flex",
          flexDirection: "column", gap: 8
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar style={{ width: 36, height: 36, flexShrink: 0 }}>
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback style={{ background: S.accent, color: "#fff", fontSize: 12, fontWeight: 700 }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: S.full,
                margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {profile?.full_name || "Therapist"}
              </p>
              <p style={{
                fontFamily: "Inter,sans-serif", fontSize: 11, color: S.dim,
                margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {profile?.email || ""}
              </p>
            </div>
          </div>
          <button onClick={handleSignOut}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
              borderRadius: 8, border: "none", background: "transparent", cursor: "pointer",
              width: "100%", transition: "background 0.12s"
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <LogOut size={15} style={{ color: S.dim }} />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: S.dim }}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ───────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ background: S.bg, borderTop: `1px solid ${S.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 8px" }}>
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = location.pathname.startsWith(href);
            return (
              <Link key={href} to={href}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 2, padding: "4px 8px", textDecoration: "none"
                }}>
                <Icon size={20} style={{ color: active ? S.accent : S.dim }} />
                <span style={{
                  fontFamily: "Inter,sans-serif", fontSize: 10,
                  color: active ? S.full : S.dim, fontWeight: active ? 600 : 400
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
