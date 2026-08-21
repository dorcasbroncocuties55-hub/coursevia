import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  Users,
  BookOpen,
  CalendarDays,
  Video,
  MessageSquare,
  Wallet,
  CreditCard,
  Settings,
  FileText,
  Star,
  LogOut,
  BriefcaseBusiness,
  RotateCcw,
  ArrowDownCircle,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

export type CoachPage =
  | "dashboard"
  | "clients"
  | "bookings"
  | "calendar"
  | "sessions"
  | "messages"
  | "wallet"
  | "withdrawals"
  | "services"
  | "content"
  | "reviews"
  | "profile"
  | "refunds"
  | "invite"
  | "bank-accounts"
  | "profile-settings";

interface CoachSidebarProps {
  activePage: CoachPage;
}

const navItems = [
  { key: "dashboard",        label: "Dashboard",         href: "/coach/dashboard",         icon: Home },
  { key: "clients",          label: "Clients",           href: "/coach/clients",           icon: Users },
  { key: "bookings",         label: "Bookings",          href: "/coach/bookings",          icon: BookOpen },
  { key: "calendar",         label: "Calendar",          href: "/coach/calendar",          icon: CalendarDays },
  { key: "sessions",         label: "Sessions",          href: "/coach/sessions",          icon: Video },
  { key: "messages",         label: "Messages",          href: "/coach/messages",          icon: MessageSquare },
  { key: "wallet",           label: "Wallet",            href: "/coach/wallet",            icon: Wallet },
  { key: "withdrawals",      label: "Payout",            href: "/coach/withdrawals",       icon: CreditCard },
  { key: "services",         label: "Services",          href: "/coach/services",          icon: FileText },
  { key: "content",          label: "Content",           href: "/coach/content",           icon: BarChart3 },
  { key: "reviews",          label: "Reviews",           href: "/coach/reviews",           icon: Star },
  { key: "refunds",          label: "Refunds",           href: "/coach/refunds",           icon: RotateCcw },
  { key: "invite",           label: "Invite Friends",    href: "/coach/invite",            icon: UserPlus },
  { key: "bank-accounts",    label: "Bank Accounts",     href: "/coach/bank-accounts",     icon: ArrowDownCircle },
  { key: "profile-settings", label: "Profile Settings",  href: "/coach/profile-settings",  icon: Settings },
] as const;

// Bottom mobile nav — the 5 most important items
const mobileNavItems = [
  { key: "dashboard",  label: "Dashboard",  href: "/coach/dashboard",  icon: Home },
  { key: "clients",    label: "Clients",    href: "/coach/clients",    icon: Users },
  { key: "bookings",   label: "Bookings",   href: "/coach/bookings",   icon: BookOpen },
  { key: "messages",   label: "Messages",   href: "/coach/messages",   icon: MessageSquare },
  { key: "profile-settings", label: "Settings", href: "/coach/profile-settings", icon: Settings },
] as const;

const CoachSidebar = ({ activePage }: CoachSidebarProps) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("") || "C";

  return (
    <>
      {/* ── Desktop Sidebar 260px ── */}
      <div className="hidden lg:flex w-[260px] bg-white shadow-lg flex-shrink-0 flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BriefcaseBusiness className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">CoachHub</h1>
              <p className="text-xs text-gray-500">coach portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-4 flex-1 overflow-y-auto">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = item.key === activePage;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-gray-200 shrink-0">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? "Coach"} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || "Coach"}
              </p>
              <p className="text-xs text-gray-500 truncate">{profile?.email || ""}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const isActive = item.key === activePage;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.href}
                className={`flex flex-col items-center py-1 px-2 ${
                  isActive ? "text-primary" : "text-gray-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default CoachSidebar;
