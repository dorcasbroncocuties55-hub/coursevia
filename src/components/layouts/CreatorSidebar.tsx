import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Users,
  BarChart3,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getInitials } from "@/lib/portalEngine";

// ── Figma-exact Creator Portal brand tokens (Indigo theme) ────────────────────
const S = {
  bg: "#FFFFFF",           // sidebar white
  accent: "#4F46E5",       // indigo primary
  activeBg: "#EEF2FF",     // indigo-50
  hover: "#F5F7FF",        // lighter hover
  border: "#E2E8F0",       // slate-200
  dim: "#64748B",          // slate-500
  full: "#0F172A",         // slate-900
};

// Figma nav: Dashboard, My Courses, Create Course, Students, Analytics, Revenue, Messages, Settings
const NAV = [
  { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creator/courses", label: "My Courses", icon: BookOpen },
  { href: "/creator/create-course", label: "Create Course", icon: PlusCircle },
  { href: "/creator/students", label: "Students", icon: Users },
  { href: "/creator/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/creator/revenue", label: "Revenue", icon: DollarSign },
  { href: "/creator/messages", label: "Messages", icon: MessageSquare },
  { href: "/creator/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creator/courses", label: "Courses", icon: BookOpen },
  { href: "/creator/students", label: "Students", icon: Users },
  { href: "/creator/messages", label: "Messages", icon: MessageSquare },
  { href: "/creator/settings", label: "Settings", icon: Settings },
];

export default function CreatorSidebar() {
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
        style={{
          width: 260,
          minHeight: "100vh",
          maxHeight: "100vh",
          background: S.bg,
          borderRight: `1px solid ${S.border}`,
          padding: "24px 16px",
          gap: 0,
          position: "sticky",
          top: 0,
          overflowY: "auto",
          overflowX: "hidden"
        }}
      >
        {/* Logo — Figma exact with graduation cap */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, height: 40, marginBottom: 32 }}>
          <div style={{
            width: 40,
            height: 40,
            background: S.accent,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <GraduationCap size={22} style={{ color: "#FFFFFF" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{
              fontFamily: "Inter,sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: S.full,
              whiteSpace: "nowrap"
            }}>
              EduCraft
            </span>
            <span style={{
              fontFamily: "Inter,sans-serif",
              fontWeight: 500,
              fontSize: 12,
              color: S.dim,
              whiteSpace: "nowrap"
            }}>
              Creator Hub
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location.pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "0 14px",
                  height: 48,
                  borderRadius: 10,
                  background: active ? S.activeBg : "transparent",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = S.hover;
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {/* Figma active-accent bar (left edge) */}
                {active && (
                  <span style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: S.accent,
                    borderRadius: "10px 0 0 10px"
                  }} />
                )}
                <Icon
                  size={20}
                  style={{
                    color: active ? S.accent : S.dim,
                    flexShrink: 0,
                    zIndex: 1
                  }}
                />
                <span style={{
                  fontFamily: "Inter,sans-serif",
                  fontWeight: active ? 600 : 500,
                  fontSize: 15,
                  color: active ? S.accent : S.dim,
                  whiteSpace: "nowrap",
                  zIndex: 1
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User footer — data from DB via AuthContext */}
        <div style={{
          borderTop: `1px solid ${S.border}`,
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar style={{ width: 40, height: 40, flexShrink: 0 }}>
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback style={{
                background: S.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600
              }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: S.full,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {profile?.full_name || "Creator"}
              </p>
              <p style={{
                fontFamily: "Inter,sans-serif",
                fontSize: 12,
                color: S.dim,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {profile?.email || ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              width: "100%",
              transition: "background 0.15s"
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = S.hover;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <LogOut size={16} style={{ color: S.dim }} />
            <span style={{
              fontFamily: "Inter,sans-serif",
              fontSize: 14,
              color: S.dim,
              fontWeight: 500
            }}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ───────────────────────────────────────────────── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: S.bg,
          borderTop: `1px solid ${S.border}`,
          boxShadow: "0 -2px 10px rgba(0,0,0,0.05)"
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "8px 12px"
        }}>
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = location.pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "6px 10px",
                  textDecoration: "none",
                  minWidth: 60
                }}
              >
                <Icon size={22} style={{ color: active ? S.accent : S.dim }} />
                <span style={{
                  fontFamily: "Inter,sans-serif",
                  fontSize: 11,
                  color: active ? S.accent : S.dim,
                  fontWeight: active ? 600 : 500
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
