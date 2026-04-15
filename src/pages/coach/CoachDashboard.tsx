import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Wallet, Users, MessageSquare, Star, User, Shield, Video } from "lucide-react";
import { getServiceModeLabel } from "@/lib/providerModes";
import { countProviderServices, countUnreadMessages, getProviderRecord, safeSingle } from "@/lib/dashboardQueries";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatusIndicator } from "@/components/dashboard/StatusIndicator";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ScrollableContent } from "@/components/ui/scrollable-content";
import { PageLoading } from "@/components/LoadingSpinner";

const CoachDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, balance: 0, services: 0, messages: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ✅ Handle auth loading state
  if (authLoading) {
    return <PageLoading />;
  }

  // ✅ Handle no user
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    // ✅ user is now guaranteed to be non-null
    const run = async () => {
      setDataLoading(true);
      const [bookingRes, walletRes, providerRow, unread, bookingsData] = await Promise.all([
        safeSingle<any>(supabase.from("bookings").select("id", { count: "exact", head: true }).or(`provider_id.eq.${user.id},provider_user_id.eq.${user.id}`), { count: 0 }),
        safeSingle<any>(supabase.from("wallets").select("balance,available_balance").eq("user_id", user.id).maybeSingle(), { balance: 0 }),
        getProviderRecord("coach", user.id),
        countUnreadMessages(user.id),
        supabase.from("bookings").select("id,status,scheduled_at,notes,learner_id").or(`provider_id.eq.${user.id},provider_user_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(5),
      ]);

      const pid = providerRow?.id || null;
      const svcCount = await countProviderServices("coach", pid, user.id);

      setStats({
        bookings: Number(bookingRes?.count || 0),
        balance: Number(walletRes?.balance || 0),
        services: svcCount,
        messages: unread,
      });
      setRecentBookings(bookingsData.data || []);
      setDataLoading(false);
    };
    run();
  }, [user?.id]);

  const isVerified = (profile as any)?.is_verified || (profile as any)?.kyc_status === "approved";
  const kycStatus = (profile as any)?.kyc_status;
  const needsKyc = !isVerified && (!kycStatus || kycStatus === "not_started" || kycStatus === "pending_setup");
  const kycPending = kycStatus === "pending";
  
  const serviceMode = getServiceModeLabel((profile as any)?.service_delivery_mode);
  const displayName = profile?.full_name || "Coach";
  const firstName = displayName.split(" ")[0];

  const quickActions = [
    {
      label: "Edit Profile",
      href: "/coach/profile",
      description: "Update your bio, photo, and pricing",
      icon: User,
    },
    {
      label: "Manage Services",
      href: "/coach/services",
      description: "Add or edit your coaching services",
      icon: Star,
      badge: stats.services === 0 ? "Setup Required" : undefined,
      priority: stats.services === 0 ? "high" as const : "medium" as const,
    },
    {
      label: "Upload Video",
      href: "/coach/upload-video",
      description: "Share your expertise through video content",
      icon: Video,
    },
    {
      label: "View Calendar",
      href: "/coach/calendar",
      description: "Set your availability and manage appointments",
      icon: CalendarDays,
    },
    {
      label: "View Clients",
      href: "/coach/clients",
      description: "Manage your client relationships",
      icon: Users,
    },
    {
      label: "Request Withdrawal",
      href: "/coach/withdrawals",
      description: "Transfer earnings to your bank account",
      icon: Wallet,
      badge: stats.balance > 0 ? "Available" : undefined,
      priority: stats.balance > 0 ? "medium" as const : "low" as const,
    },
    {
      label: "Complete KYC",
      href: "/coach/kyc",
      description: "Verify your identity to unlock all features",
      icon: Shield,
      badge: needsKyc ? "Required" : kycPending ? "Pending" : undefined,
      priority: needsKyc ? "high" as const : "low" as const,
    },
  ];

  // Convert recent bookings to activity items
  const recentActivity = recentBookings.map(booking => ({
    id: booking.id,
    type: "booking" as const,
    title: booking.scheduled_at 
      ? `Session on ${new Date(booking.scheduled_at).toLocaleDateString()}`
      : "Instant Booking",
    description: booking.notes || "No additional notes",
    timestamp: booking.scheduled_at || new Date().toISOString(),
    status: booking.status === "confirmed" ? "success" as const :
            booking.status === "pending" ? "pending" as const : 
            "failed" as const,
    href: `/coach/bookings`
  }));

  return (
    <DashboardLayout role="coach">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <WelcomeBanner
          role="coach"
          userName={firstName}
          subtitle={isVerified 
            ? "Your profile is verified and visible in the coach directory." 
            : "Complete your profile and KYC verification to appear in the coach directory."
          }
          isVerified={isVerified}
          gradient="blue"
          primaryAction={{
            label: "Edit Profile",
            href: "/coach/profile"
          }}
          secondaryAction={{
            label: "View Public Page",
            href: "/coaches"
          }}
        />

        {/* Status Indicators */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusIndicator
            label="Verification Status"
            status={isVerified ? "success" : "warning"}
            value={isVerified ? "Verified" : "Pending KYC"}
            description={isVerified ? "Identity verified" : "Complete verification to unlock features"}
          />
          <StatusIndicator
            label="Service Mode"
            status="success"
            value={serviceMode}
            description="How you deliver your services"
          />
          <StatusIndicator
            label="Profile Status"
            status={(profile as any)?.onboarding_completed ? "success" : "warning"}
            value={(profile as any)?.onboarding_completed ? "Active" : "Incomplete"}
            description="Profile completion status"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="Total Bookings"
            value={stats.bookings}
            description="All-time sessions"
            icon={<CalendarDays className="h-6 w-6" />}
            href="/coach/bookings"
            color="blue"
            loading={dataLoading}
          />
          <DashboardCard
            title="Wallet Balance"
            value={`$${stats.balance.toFixed(2)}`}
            description="Available earnings"
            icon={<Wallet className="h-6 w-6" />}
            href="/coach/wallet"
            color="green"
            loading={dataLoading}
          />
          <DashboardCard
            title="Active Services"
            value={stats.services}
            description="Bookable services"
            icon={<Star className="h-6 w-6" />}
            href="/coach/services"
            color="purple"
            loading={dataLoading}
          />
          <DashboardCard
            title="Unread Messages"
            value={stats.messages}
            description="Client messages"
            icon={<MessageSquare className="h-6 w-6" />}
            href="/coach/messages"
            color="orange"
            loading={dataLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Recent Bookings */}
          <RecentActivity
            title="Recent Bookings"
            items={recentActivity}
            loading={dataLoading}
            emptyMessage="No bookings yet"
            viewAllHref="/coach/bookings"
          />

          {/* Quick Actions */}
          <QuickActions
            title="Quick Actions"
            actions={quickActions}
          />
        </div>

        {/* KYC Verification Banner */}
        {!isVerified && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <Shield className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">
                    Complete Identity Verification
                  </h3>
                  <p className="text-sm text-amber-700">
                    Verified coaches get a badge on their profile and can withdraw earnings
                  </p>
                </div>
              </div>
              <Link
                to="/coach/profile"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                Start KYC
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CoachDashboard;
