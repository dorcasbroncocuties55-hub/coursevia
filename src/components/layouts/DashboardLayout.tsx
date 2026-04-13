import { type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { roleToDashboardPath } from "@/lib/authRoles";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BookOpen,
  Video,
  Calendar,
  MessageSquare,
  Bell,
  CreditCard,
  Heart,
  Settings,
  User,
  Wallet,
  Users,
  FileText,
  Shield,
  Flag,
  BarChart3,
  LogOut,
  ArrowDownCircle,
} from "lucide-react";

type Role = "learner" | "coach" | "creator" | "therapist" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const learnerNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "My Videos", href: "/dashboard/videos", icon: Video },
  { label: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Payment Methods", href: "/dashboard/payment-methods", icon: Wallet },
  { label: "Subscription", href: "/dashboard/subscription", icon: FileText },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

const coachNav: NavItem[] = [
  { label: "Dashboard", href: "/coach/dashboard", icon: LayoutDashboard },
  { label: "Profile", href: "/coach/profile", icon: User },
  { label: "Services", href: "/coach/services", icon: BookOpen },
  { label: "Upload Video", href: "/coach/upload-video", icon: Video },
  { label: "Content", href: "/coach/content", icon: BookOpen },
  { label: "Calendar", href: "/coach/calendar", icon: Calendar },
  { label: "Bookings", href: "/coach/bookings", icon: Calendar },
  { label: "Clients", href: "/coach/clients", icon: Users },
  { label: "Sessions", href: "/coach/sessions", icon: Video },
  { label: "Messages", href: "/coach/messages", icon: MessageSquare },
  { label: "Wallet", href: "/coach/wallet", icon: Wallet },
  { label: "Withdrawals", href: "/coach/withdrawals", icon: CreditCard },
  { label: "Reviews", href: "/coach/reviews", icon: FileText },
  { label: "Bank Accounts", href: "/coach/bank-accounts", icon: Wallet },
  { label: "Profile Settings", href: "/coach/profile-settings", icon: Settings },
];

const therapistNav: NavItem[] = [
  { label: "Dashboard", href: "/therapist/dashboard", icon: LayoutDashboard },
  { label: "Profile", href: "/therapist/profile", icon: User },
  { label: "Services", href: "/therapist/services", icon: BookOpen },
  { label: "Upload Video", href: "/therapist/upload-video", icon: Video },
  { label: "Content", href: "/therapist/content", icon: BookOpen },
  { label: "Calendar", href: "/therapist/calendar", icon: Calendar },
  { label: "Bookings", href: "/therapist/bookings", icon: Calendar },
  { label: "Clients", href: "/therapist/clients", icon: Users },
  { label: "Sessions", href: "/therapist/sessions", icon: Video },
  { label: "Messages", href: "/therapist/messages", icon: MessageSquare },
  { label: "Wallet", href: "/therapist/wallet", icon: Wallet },
  { label: "Withdrawals", href: "/therapist/withdrawals", icon: CreditCard },
  { label: "Bank Accounts", href: "/therapist/bank-accounts", icon: Wallet },
  { label: "Profile Settings", href: "/therapist/profile-settings", icon: Settings },
];

const creatorNav: NavItem[] = [
  { label: "Dashboard", href: "/creator/dashboard", icon: LayoutDashboard },
  { label: "Upload Video", href: "/creator/upload-video", icon: Video },
  { label: "Content", href: "/creator/content", icon: BookOpen },
  { label: "Analytics", href: "/creator/analytics", icon: BarChart3 },
  { label: "Messages", href: "/creator/messages", icon: MessageSquare },
  { label: "Wallet", href: "/creator/wallet", icon: Wallet },
  { label: "Withdrawals", href: "/creator/withdrawals", icon: CreditCard },
  { label: "Bank Accounts", href: "/creator/bank-accounts", icon: Wallet },
  { label: "Profile Settings", href: "/creator/profile-settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { label: "Dashboard",    href: "/admin/dashboard",    icon: LayoutDashboard },
  { label: "Users",        href: "/admin/users",         icon: Users },
  { label: "Coaches",      href: "/admin/coaches",       icon: User },
  { label: "Creators",     href: "/admin/creators",      icon: User },
  { label: "Payments",     href: "/admin/payments",      icon: CreditCard },
  { label: "Wallet",       href: "/admin/wallet",        icon: Wallet },
  { label: "Bank Accounts",href: "/admin/bank-accounts", icon: Wallet },
  { label: "Withdrawals",  href: "/admin/withdrawals",   icon: ArrowDownCircle },
  { label: "Transactions", href: "/admin/transactions",  icon: FileText },
  { label: "KYC",          href: "/admin/kyc",           icon: Shield },
  { label: "Reports",      href: "/admin/reports",       icon: Flag },
  { label: "Content",      href: "/admin/content",       icon: BookOpen },
  { label: "Categories",   href: "/admin/categories",    icon: BarChart3 },
  { label: "Settings",     href: "/admin/settings",      icon: Settings },
];

interface DashboardLayoutProps {
  children: ReactNode;
  role: Role;
}

const DashboardLayout = ({ children, role }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, profile } = useAuth();

  const navMap = { learner: learnerNav, coach: coachNav, creator: creatorNav, therapist: therapistNav, admin: adminNav };
  const nav = navMap[role];
  const homeHref = roleToDashboardPath(role);

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Fixed Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden lg:flex flex-col fixed left-0 top-0 h-screen z-10">
        <div className="p-4 border-b border-border">
          <Link to={homeHref} className="text-lg font-bold text-primary">Coursevia</Link>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{role} Dashboard</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile?.full_name || "Avatar"} className="h-8 w-8 rounded-full object-cover border border-border" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                {(profile?.full_name || profile?.email || "User")[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || profile?.email || "User"}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to={homeHref} className="text-lg font-bold text-primary">Coursevia</Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground capitalize">{role}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-destructive hover:text-destructive">
              <LogOut size={16} className="mr-1" /> Sign out
            </Button>
          </div>
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1 scrollbar-hide">
          {nav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Area - with left margin to account for fixed sidebar */}
      <main className="flex-1 lg:ml-64 lg:p-8 p-4 pt-28 lg:pt-8 min-h-screen">{children}</main>
    </div>
  );
};

export default DashboardLayout;
