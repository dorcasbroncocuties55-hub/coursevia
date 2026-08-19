import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Gavel,
  ArrowLeft,
  Search,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface CourtCase {
  id: string;
  case_number: string;
  dispute_type: string;
  priority_level: string;
  status: string;
  disputed_amount: number;
  refund_amount: number;
  opened_at: string;
  resolved_at: string;
  complexity_score: number;
}

const JudgeCases = () => {
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<CourtCase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    filterCases();
  }, [cases, searchTerm, statusFilter]);

  const loadCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/judge-portal/login');
        return;
      }

      // Get judge ID
      const { data: judgeData } = await supabase
        .from('judges')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!judgeData) {
        throw new Error('Judge not found');
      }

      // Get cases assigned to this judge
      const { data: casesData, error } = await supabase
        .from('court_cases')
        .select(`
          *,
          judge_case_assignments!inner(assigned_at)
        `)
        .eq('judge_case_assignments.judge_id', judgeData.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCases(casesData || []);
    } catch (error: any) {
      toast.error('Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  };
  const filterCases = () => {
    let filtered = cases;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(case_item =>
        case_item.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_item.dispute_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(case_item => case_item.status === statusFilter);
    }

    setFilteredCases(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      open: "bg-blue-100 text-blue-800 border-blue-300",
      in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
      resolved: "bg-green-100 text-green-800 border-green-300",
      closed: "bg-gray-100 text-gray-800 border-gray-300",
      escalated: "bg-red-100 text-red-800 border-red-300"
    };

    const icons = {
      open: <FileText className="h-3 w-3 mr-1" />,
      in_progress: <Clock className="h-3 w-3 mr-1" />,
      resolved: <CheckCircle className="h-3 w-3 mr-1" />,
      closed: <CheckCircle className="h-3 w-3 mr-1" />,
      escalated: <AlertCircle className="h-3 w-3 mr-1" />
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.open}>
        {icons[status as keyof typeof icons]}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Gavel className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-bounce" />
          <p className="text-gray-600">Loading cases...</p>
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
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Cases</h1>
                <p className="text-sm text-gray-500">Cases assigned to you</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search cases by number or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Cases List */}
        <div className="space-y-4">
          {filteredCases.length > 0 ? (
            filteredCases.map((case_item) => (
              <Card key={case_item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="font-semibold text-lg">{case_item.case_number}</h3>
                        {getStatusBadge(case_item.status)}
                        <Badge className={`px-2 py-1 ${getPriorityColor(case_item.priority_level)}`}>
                          {case_item.priority_level.toUpperCase()} PRIORITY
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700">Dispute Type</p>
                          <p className="text-gray-600 capitalize">
                            {case_item.dispute_type.replace('_', ' ')}
                          </p>
                        </div>

                        <div>
                          <p className="font-medium text-gray-700">Disputed Amount</p>
                          <p className="text-gray-600">{formatCurrency(case_item.disputed_amount)}</p>
                        </div>

                        <div>
                          <p className="font-medium text-gray-700">Complexity</p>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${case_item.complexity_score >= 8 ? 'bg-red-500' :
                                case_item.complexity_score >= 6 ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                            <span className="text-gray-600">{case_item.complexity_score}/10</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500 ml-4">
                      <div className="flex items-center mb-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        Opened: {new Date(case_item.opened_at).toLocaleDateString()}
                      </div>
                      {case_item.resolved_at && (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolved: {new Date(case_item.resolved_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all'
                      ? 'No cases match your current filters'
                      : 'No cases assigned yet'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Stats */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Case Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{cases.length}</p>
                <p className="text-sm text-gray-600">Total Cases</p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {cases.filter(c => c.status === 'resolved').length}
                </p>
                <p className="text-sm text-gray-600">Resolved</p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {cases.filter(c => c.status === 'in_progress').length}
                </p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {cases.filter(c => c.status === 'open').length}
                </p>
                <p className="text-sm text-gray-600">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JudgeCases;