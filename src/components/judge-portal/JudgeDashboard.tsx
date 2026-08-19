import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Gavel,
  TrendingUp,
  Clock,
  Users,
  Award,
  LogOut,
  FileText,
  BarChart3,
  Crown
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface JudgeProfile {
  id: string;
  full_name: string;
  email: string;
  rank: string;
  hire_date: string;
  specialization: string[];
}

interface PerformanceMetrics {
  total_cases: number;
  resolved_cases: number;
  success_rate: number;
  performance_score: number;
  recommended_rank: string;
  avg_resolution_days: number;
}

const JudgeDashboard = () => {
  const [judge, setJudge] = useState<JudgeProfile | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadJudgeData();
  }, []);

  const loadJudgeData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/judge-portal/login');
        return;
      }

      // Get judge profile
      const { data: judgeData, error: judgeError } = await supabase
        .from('judges')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'active')
        .single();

      if (judgeError || !judgeData) {
        throw new Error('Judge profile not found');
      }

      setJudge(judgeData);

      // Get performance metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('calculate_judge_performance', { judge_id_param: judgeData.id });

      if (!metricsError && metricsData && metricsData.length > 0) {
        setMetrics(metricsData[0]);
      }

      // Get recent cases
      const { data: casesData } = await supabase
        .from('court_cases')
        .select(`
          *,
          judge_case_assignments!inner(assigned_at)
        `)
        .eq('judge_case_assignments.judge_id', judgeData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentCases(casesData || []);

    } catch (error: any) {
      toast.error(error.message || 'Failed to load judge data');
      navigate('/judge-portal/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/judge-portal/login');
    toast.success('Signed out successfully');
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'chief':
        return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'senior':
        return <Award className="h-5 w-5 text-blue-600" />;
      default:
        return <Gavel className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRankBadge = (rank: string) => {
    const variants = {
      chief: "bg-yellow-100 text-yellow-800 border-yellow-300",
      senior: "bg-blue-100 text-blue-800 border-blue-300",
      judge: "bg-gray-100 text-gray-800 border-gray-300"
    };

    const labels = {
      chief: "👑 Chief Judge",
      senior: "⭐ Senior Judge",
      judge: "🎯 Judge"
    };

    return (
      <Badge className={variants[rank as keyof typeof variants] || variants.judge}>
        {labels[rank as keyof typeof labels] || "Judge"}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Gavel className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-bounce" />
          <p className="text-gray-600">Loading Judge Portal...</p>
        </div>
      </div>
    );
  }

  if (!judge) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Gavel className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Judge Portal</h1>
                <p className="text-sm text-gray-500">CourseVia Judicial System</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium text-gray-900">{judge.full_name}</p>
                <div className="flex items-center space-x-2">
                  {getRankIcon(judge.rank)}
                  {getRankBadge(judge.rank)}
                </div>
              </div>
              <Avatar>
                <AvatarFallback className="bg-purple-100 text-purple-600">
                  {judge.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {judge.full_name}
          </h2>
          <p className="text-gray-600">
            Here's your judicial performance overview and recent activity.
          </p>
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics?.total_cases || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics?.success_rate ? `${metrics.success_rate.toFixed(1)}%` : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Performance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics?.performance_score ? `${metrics.performance_score.toFixed(0)}%` : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics?.avg_resolution_days ? `${metrics.avg_resolution_days.toFixed(1)}d` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Promotion Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Promotion Status
              </CardTitle>
              <CardDescription>
                Your current rank and advancement progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Current Rank</span>
                    {getRankBadge(judge.rank)}
                  </div>

                  {metrics && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Recommended Rank</span>
                        {getRankBadge(metrics.recommended_rank)}
                      </div>

                      {judge.rank !== metrics.recommended_rank && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 font-medium">
                            🎉 Eligible for Promotion!
                          </p>
                          <p className="text-sm text-green-600 mt-1">
                            Your performance qualifies you for {metrics.recommended_rank} rank.
                          </p>
                        </div>
                      )}

                      {judge.rank === 'chief' && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800 font-medium">
                            👑 Chief Judge - Highest Rank
                          </p>
                          <p className="text-sm text-yellow-600 mt-1">
                            You have achieved the highest judicial rank in our system.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Recent Cases
              </CardTitle>
              <CardDescription>
                Your recently assigned court cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentCases.length > 0 ? (
                  recentCases.map((case_item, index) => (
                    <div key={case_item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{case_item.case_number}</p>
                        <p className="text-xs text-gray-500">{case_item.dispute_type}</p>
                      </div>
                      <Badge variant={case_item.status === 'resolved' ? 'default' : 'secondary'}>
                        {case_item.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No recent cases assigned
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Access your judicial tools and case management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-24 flex-col"
                onClick={() => navigate('/judge-portal/cases')}
              >
                <FileText className="h-6 w-6 mb-2" />
                View All Cases
              </Button>

              <Button
                variant="outline"
                className="h-24 flex-col"
                onClick={() => navigate('/judge-portal/rankings')}
              >
                <BarChart3 className="h-6 w-6 mb-2" />
                Judge Rankings
              </Button>

              <Button
                variant="outline"
                className="h-24 flex-col"
                onClick={() => navigate('/judge-portal/profile')}
              >
                <Users className="h-6 w-6 mb-2" />
                My Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JudgeDashboard;