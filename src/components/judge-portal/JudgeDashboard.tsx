import { useState, useEffect } from "react";
import { Scale, Clock, AlertTriangle, CheckCircle, TrendingUp, Users, FileText, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface JudgeData {
  id: string;
  email: string;
  full_name: string;
  specialization: string[];
  status: string;
  rank: string;
}

interface DashboardStats {
  totalAssigned: number;
  openCases: number;
  resolvedToday: number;
  pendingReview: number;
  avgResolutionTime: number;
  casesByPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

interface RecentCase {
  id: string;
  case_number: string;
  dispute_type: string;
  priority_level: string;
  status: string;
  disputed_amount: number;
  opened_at: string;
  assigned_at: string;
}

export default function JudgeDashboard({ judgeData }: { judgeData: JudgeData | null }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalAssigned: 0,
    openCases: 0,
    resolvedToday: 0,
    pendingReview: 0,
    avgResolutionTime: 0,
    casesByPriority: { high: 0, medium: 0, low: 0 }
  });
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!judgeData?.id) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch judge's assigned cases
        const { data: assignedCases, error: casesError } = await supabase
          .from('judge_case_assignments')
          .select(`
            *,
            court_cases(
              id,
              case_number,
              dispute_type,
              priority_level,
              status,
              disputed_amount,
              opened_at,
              resolved_at
            )
          `)
          .eq('judge_id', judgeData.id)
          .order('assigned_at', { ascending: false });

        if (casesError) throw casesError;

        const cases = assignedCases?.map(assignment => ({
          ...assignment.court_cases,
          assigned_at: assignment.assigned_at
        })) || [];

        // Calculate statistics
        const today = new Date().toISOString().split('T')[0];
        const openCases = cases.filter(c => ['open', 'investigating', 'under_review'].includes(c.status));
        const resolvedToday = cases.filter(c => 
          c.status === 'resolved' && 
          c.resolved_at && 
          c.resolved_at.startsWith(today)
        );

        const priorityCounts = cases.reduce((acc, c) => {
          acc[c.priority_level as keyof typeof acc]++;
          return acc;
        }, { high: 0, medium: 0, low: 0 });

        // Calculate average resolution time (in days)
        const resolvedCases = cases.filter(c => c.status === 'resolved' && c.resolved_at);
        const avgResolutionTime = resolvedCases.length > 0 
          ? resolvedCases.reduce((acc, c) => {
              const opened = new Date(c.opened_at);
              const resolved = new Date(c.resolved_at!);
              const diffDays = (resolved.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
              return acc + diffDays;
            }, 0) / resolvedCases.length
          : 0;

        setStats({
          totalAssigned: cases.length,
          openCases: openCases.length,
          resolvedToday: resolvedToday.length,
          pendingReview: cases.filter(c => c.status === 'under_review').length,
          avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
          casesByPriority: priorityCounts
        });

        // Set recent cases (last 10)
        setRecentCases(cases.slice(0, 10) as RecentCase[]);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [judgeData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-400 bg-blue-900';
      case 'investigating': return 'text-yellow-400 bg-yellow-900';
      case 'under_review': return 'text-orange-400 bg-orange-900';
      case 'resolved': return 'text-green-400 bg-green-900';
      case 'closed': return 'text-gray-400 bg-gray-700';
      default: return 'text-gray-400 bg-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b7e84] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome back, {judgeData?.full_name}
            </h1>
            <p className="text-gray-300">
              Here's your dispute resolution dashboard for {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="bg-[#0b7e84] p-3 rounded-full">
            <Scale className="text-white" size={32} />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Cases</p>
              <p className="text-2xl font-bold text-white">{stats.totalAssigned}</p>
            </div>
            <div className="bg-blue-600 p-3 rounded-full">
              <FileText className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Open Cases</p>
              <p className="text-2xl font-bold text-white">{stats.openCases}</p>
            </div>
            <div className="bg-yellow-600 p-3 rounded-full">
              <AlertTriangle className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Resolved Today</p>
              <p className="text-2xl font-bold text-white">{stats.resolvedToday}</p>
            </div>
            <div className="bg-green-600 p-3 rounded-full">
              <CheckCircle className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Avg Resolution</p>
              <p className="text-2xl font-bold text-white">{stats.avgResolutionTime}d</p>
            </div>
            <div className="bg-purple-600 p-3 rounded-full">
              <Clock className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Priority Breakdown and Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Breakdown */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cases by Priority</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-gray-300">High Priority</span>
              </div>
              <span className="text-white font-semibold">{stats.casesByPriority.high}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300">Medium Priority</span>
              </div>
              <span className="text-white font-semibold">{stats.casesByPriority.medium}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">Low Priority</span>
              </div>
              <span className="text-white font-semibold">{stats.casesByPriority.low}</span>
            </div>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Cases</h3>
            <button className="text-[#0b7e84] hover:text-[#096a70] text-sm font-medium">
              View All
            </button>
          </div>
          
          {recentCases.length === 0 ? (
            <div className="text-center py-8">
              <Gavel className="mx-auto text-gray-400 mb-3" size={32} />
              <p className="text-gray-400">No cases assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCases.slice(0, 5).map((case_) => (
                <div key={case_.id} className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:bg-gray-600 transition cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-mono text-sm text-gray-300">{case_.case_number}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(case_.status)}`}>
                          {case_.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs ${getPriorityColor(case_.priority_level)}`}>
                          {case_.priority_level}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 capitalize">
                        {case_.dispute_type.replace('_', ' ')} • ${case_.disputed_amount}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <div>Opened: {new Date(case_.opened_at).toLocaleDateString()}</div>
                      <div>Assigned: {new Date(case_.assigned_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Judge Specializations */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Specializations</h3>
        <div className="flex flex-wrap gap-2">
          {judgeData?.specialization.map((spec, index) => (
            <span key={index} className="px-3 py-1 bg-[#0b7e84] text-white rounded-full text-sm">
              {spec.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center space-x-2 bg-[#0b7e84] hover:bg-[#096a70] text-white p-4 rounded-lg transition">
            <FileText size={20} />
            <span>Review New Cases</span>
          </button>
          <button className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition">
            <Users size={20} />
            <span>Judge Collaboration</span>
          </button>
          <button className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition">
            <TrendingUp size={20} />
            <span>Performance Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}