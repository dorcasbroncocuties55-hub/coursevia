import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Video, Calendar, Bell, CreditCard, Wallet, Users, Star, TrendingUp } from "lucide-react";
import { safeSingle } from "@/lib/dashboardQueries";
import { getWallet } from "@/lib/walletApi";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PageLoading } from "@/components/LoadingSpinner";

const LearnerDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    videos: 0,
    bookings: 0,
    notifications: 0,
    paymentMethods: 0,
    totalSpent: 0,
  });
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  if (authLoading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    const fetchDashboardData = async () => {
      setDataLoading(true);
      try {
        const [videos, bookings, notifs, paymentMethods, payments] = await Promise.all([
          safeSingle<any>(supabase.from("content_access").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("content_type", "video"), { count: 0 }),
          safeSingle<any>(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("learner_id", user.id), { count: 0 }),
          safeSingle<any>(supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false), { count: 0 }),
          safeSingle<any>(supabase.from("payment_methods" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id), { count: 0 }),
          supabase.from("payments").select("amount, created_at, payment_type").eq("payer_id", user.id).eq("status", "success").order("created_at", { ascending: false }).limit(10),
        ]);

        const totalSpent = payments.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        setStats({
          videos: Number(videos?.count || 0),
          bookings: Number(bookings?.count || 0),
          notifications: Number(notifs?.count || 0),
          paymentMethods: Number(paymentMethods?.count || 0),
          totalSpent,
        });

        setRecentActivity(
          payments.data?.map((p) => ({
            id: p.created_at,
            type: p.payment_type === "subscription" ? "payment" : (p.payment_type as any),
            title:
              p.payment_type === "subscription" ? "Subscription Payment" :
              p.payment_type === "booking" ? "Session Booking" : "Payment",
            description: `$${p.amount} payment completed`,
            timestamp: p.created_at,
            status: "success" as const,
          })) || []
        );

        try {
          const wallet = await getWallet(user.id);
          setWalletBalance(Number((wallet as any)?.available_balance ?? wallet?.balance ?? 0));
        } catch {
          setWalletBalance(0);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] || "Learner";

  const quickActions = [
    { label: "Find Coaches",       href: "/coaches",                   description: "Book 1-on-1 sessions with expert coaches",    icon: Users },
    { label: "Watch Videos",       href: "/videos",                    description: "Access our library of educational videos",    icon: Video },
    { label: "Find Therapists",    href: "/therapists",                description: "Connect with verified therapists",            icon: Star },
    {
      label: "Manage Subscription", href: "/dashboard/subscription",
      description: "View and update your membership plan", icon: Star,
      badge: walletBalance && walletBalance > 0 ? "Credit Available" : undefined,
      priority: "medium" as const,
    },
    {
      label: "Payment Methods", href: "/dashboard/payment-methods",
      description: "Add or update your saved payment methods", icon: CreditCard,
      badge: stats.paymentMethods === 0 ? "Setup Required" : undefined,
      priority: stats.paymentMethods === 0 ? "high" as const : "low" as const,
    },
  ];

  return (
    <DashboardLayout role="learner">
      <div className="space-y-8">
        <WelcomeBanner
          role="learner"
          userName={firstName}
          subtitle="Discover videos, book sessions with coaches and therapists, and grow."
          gradient="blue"
          primaryAction={{ label: "Find Coaches", href: "/coaches" }}
          secondaryAction={{ label: "Watch Videos", href: "/videos" }}
        />

        {walletBalance !== null && walletBalance > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">Wallet Credit: ${walletBalance.toFixed(2)}</h3>
                  <p className="text-sm text-emerald-700">Automatically applied at checkout</p>
                </div>
              </div>
              <a href="/dashboard/wallet" className="text-sm font-medium text-emerald-700 hover:text-emerald-800 underline">View Wallet →</a>
            </div>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard title="My Videos"   value={stats.videos}   description="Purchased videos"    icon={<Video className="h-6 w-6" />}      href="/dashboard/videos"   color="purple" loading={dataLoading} />
          <DashboardCard title="Bookings"    value={stats.bookings} description="Scheduled sessions"  icon={<Calendar className="h-6 w-6" />}   href="/dashboard/bookings" color="green"  loading={dataLoading} />
          <DashboardCard title="Total Spent" value={`$${stats.totalSpent.toFixed(2)}`} description="All-time investment" icon={<TrendingUp className="h-6 w-6" />} color="orange" loading={dataLoading} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <RecentActivity title="Recent Activity" items={recentActivity} loading={dataLoading} emptyMessage="No recent activity" viewAllHref="/dashboard/payments" />
          <QuickActions title="Quick Actions" actions={quickActions} />
        </div>

        {stats.notifications > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3"><Bell className="h-6 w-6 text-blue-600" /></div>
                <div>
                  <h3 className="font-semibold text-blue-900">You have {stats.notifications} unread notification{stats.notifications !== 1 ? "s" : ""}</h3>
                  <p className="text-sm text-blue-700">Stay updated with your sessions and new opportunities</p>
                </div>
              </div>
              <a href="/dashboard/notifications" className="text-sm font-medium text-blue-700 hover:text-blue-800 underline">View All →</a>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LearnerDashboard;
