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
  ArrowLeft,
  Crown,
  Star,
  Target
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface JudgeRanking {
  rank_position: number;
  judge_id: string;
  judge_name: string;
  current_rank: string;
  performance_score: number;
  total_cases: number;
  success_rate: number;
  eligible_for_promotion: boolean;
  next_promotion: string;
}

const JudgeRankings = () => {
  const [rankings, setRankings] = useState<JudgeRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [promotionResults, setPromotionResults] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_judge_rankings');
      
      if (error) {
        throw error;
      }

      setRankings(data || []);
    } catch (error: any) {
      toast.error('Failed to load judge rankings');
    } finally {
      setIsLoading(false);
    }
  };

  const runPromotions = async () => {
    try {
      const { data, error } = await supabase.rpc('auto_promote_judges');
      
      if (error) {
        throw error;
      }

      setPromotionResults(data || []);
      
      if (data && data.length > 0) {
        toast.success(`${data.length} judge(s) promoted!`);
        loadRankings(); // Reload to show updated rankings
      } else {
        toast.info('No judges eligible for promotion at this time');
      }
    } catch (error: any) {
      toast.error('Failed to run promotion system');
    }
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'chief':
        return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'senior':
        return <Star className="h-5 w-5 text-blue-600" />;
      default:
        return <Target className="h-5 w-5 text-gray-600" />;
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

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-100";
    if (score >= 70) return "text-blue-600 bg-blue-100";
    if (score >= 50) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Gavel className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-bounce" />
          <p className="text-gray-600">Loading judge rankings...</p>
        </div>
      </div>
    );
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
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Judge Rankings</h1>
                <p className="text-sm text-gray-500">Performance leaderboard and promotions</p>
              </div>
            </div>
            
            <Button 
              onClick={runPromotions}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Award className="h-4 w-4 mr-2" />
              Run Promotions
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Promotion Results */}
        {promotionResults.length > 0 && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Recent Promotions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promotionResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <p className="font-medium text-gray-900">{result.judge_name}</p>
                      <p className="text-sm text-gray-600">
                        {result.old_rank} → {result.new_rank}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{result.promotion_reason}</p>
                      <p className="text-xs text-gray-500">
                        Score: {result.performance_score}% | Cases: {result.total_cases}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rankings Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Judge Performance Rankings</h2>
          <p className="text-gray-600">
            Ranked by performance score, case volume, and success rate
          </p>
        </div>

        {/* Rankings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Rankings</CardTitle>
            <CardDescription>
              Judge hierarchy: Judge → Senior Judge → Chief Judge (Max 3 Chiefs)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rankings.map((judge, index) => (
                <div 
                  key={judge.judge_id} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Ranking Position */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-orange-300 text-orange-900' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {judge.rank_position}
                    </div>

                    {/* Judge Info */}
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-purple-100 text-purple-600">
                          {judge.judge_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{judge.judge_name}</p>
                          {getRankIcon(judge.current_rank)}
                        </div>
                        {getRankBadge(judge.current_rank)}
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className={`text-lg font-bold px-2 py-1 rounded ${getPerformanceColor(judge.performance_score)}`}>
                        {judge.performance_score.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">Performance</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{judge.total_cases}</p>
                      <p className="text-xs text-gray-500">Cases</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{judge.success_rate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">Success</p>
                    </div>

                    {/* Promotion Status */}
                    <div className="text-center min-w-[160px]">
                      {judge.eligible_for_promotion ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          ⬆️ Promotion Ready
                        </Badge>
                      ) : (
                        <p className="text-xs text-gray-500">{judge.next_promotion}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {rankings.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No judge rankings available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Promotion Criteria */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Promotion Criteria</CardTitle>
            <CardDescription>
              Requirements for advancing through the judicial hierarchy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <Target className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-2">🎯 Judge</h3>
                <p className="text-sm text-gray-600">Entry level position</p>
                <p className="text-xs text-gray-500 mt-2">Starting rank for all judges</p>
              </div>
              
              <div className="text-center p-4 border rounded-lg bg-blue-50">
                <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900 mb-2">⭐ Senior Judge</h3>
                <p className="text-sm text-blue-700">70%+ performance</p>
                <p className="text-sm text-blue-700">10+ cases handled</p>
              </div>
              
              <div className="text-center p-4 border rounded-lg bg-yellow-50">
                <Crown className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <h3 className="font-semibold text-yellow-900 mb-2">👑 Chief Judge</h3>
                <p className="text-sm text-yellow-700">85%+ performance</p>
                <p className="text-sm text-yellow-700">20+ cases handled</p>
                <p className="text-xs text-yellow-600 mt-2">Maximum 3 positions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JudgeRankings;