import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Gavel,
  ArrowLeft,
  Crown,
  Star,
  Target,
  Calendar,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface JudgeProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  rank: string;
  hire_date: string;
  specialization: string[];
  status: string;
  last_login: string;
}

interface PerformanceMetrics {
  total_cases: number;
  resolved_cases: number;
  success_rate: number;
  performance_score: number;
  recommended_rank: string;
  avg_resolution_days: number;
}

const JudgeProfile = () => {
  const [judge, setJudge] = useState<JudgeProfile | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadJudgeProfile();
  }, []);

  const loadJudgeProfile = async () => {
    try {
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

    } catch (error: any) {
      toast.error(error.message || 'Failed to load judge profile');
      navigate('/judge-portal/login');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'chief':
        return <Crown className="h-6 w-6 text-yellow-600" />;
      case 'senior':
        return <Star className="h-6 w-6 text-blue-600" />;
      default:
        return <Target className="h-6 w-6 text-gray-600" />;
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
          <p className="text-gray-600">Loading judge profile...</p>
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
              <Button
                variant="ghost"
                onClick={() => navigate('/judge-portal/dashboard')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="bg-purple-100 p-2 rounded-lg">
                <Gavel className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Judge Profile</h1>
                <p className="text-sm text-gray-500">Your judicial profile and performance</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-2xl">
                    {judge.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="flex items-center justify-center space-x-2">
                  {getRankIcon(judge.rank)}
                  <span>{judge.full_name}</span>
                </CardTitle>
                <CardDescription className="space-y-2">
                  <div>{getRankBadge(judge.rank)}</div>
                  <p className="text-sm">Member since {new Date(judge.hire_date).getFullYear()}</p>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{judge.email}</span>
                  </div>

                  {judge.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{judge.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Hired: {new Date(judge.hire_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Performance Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Your judicial performance and case handling statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{metrics.total_cases}</p>
                      <p className="text-sm text-gray-600">Total Cases</p>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {metrics.success_rate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">Success Rate</p>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {metrics.performance_score.toFixed(0)}%
                      </p>
                      <p className="text-sm text-gray-600">Performance Score</p>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{metrics.resolved_cases}</p>
                      <p className="text-sm text-gray-600">Resolved Cases</p>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {metrics.avg_resolution_days ? `${metrics.avg_resolution_days.toFixed(1)}d` : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">Avg Resolution Time</p>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      {getRankBadge(metrics.recommended_rank)}
                      <p className="text-sm text-gray-600 mt-2">Recommended Rank</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500">No performance data available</p>
                )}
              </CardContent>
            </Card>

            {/* Specialization */}
            <Card>
              <CardHeader>
                <CardTitle>Specialization</CardTitle>
                <CardDescription>
                  Areas of judicial expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {judge.specialization && judge.specialization.length > 0 ? (
                    judge.specialization.map((spec, index) => (
                      <Badge key={index} variant="secondary">
                        {spec.replace('_', ' ').toUpperCase()}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-500">General jurisdiction</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JudgeProfile;