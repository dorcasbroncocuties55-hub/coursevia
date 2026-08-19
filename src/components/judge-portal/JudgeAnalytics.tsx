import { useState, useEffect } from "react";
import { BarChart, LineChart, PieChart, TrendingUp, TrendingDown, Calendar, Clock, Users, Gavel, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsProps {
  judgeId: string;
  judgeRank: string;
}

interface AnalyticsData {
  totalCases: number;
  resolvedCases: number;
  avgResolutionTime: number;
  totalRefunded: number;
  approvalRate: number;
  casesByMonth: Array<{ month: string; count: number; resolved: number }>;
  casesByType: Array<{ type: string; count: number; avgAmount: number }>;
  casesByPriority: Array<{ priority: string; count: number; avgTime: number }>;
  performanceMetrics: {
    casesThisMonth: number;
    casesLastMonth: number;
    resolutionTimeThisMonth: number;
    resolutionTimeLastMonth: number;
    approvalRateThisMonth: number;
    approvalRateLastMonth: number;
  };
  workloadComparison: Array<{ judge: string; cases: number; avgTime: number }>;
}

export default function JudgeAnalytics({ judgeId, judgeRank }: AnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [viewMode, setViewMode] = useState<'personal' | 'system'>('personal');

  useEffect(() => {
    fetchAnalytics();
  }, [judgeId, timeRange, viewMode]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Set date range
      switch (timeRange) {
        case '3m':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6m':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2020); // Far back date
          break;
      }

      let caseQuery = supabase
        .from('court_cases')
        .select(`
          *,
          judge_case_assignments!inner(assigned_at, judge_id)
        `)
        .gte('opened_at', startDate.toISOString());

      if (viewMode === 'personal') {
        caseQuery = caseQuery.eq('judge_case_assignments.judge_id', judgeId);
      }

      const { data: cases, error } = await caseQuery;
      if (error) throw error;

      const allCases = cases || [];
      const resolvedCases = allCases.filter(c => c.status === 'resolved');

      // Calculate basic metrics
      const totalRefunded = resolvedCases.reduce((sum, c) => sum + (c.refund_amount || 0), 0);
      const approvalRate = resolvedCases.length > 0 
        ? (resolvedCases.filter(c => (c.refund_amount || 0) > 0).length / resolvedCases.length) * 100 
        : 0;

      // Calculate average resolution time
      const avgResolutionTime = resolvedCases.length > 0
        ? resolvedCases.reduce((sum, c) => {
            if (!c.resolved_at) return sum;
            const opened = new Date(c.opened_at);
            const resolved = new Date(c.resolved_at);
            return sum + (resolved.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / resolvedCases.length
        : 0;

      // Cases by month
      const casesByMonth: { [key: string]: { count: number; resolved: number } } = {};
      allCases.forEach(c => {
        const month = new Date(c.opened_at).toISOString().slice(0, 7); // YYYY-MM
        if (!casesByMonth[month]) {
          casesByMonth[month] = { count: 0, resolved: 0 };
        }
        casesByMonth[month].count++;
        if (c.status === 'resolved') {
          casesByMonth[month].resolved++;
        }
      });

      // Cases by type
      const casesByType: { [key: string]: { count: number; totalAmount: number } } = {};
      allCases.forEach(c => {
        if (!casesByType[c.dispute_type]) {
          casesByType[c.dispute_type] = { count: 0, totalAmount: 0 };
        }
        casesByType[c.dispute_type].count++;
        casesByType[c.dispute_type].totalAmount += c.disputed_amount || 0;
      });

      // Cases by priority
      const casesByPriority: { [key: string]: { count: number; totalTime: number; resolvedCount: number } } = {};
      allCases.forEach(c => {
        if (!casesByPriority[c.priority_level]) {
          casesByPriority[c.priority_level] = { count: 0, totalTime: 0, resolvedCount: 0 };
        }
        casesByPriority[c.priority_level].count++;
        
        if (c.status === 'resolved' && c.resolved_at) {
          const opened = new Date(c.opened_at);
          const resolved = new Date(c.resolved_at);
          const days = (resolved.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
          casesByPriority[c.priority_level].totalTime += days;
          casesByPriority[c.priority_level].resolvedCount++;
        }
      });

      // Performance metrics (current vs previous month)
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(thisMonth.getMonth() - 1);

      const thisMonthCases = allCases.filter(c => 
        new Date(c.opened_at) >= thisMonth
      );
      const lastMonthCases = allCases.filter(c => {
        const openedDate = new Date(c.opened_at);
        return openedDate >= lastMonth && openedDate < thisMonth;
      });

      const thisMonthResolved = thisMonthCases.filter(c => c.status === 'resolved');
      const lastMonthResolved = lastMonthCases.filter(c => c.status === 'resolved');

      // Workload comparison (if system view)
      let workloadComparison: Array<{ judge: string; cases: number; avgTime: number }> = [];
      if (viewMode === 'system' && (judgeRank === 'senior' || judgeRank === 'chief')) {
        const { data: allJudges } = await supabase
          .from('judges')
          .select('id, full_name')
          .eq('status', 'active');

        if (allJudges) {
          workloadComparison = await Promise.all(
            allJudges.map(async (judge) => {
              const { data: judgeCases } = await supabase
                .from('judge_case_assignments')
                .select(`
                  *,
                  court_cases(opened_at, resolved_at, status)
                `)
                .eq('judge_id', judge.id)
                .gte('court_cases.opened_at', startDate.toISOString());

              const cases = judgeCases || [];
              const resolvedJudgeCases = cases.filter(c => c.court_cases?.status === 'resolved');
              
              const avgTime = resolvedJudgeCases.length > 0
                ? resolvedJudgeCases.reduce((sum, c) => {
                    if (!c.court_cases?.resolved_at) return sum;
                    const opened = new Date(c.court_cases.opened_at);
                    const resolved = new Date(c.court_cases.resolved_at);
                    return sum + (resolved.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
                  }, 0) / resolvedJudgeCases.length
                : 0;

              return {
                judge: judge.full_name,
                cases: cases.length,
                avgTime: Math.round(avgTime * 10) / 10
              };
            })
          );
        }
      }

      setAnalytics({
        totalCases: allCases.length,
        resolvedCases: resolvedCases.length,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        totalRefunded,
        approvalRate: Math.round(approvalRate),
        casesByMonth: Object.entries(casesByMonth).map(([month, data]) => ({
          month,
          count: data.count,
          resolved: data.resolved
        })).sort((a, b) => a.month.localeCompare(b.month)),
        casesByType: Object.entries(casesByType).map(([type, data]) => ({
          type: type.replace('_', ' '),
          count: data.count,
          avgAmount: Math.round(data.totalAmount / data.count)
        })),
        casesByPriority: Object.entries(casesByPriority).map(([priority, data]) => ({
          priority,
          count: data.count,
          avgTime: data.resolvedCount > 0 
            ? Math.round((data.totalTime / data.resolvedCount) * 10) / 10 
            : 0
        })),
        performanceMetrics: {
          casesThisMonth: thisMonthCases.length,
          casesLastMonth: lastMonthCases.length,
          resolutionTimeThisMonth: thisMonthResolved.length > 0
            ? thisMonthResolved.reduce((sum, c) => {
                if (!c.resolved_at) return sum;
                const opened = new Date(c.opened_at);
                const resolved = new Date(c.resolved_at);
                return sum + (resolved.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
              }, 0) / thisMonthResolved.length
            : 0,
          resolutionTimeLastMonth: lastMonthResolved.length > 0
            ? lastMonthResolved.reduce((sum, c) => {
                if (!c.resolved_at) return sum;
                const opened = new Date(c.opened_at);
                const resolved = new Date(c.resolved_at);
                return sum + (resolved.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
              }, 0) / lastMonthResolved.length
            : 0,
          approvalRateThisMonth: thisMonthResolved.length > 0
            ? (thisMonthResolved.filter(c => (c.refund_amount || 0) > 0).length / thisMonthResolved.length) * 100
            : 0,
          approvalRateLastMonth: lastMonthResolved.length > 0
            ? (lastMonthResolved.filter(c => (c.refund_amount || 0) > 0).length / lastMonthResolved.length) * 100
            : 0
        },
        workloadComparison
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return { direction: 'neutral', percent: 0 };
    
    const percent = Math.round(((current - previous) / previous) * 100);
    const direction = current > previous ? 'up' : current < previous ? 'down' : 'neutral';
    
    return { direction, percent: Math.abs(percent) };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b7e84] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
          <p className="text-red-300">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>
          <p className="text-gray-400">
            {viewMode === 'personal' ? 'Your performance metrics' : 'System-wide analytics'} 
            • {timeRange === '3m' ? '3 months' : timeRange === '6m' ? '6 months' : timeRange === '1y' ? '1 year' : 'All time'}
          </p>
        </div>
        
        <div className="flex space-x-4">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
          >
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>

          {/* View Mode Selector (for senior/chief judges) */}
          {(judgeRank === 'senior' || judgeRank === 'chief') && (
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('personal')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'personal'
                    ? 'bg-[#0b7e84] text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setViewMode('system')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'system'
                    ? 'bg-[#0b7e84] text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                System-wide
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Cases</p>
              <p className="text-2xl font-bold text-white">{analytics.totalCases}</p>
              <div className="flex items-center space-x-1 mt-1">
                {(() => {
                  const change = getChangeIndicator(analytics.performanceMetrics.casesThisMonth, analytics.performanceMetrics.casesLastMonth);
                  return (
                    <>
                      {change.direction === 'up' && <TrendingUp className="text-green-400" size={16} />}
                      {change.direction === 'down' && <TrendingDown className="text-red-400" size={16} />}
                      <span className={`text-sm ${
                        change.direction === 'up' ? 'text-green-400' : 
                        change.direction === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {change.percent}% vs last month
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="bg-blue-600 p-3 rounded-full">
              <Gavel className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Resolution Rate</p>
              <p className="text-2xl font-bold text-white">
                {analytics.totalCases > 0 ? Math.round((analytics.resolvedCases / analytics.totalCases) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {analytics.resolvedCases} of {analytics.totalCases} cases
              </p>
            </div>
            <div className="bg-green-600 p-3 rounded-full">
              <CheckCircle className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Avg Resolution Time</p>
              <p className="text-2xl font-bold text-white">{analytics.avgResolutionTime}d</p>
              <div className="flex items-center space-x-1 mt-1">
                {(() => {
                  const change = getChangeIndicator(analytics.performanceMetrics.resolutionTimeThisMonth, analytics.performanceMetrics.resolutionTimeLastMonth);
                  return (
                    <>
                      {change.direction === 'down' && <TrendingUp className="text-green-400" size={16} />}
                      {change.direction === 'up' && <TrendingDown className="text-red-400" size={16} />}
                      <span className={`text-sm ${
                        change.direction === 'down' ? 'text-green-400' : 
                        change.direction === 'up' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {change.percent}% vs last month
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="bg-orange-600 p-3 rounded-full">
              <Clock className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Approval Rate</p>
              <p className="text-2xl font-bold text-white">{analytics.approvalRate}%</p>
              <div className="flex items-center space-x-1 mt-1">
                {(() => {
                  const change = getChangeIndicator(analytics.performanceMetrics.approvalRateThisMonth, analytics.performanceMetrics.approvalRateLastMonth);
                  return (
                    <>
                      {change.direction === 'up' && <TrendingUp className="text-blue-400" size={16} />}
                      {change.direction === 'down' && <TrendingDown className="text-blue-400" size={16} />}
                      <span className="text-sm text-blue-400">
                        {change.percent}% vs last month
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="bg-purple-600 p-3 rounded-full">
              <DollarSign className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Month Chart */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <BarChart className="text-[#0b7e84]" size={20} />
            <span>Cases by Month</span>
          </h3>
          <div className="space-y-3">
            {analytics.casesByMonth.slice(-6).map((data) => (
              <div key={data.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{new Date(data.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  <span className="text-white">{data.count} cases ({data.resolved} resolved)</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-[#0b7e84] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(data.count / Math.max(...analytics.casesByMonth.map(c => c.count))) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cases by Type */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <PieChart className="text-[#0b7e84]" size={20} />
            <span>Cases by Type</span>
          </h3>
          <div className="space-y-3">
            {analytics.casesByType.map((data, index) => {
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
              return (
                <div key={data.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                    <span className="text-gray-300 capitalize">{data.type}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">{data.count}</span>
                    <div className="text-xs text-gray-400">{formatCurrency(data.avgAmount)} avg</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Priority Analysis */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <AlertTriangle className="text-[#0b7e84]" size={20} />
          <span>Cases by Priority Level</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analytics.casesByPriority.map((data) => {
            const priorityColors = {
              high: 'border-red-400 text-red-400',
              medium: 'border-yellow-400 text-yellow-400',
              low: 'border-green-400 text-green-400'
            };
            
            return (
              <div key={data.priority} className={`border-2 rounded-lg p-4 ${priorityColors[data.priority as keyof typeof priorityColors]}`}>
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.count}</p>
                  <p className="text-sm capitalize mb-2">{data.priority} Priority</p>
                  <p className="text-xs opacity-75">
                    Avg: {data.avgTime}d resolution
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workload Comparison (System view only) */}
      {viewMode === 'system' && analytics.workloadComparison.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Users className="text-[#0b7e84]" size={20} />
            <span>Judge Workload Comparison</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Judge</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Total Cases</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Avg Resolution (days)</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Efficiency Score</th>
                </tr>
              </thead>
              <tbody>
                {analytics.workloadComparison.map((judge, index) => {
                  const efficiency = judge.avgTime > 0 ? Math.round((judge.cases / judge.avgTime) * 10) / 10 : 0;
                  return (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="py-3 px-4 text-white">{judge.judge}</td>
                      <td className="py-3 px-4 text-right text-white">{judge.cases}</td>
                      <td className="py-3 px-4 text-right text-white">{judge.avgTime}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-medium ${
                          efficiency > 2 ? 'text-green-400' : 
                          efficiency > 1 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {efficiency}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <DollarSign className="text-[#0b7e84]" size={20} />
          <span>Financial Impact</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{formatCurrency(analytics.totalRefunded)}</p>
            <p className="text-sm text-gray-400 mt-1">Total Refunded</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {analytics.resolvedCases > 0 ? formatCurrency(analytics.totalRefunded / analytics.resolvedCases) : '$0'}
            </p>
            <p className="text-sm text-gray-400 mt-1">Avg Refund Amount</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{analytics.approvalRate}%</p>
            <p className="text-sm text-gray-400 mt-1">Approval Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}