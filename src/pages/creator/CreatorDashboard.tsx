import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Video, Wallet, Users, Upload, BarChart3, Settings, TrendingUp } from "lucide-react";
import { safeSingle } from "@/lib/dashboardQueries";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ScrollableContent } from "@/components/ui/scrollable-content";
import { PageLoading } from "@/components/LoadingSpinner";

const CreatorDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ courses: 0, videos: 0, balance: 0, students: 0, totalEarnings: 0 });
  const [recentContent, setRecentContent] = useState<any[]>([]);
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
    
    const fetchDashboardData = async () => {
      setDataLoading(true);
      
      try {
        const [courses, videos, wallet, payments, contentData] = await Promise.all([
          safeSingle<any>(supabase.from("courses").select("id", { count: "exact", head: true }).eq("creator_id", user.id), { count: 0 }),
          safeSingle<any>(supabase.from("videos").select("id", { count: "exact", head: true }).eq("creator_id", user.id), { count: 0 }),
          safeSingle<any>(supabase.from("wallets").select("balance,available_balance").eq("user_id", user.id).maybeSingle(), { balance: 0 }),
          supabase.from("payments").select("amount").eq("payer_id", user.id).eq("status", "success"),
          supabase.from("content_items").select("id,title,content_type,created_at,price").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(5)
        ]);

        const totalEarnings = payments.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

        setStats({
          courses: Number(courses?.count || 0),
          videos: Number(videos?.count || 0),
          balance: Number(wallet?.balance || 0),
          students: 0, // TODO: Calculate unique students
          totalEarnings: totalEarnings
        });

        // Set recent content activity
        const activityItems = contentData.data?.map(item => ({
          id: item.id,
          type: item.content_type === "course" ? "course" : "video" as const,
          title: item.title || "Untitled Content",
          description: `${item.content_type} • $${item.price || 0}`,
          timestamp: item.created_at,
          status: "success" as const,
          href: `/creator/content`
        })) || [];
        
        setRecentContent(activityItems);
        
      } catch (error) {
        console.error("Error fetching creator dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] || "Creator";

  const quickActions = [
    {
      label: "Upload Video",
      href: "/creator/upload-video",
      description: "Share your expertise through video content",
      icon: Upload,
      priority: "high" as const,
    },
    {
      label: "Manage Content",
      href: "/creator/content",
      description: "Edit your courses and videos",
      icon: BookOpen,
    },
    {
      label: "View Analytics",
      href: "/creator/analytics",
      description: "Track your content performance",
      icon: BarChart3,
    },
    {
      label: "Wallet & Earnings",
      href: "/creator/wallet",
      description: "View earnings and request withdrawals",
      icon: Wallet,
      badge: stats.balance > 0 ? "Available" : undefined,
      priority: stats.balance > 0 ? "medium" as const : "low" as const,
    },
    {
      label: "Profile Settings",
      href: "/creator/profile-settings",
      description: "Update your creator profile",
      icon: Settings,
    },
  ];

  return (
    <DashboardLayout role="creator">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <WelcomeBanner
          role="creator"
          userName={firstName}
          subtitle="Build your course and video marketplace. Share your expertise and earn from your content."
          gradient="purple"
          primaryAction={{
            label: "Upload Video",
            href: "/creator/upload-video"
          }}
          secondaryAction={{
            label: "View Analytics",
            href: "/creator/analytics"
          }}
        />

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="Course Products"
            value={stats.courses}
            description="Published courses"
            icon={<BookOpen className="h-6 w-6" />}
            href="/creator/content"
            color="blue"
            loading={dataLoading}
          />
          <DashboardCard
            title="Video Products"
            value={stats.videos}
            description="Published videos"
            icon={<Video className="h-6 w-6" />}
            href="/creator/content"
            color="purple"
            loading={dataLoading}
          />
          <DashboardCard
            title="Wallet Balance"
            value={`$${stats.balance.toFixed(2)}`}
            description="Available earnings"
            icon={<Wallet className="h-6 w-6" />}
            href="/creator/wallet"
            color="green"
            loading={dataLoading}
          />
          <DashboardCard
            title="Total Earnings"
            value={`$${stats.totalEarnings.toFixed(2)}`}
            description="All-time revenue"
            icon={<TrendingUp className="h-6 w-6" />}
            color="orange"
            loading={dataLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Recent Content */}
          <RecentActivity
            title="Recent Content"
            items={recentContent}
            loading={dataLoading}
            emptyMessage="No content yet"
            viewAllHref="/creator/content"
          />

          {/* Quick Actions */}
          <QuickActions
            title="Quick Actions"
            actions={quickActions}
          />
        </div>

        {/* Marketplace Tips */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Marketplace Best Practices
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">•</span>
                Create compelling thumbnails and clear titles for better discovery
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">•</span>
                Set competitive pricing based on content value and length
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">•</span>
                Use relevant categories and tags to help learners find your content
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">•</span>
                Provide detailed descriptions and learning outcomes
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Next Steps
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                Upload your first video or create a course to get started
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                Complete your creator profile with bio and expertise areas
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                Set up your bank account for earnings withdrawals
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                Monitor analytics to understand what content performs best
              </li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreatorDashboard;
