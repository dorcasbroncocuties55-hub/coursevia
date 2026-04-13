import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Video, Calendar, Bell, CreditCard, Wallet, Users, Star, TrendingUp } from "lucide-react";
import { safeSingle } from "@/lib/dashboardQueries";
import { getWallet } from "@/lib/walletApi";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ScrollableContent } from "@/components/ui/scrollable-content";

const LearnerDashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ 
    courses: 0, 
    videos: 0, 
    bookings: 0, 
    notifications: 0, 
    paymentMethods: 0,
    completedCourses: 0,
    totalSpent: 0
  });
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      setLoading(true);
      
      try {
        const [courses, videos, bookings, notifs, paymentMethods, payments] = await Promise.all([
          safeSingle<any>(supabase.from("content_access").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("content_type", "course"), { count: 0 }),
          safeSingle<any>(supabase.from("content_access").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("content_type", "video"), { count: 0 }),
          safeSingle<any>(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("learner_id", user.id), { count: 0 }),
          safeSingle<any>(supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false), { count: 0 }),
          safeSingle<any>(supabase.from("payment_methods" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id), { count: 0 }),
          supabase.from("payments").select("amount, created_at, payment_type").eq("payer_id", user.id).eq("status", "success").order("created_at", { ascending: false }).limit(10)
        ]);

        // Calculate total spent
        const totalSpent = payments.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

        setStats({
          courses: Number(courses?.count || 0),
          videos: Number(videos?.count || 0),
          bookings: Number(bookings?.count || 0),
          notifications: Number(notifs?.count || 0),
          paymentMethods: Number(paymentMethods?.count || 0),
          completedCourses: 0, // TODO: Add completed courses logic
          totalSpent: totalSpent
        });

        // Set recent activity from payments
        const activityItems = payments.data?.map(payment => ({
          id: payment.created_at,
          type: payment.payment_type === "subscription" ? "payment" : payment.payment_type as any,
          title: payment.payment_type === "subscription" ? "Subscription Payment" : 
                 payment.payment_type === "booking" ? "Session Booking" :
                 payment.payment_type === "course" ? "Course Purchase" : "Payment",
          description: `$${payment.amount} payment completed`,
          timestamp: payment.created_at,
          status: "success" as const
        })) || [];
        
        setRecentActivity(activityItems);

        // Get wallet balance - don't block dashboard if backend is offline
        try {
          const wallet = await getWallet(user.id);
          setWalletBalance(Number((wallet as any)?.available_balance ?? wallet?.balance ?? 0));
        } catch {
          setWalletBalance(0);
        }
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] || "Learner";

  const quickActions = [
    {
      label: "Browse Courses",
      href: "/courses",
      description: "Discover new courses to expand your knowledge",
      icon: BookOpen,
    },
    {
      label: "Find Coaches",
      href: "/coaches",
      description: "Book 1-on-1 sessions with expert coaches",
      icon: Users,
    },
    {
      label: "Watch Videos",
      href: "/videos",
      description: "Access our library of educational videos",
      icon: Video,
    },
    {
      label: "Manage Subscription",
      href: "/dashboard/subscription",
      description: "View and update your membership plan",
      icon: Star,
      badge: walletBalance && walletBalance > 0 ? "Credit Available" : undefined,
      priority: "medium" as const,
    },
    {
      label: "Payment Methods",
      href: "/dashboard/payment-methods",
      description: "Add or update your saved payment methods",
      icon: CreditCard,
      badge: stats.paymentMethods === 0 ? "Setup Required" : undefined,
      priority: stats.paymentMethods === 0 ? "high" as const : "low" as const,
    },
  ];

  return (
    <DashboardLayout role="learner">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <WelcomeBanner
          role="learner"
          userName={firstName}
          subtitle="Continue your learning journey and discover new opportunities to grow."
          gradient="blue"
          primaryAction={{
            label: "Browse Courses",
            href: "/courses"
          }}
          secondaryAction={{
            label: "Find Coaches",
            href: "/coaches"
          }}
        />

        {/* Wallet Credit Banner */}
        {walletBalance !== null && walletBalance > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">
                    Wallet Credit: ${walletBalance.toFixed(2)}
                  </h3>
                  <p className="text-sm text-emerald-700">
                    Your credit will be automatically applied at checkout
                  </p>
                </div>
              </div>
              <a
                href="/dashboard/wallet"
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800 underline"
              >
                View Wallet →
              </a>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="My Courses"
            value={stats.courses}
            description="Active enrollments"
            icon={<BookOpen className="h-6 w-6" />}
            href="/dashboard/courses"
            color="blue"
            loading={loading}
          />
          <DashboardCard
            title="My Videos"
            value={stats.videos}
            description="Purchased videos"
            icon={<Video className="h-6 w-6" />}
            href="/dashboard/videos"
            color="purple"
            loading={loading}
          />
          <DashboardCard
            title="Bookings"
            value={stats.bookings}
            description="Scheduled sessions"
            icon={<Calendar className="h-6 w-6" />}
            href="/dashboard/bookings"
            color="green"
            loading={loading}
          />
          <DashboardCard
            title="Total Spent"
            value={`$${stats.totalSpent.toFixed(2)}`}
            description="All-time investment"
            icon={<TrendingUp className="h-6 w-6" />}
            color="orange"
            loading={loading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Recent Activity */}
          <RecentActivity
            title="Recent Activity"
            items={recentActivity}
            loading={loading}
            emptyMessage="No recent activity"
            viewAllHref="/dashboard/payments"
          />

          {/* Quick Actions */}
          <QuickActions
            title="Quick Actions"
            actions={quickActions}
          />
        </div>

        {/* Notifications Banner */}
        {stats.notifications > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Bell className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">
                    You have {stats.notifications} unread notification{stats.notifications !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Stay updated with your learning progress and new opportunities
                  </p>
                </div>
              </div>
              <a
                href="/dashboard/notifications"
                className="text-sm font-medium text-blue-700 hover:text-blue-800 underline"
              >
                View All →
              </a>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LearnerDashboard;
