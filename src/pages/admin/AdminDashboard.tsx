import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Users, CreditCard, Shield, BookOpen, TrendingUp, Wallet, Clock, CheckCircle2, XCircle, ArrowRight, Video } from "lucide-react";
import { safeSingle } from "@/lib/dashboardQueries";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, payments: 0, pending: 0, courses: 0, revenue: 0, videos: 0 });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [users, payments, pending, courses, videos, revenueData, paymentsData, usersData] = await Promise.all([
        safeSingle<any>(supabase.from("profiles").select("user_id", { count: "exact", head: true }), { count: 0 }),
        safeSingle<any>(supabase.from("payments").select("id", { count: "exact", head: true }), { count: 0 }),
        safeSingle<any>(supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"), { count: 0 }),
        safeSingle<any>(supabase.from("courses").select("id", { count: "exact", head: true }), { count: 0 }),
        safeSingle<any>(supabase.from("content_items" as any).select("id", { count: "exact", head: true }), { count: 0 }),
        supabase.from("payments").select("amount").in("status", ["completed", "approved"] as any),
        supabase.from("payments").select("*, profiles!payments_payer_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("profiles").select("user_id, full_name, role, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const revenue = (revenueData.data || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      setStats({
        users: Number(users?.count || 0),
        payments: Number(payments?.count || 0),
        pending: Number(pending?.count || 0),
        courses: Number(courses?.count || 0),
        revenue,
        videos: Number(videos?.count || 0),
      });
      setRecentPayments(paymentsData.data || []);
      setRecentUsers(usersData.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Users",     value: stats.users,              icon: Users,       color: "bg-blue-50 text-blue-600",    href: "/admin/users" },
    { label: "Total Revenue",   value: `$${stats.revenue.toFixed(2)}`, icon: TrendingUp, color: "bg-emerald-50 text-emerald-600", href: "/admin/wallet" },
    { label: "Pending KYC",     value: stats.pending,            icon: Shield,      color: "bg-amber-50 text-amber-600",  href: "/admin/kyc" },
    { label: "Total Payments",  value: stats.payments,           icon: CreditCard,  color: "bg-purple-50 text-purple-600", href: "/admin/payments" },
    { label: "Courses",         value: stats.courses,            icon: BookOpen,    color: "bg-rose-50 text-rose-600",    href: "/admin/content" },
    { label: "Videos",          value: stats.videos,             icon: Video,       color: "bg-cyan-50 text-cyan-600",    href: "/admin/content" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map(card => (
            <Link key={card.label} to={card.href} className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-all hover:border-primary/30">
              <div className="flex items-start justify-between mb-4">
                <div className={`rounded-xl p-2.5 ${card.color}`}>
                  <card.icon size={20} />
                </div>
                <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                {loading ? <span className="animate-pulse bg-muted rounded h-7 w-16 block" /> : card.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
            </Link>
          ))}
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Recent Payments */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-foreground">Recent Payments</h2>
              <Link to="/admin/payments" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-5 text-center text-muted-foreground text-sm">Loading...</div>
              ) : recentPayments.length === 0 ? (
                <div className="p-5 text-center text-muted-foreground text-sm">No payments yet</div>
              ) : recentPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {(p.profiles?.full_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.profiles?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.payment_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">${Number(p.amount).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === "completed" || p.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      p.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    }`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Users */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-foreground">Recent Users</h2>
              <Link to="/admin/users" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-5 text-center text-muted-foreground text-sm">Loading...</div>
              ) : recentUsers.length === 0 ? (
                <div className="p-5 text-center text-muted-foreground text-sm">No users yet</div>
              ) : recentUsers.map(u => (
                <div key={u.user_id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {(u.full_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role || "learner"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Review KYC",      href: "/admin/kyc",           icon: Shield,      color: "text-amber-600 bg-amber-50" },
              { label: "Approve Payments", href: "/admin/payments",      icon: CreditCard,  color: "text-purple-600 bg-purple-50" },
              { label: "Manage Users",    href: "/admin/users",          icon: Users,       color: "text-blue-600 bg-blue-50" },
              { label: "View Wallet",     href: "/admin/wallet",         icon: Wallet,      color: "text-emerald-600 bg-emerald-50" },
            ].map(action => (
              <Link key={action.label} to={action.href} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:bg-secondary transition-colors text-center">
                <div className={`rounded-xl p-2.5 ${action.color}`}>
                  <action.icon size={18} />
                </div>
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
