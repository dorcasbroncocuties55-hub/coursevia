import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Wallet, Users, MessageSquare, HeartHandshake, Settings, User, Shield, Video } from "lucide-react";
import { getServiceModeLabel } from "@/lib/providerModes";
import { countProviderServices, countUnreadMessages, getProviderRecord, safeSingle } from "@/lib/dashboardQueries";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatusIndicator } from "@/components/dashboard/StatusIndicator";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ScrollableContent } from "@/components/ui/scrollable-content";

const TherapistDashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, balance: 0, services: 0, messages: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      setLoading(true);
      const [bookingRes, walletRes, providerRow, unread, bookingsData] = await Promise.all([
        safeSingle<any>(supabase.from("bookings").select("id", { count: "exact", head: true }).or(`provider_id.eq.${user.id},provider_user_id.eq.${user.id}`), { count: 0 }),
        safeSingle<any>(supabase.from("wallets").select("balance,available_balance").eq("user_id", user.id).maybeSingle(), { balance: 0 }),
        getProviderRecord("therapist", user.id),
        countUnreadMessages(user.id),
        supabase.from("bookings").select("id,status,scheduled_at,notes,learner_id").or(`provider_id.eq.${user.id},provider_user_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(5),
      ]);

      const pid = providerRow?.id || null;
      const svcCount = await countProviderServices("therapist", pid, user.id);

      setStats({
        bookings: Number(bookingRes?.count || 0),
        balance: Number(walletRes?.balance || 0),
        services: svcCount,
        messages: unread,
      });
      setRecentBookings(bookingsData.data || []);
      setLoading(false);
    };
    run();
  }, [user?.id]);

  const isVerified = (profile as any)?.is_verified || (profile as any)?.kyc_status === "approved";
  const kycStatus = (profile as any)?.kyc_status;
  const needsKyc = !isVerified && (!kycStatus || kycStatus === "not_started" || kycStatus === "pending_setup");
  const kycPending = kycStatus === "pending";
  
  const serviceMode = getServiceModeLabel((profile as any)?.service_delivery_mode);
  const displayName = profile?.full_name || "Therapist";
  const firstName = displayName.split(" ")[0];

  const quickActions = [
    {
      label: "Edit Profile",
      href: "/therapist/profile",
      description: "Update your bio, photo, and pricing",
      icon: User,
    },
    {
      label: "Upload Video",
      href: "/therapist/upload-video",
      description: "Share your expertise through video content",
      icon: Video,
      priority: "high" as const,
    },
    {
      label: "Manage Services",
      href: "/therapist/services",
      description: "Add or edit your therapy services",
      icon: HeartHandshake,
      badge: stats.services === 0 ? "Setup Required" : undefined,
      priority: stats.services === 0 ? "high" as const : "medium" as const,
    },
    {
      label: "View Calendar",
      href: "/therapist/calendar",
      description: "Set your availability and manage appointments",
      icon: CalendarDays,
    },
    {
      label: "View Clients",
      href: "/therapist/clients",
      description: "Manage your client relationships",
      icon: Users,
    },
    {
      label: "Request Withdrawal",
      href: "/therapist/withdrawals",
      description: "Transfer earnings to your bank account",
      icon: Wallet,
      badge: stats.balance > 0 ? "Available" : undefined,
      priority: stats.balance > 0 ? "medium" as const : "low" as const,
    },
    {
      label: "Complete KYC",
      href: "/therapist/kyc",
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
      : "Instant Session",
    description: booking.notes || "No additional notes",
    timestamp: booking.scheduled_at || new Date().toISOString(),
    status: booking.status === "confirmed" ? "success" as const :
            booking.status === "pending" ? "pending" as const : 
            "failed" as const,
    href: `/therapist/bookings`
  }));

  return (
    <DashboardLayout role="therapist">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <WelcomeBanner
          role="therapist"
          userName={firstName}
          subtitle={isVerified 
            ? "Your profile is verified and visible in the therapist directory." 
            : "Complete your profile and KYC verification to appear in the therapist directory."
          }
          isVerified={isVerified}
          gradient="teal"
          primaryAction={{
            label: "Edit Profile",
            href: "/therapist/profile"
          }}
          secondaryAction={{
            label: "View Public Page",
            href: "/therapists"
          }}
        />

        {/* Status Indicators */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusIndicator
            label="Verification Status"
            status={isVerified ? "success" : kycPending ? "pending" : "warning"}
            value={isVerified ? "Verified" : kycPending ? "Under Review" : "Not Started"}
            description={isVerified ? "Identity verified" : kycPending ? "KYC submission under review" : "Complete verification to unlock features"}
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
            title="Total Sessions"
            value={stats.bookings}
            description="All-time bookings"
            icon={<CalendarDays className="h-6 w-6" />}
            href="/therapist/bookings"
            color="teal"
            loading={loading}
          />
          <DashboardCard
            title="Wallet Balance"
            value={`$${stats.balance.toFixed(2)}`}
            description="Available earnings"
            icon={<Wallet className="h-6 w-6" />}
            href="/therapist/wallet"
            color="green"
            loading={loading}
          />
          <DashboardCard
            title="Active Services"
            value={stats.services}
            description="Bookable services"
            icon={<HeartHandshake className="h-6 w-6" />}
            href="/therapist/services"
            color="purple"
            loading={loading}
          />
          <DashboardCard
            title="Unread Messages"
            value={stats.messages}
            description="Client messages"
            icon={<MessageSquare className="h-6 w-6" />}
            href="/therapist/messages"
            color="orange"
            loading={loading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Recent Sessions */}
          <RecentActivity
            title="Recent Sessions"
            items={recentActivity}
            loading={loading}
            emptyMessage="No sessions yet"
            viewAllHref="/therapist/bookings"
          />

          {/* Quick Actions */}
          <QuickActions
            title="Quick Actions"
            actions={quickActions}
          />
        </div>

        {/* KYC Verification Banner */}
        {needsKyc && (
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
                    Verified therapists get a badge on their profile and can withdraw earnings
                  </p>
                </div>
              </div>
              <Link
                to="/therapist/kyc"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                Start KYC
              </Link>
            </div>
          </div>
        )}
        {kycPending && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">
                  KYC Verification Under Review
                </h3>
                <p className="text-sm text-blue-700">
                  Your identity verification is being reviewed. This usually takes 1-2 business days.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TherapistDashboard;