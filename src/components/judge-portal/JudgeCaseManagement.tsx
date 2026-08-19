import { useState, useEffect } from "react";
import { Search, Filter, Eye, Gavel, Clock, AlertTriangle, CheckCircle, XCircle, ArrowUpDown, MessageCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import JudgeDecisionPanel from "./JudgeDecisionPanel";

interface CaseManagementProps {
  judgeId: string;
  judgeRank: string;
}

interface CaseRecord {
  id: string;
  case_number: string;
  dispute_type: string;
  priority_level: string;
  status: string;
  disputed_amount: number;
  refund_amount?: number;
  opened_at: string;
  assigned_at?: string;
  resolved_at?: string;
  complexity_score: number;
  learner_id: string;
  provider_id: string;
  message_count: number;
  evidence_count: number;
  last_activity?: string;
}

export default function JudgeCaseManagement({ judgeId, judgeRank }: CaseManagementProps) {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [showDecisionPanel, setShowDecisionPanel] = useState(false);
  
  // Filters and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'opened_at' | 'assigned_at' | 'priority_level' | 'disputed_amount' | 'case_number'>('assigned_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'assigned' | 'all'>('assigned');

  useEffect(() => {
    fetchCases();
  }, [judgeId, viewMode]);

  useEffect(() => {
    applyFilters();
  }, [cases, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      let query;
      
      if (viewMode === 'assigned') {
        // Fetch only assigned cases
        query = supabase
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
              refund_amount,
              opened_at,
              resolved_at,
              complexity_score,
              learner_id,
              provider_id
            )
          `)
          .eq('judge_id', judgeId)
          .order('assigned_at', { ascending: false });
      } else {
        // Fetch all cases (for senior/chief judges)
        query = supabase
          .from('court_cases')
          .select(`
            *,
            judge_case_assignments(assigned_at)
          `)
          .order('opened_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process and enrich case data
      const enrichedCases = await Promise.all(
        (data || []).map(async (item) => {
          const caseData = viewMode === 'assigned' ? item.court_cases : item;
          const assignedAt = viewMode === 'assigned' ? item.assigned_at : item.judge_case_assignments?.[0]?.assigned_at;

          // Get message count
          const { count: messageCount } = await supabase
            .from('case_messages')
            .select('*', { count: 'exact', head: true })
            .eq('case_id', caseData.id);

          // Get evidence count
          const { count: evidenceCount } = await supabase
            .from('dispute_evidence')
            .select('*', { count: 'exact', head: true })
            .eq('case_id', caseData.id);

          // Get last activity
          const { data: lastMessage } = await supabase
            .from('case_messages')
            .select('created_at')
            .eq('case_id', caseData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...caseData,
            assigned_at: assignedAt,
            message_count: messageCount || 0,
            evidence_count: evidenceCount || 0,
            last_activity: lastMessage?.created_at
          };
        })
      );

      setCases(enrichedCases);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cases];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(case_ =>
        case_.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.dispute_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(case_ => case_.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(case_ => case_.priority_level === priorityFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (sortBy === 'disputed_amount' || sortBy === 'complexity_score') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortBy === 'opened_at' || sortBy === 'assigned_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortBy === 'priority_level') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[aValue as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[bValue as keyof typeof priorityOrder] || 0;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    setFilteredCases(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="text-blue-400" size={16} />;
      case 'investigating': return <Eye className="text-yellow-400" size={16} />;
      case 'under_review': return <AlertTriangle className="text-orange-400" size={16} />;
      case 'resolved': return <CheckCircle className="text-green-400" size={16} />;
      case 'closed': return <XCircle className="text-gray-400" size={16} />;
      default: return <Clock className="text-gray-400" size={16} />;
    }
  };

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
      case 'high': return 'text-red-400 border-red-400';
      case 'medium': return 'text-yellow-400 border-yellow-400';
      case 'low': return 'text-green-400 border-green-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const handleCaseSelect = (caseId: string) => {
    setSelectedCase(caseId);
    setShowDecisionPanel(false);
  };

  const handleShowDecisionPanel = () => {
    setShowDecisionPanel(true);
  };

  const handleDecisionMade = () => {
    setShowDecisionPanel(false);
    fetchCases(); // Refresh cases after decision
  };

  if (showDecisionPanel && selectedCase) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => setShowDecisionPanel(false)}
            className="text-[#0b7e84] hover:text-[#096a70] font-medium"
          >
            ← Back to Case Details
          </button>
        </div>
        <JudgeDecisionPanel
          caseId={selectedCase}
          judgeId={judgeId}
          onDecisionMade={handleDecisionMade}
        />
      </div>
    );
  }

  if (selectedCase) {
    const case_ = cases.find(c => c.id === selectedCase);
    if (case_) {
      return (
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setSelectedCase(null)}
              className="text-[#0b7e84] hover:text-[#096a70] font-medium"
            >
              ← Back to Case List
            </button>
            <div className="flex space-x-3">
              <button
                onClick={() => window.open(`/court-room/${selectedCase}`, '_blank')}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                <MessageCircle size={16} />
                <span>Open Court Room</span>
              </button>
              {['open', 'investigating', 'under_review'].includes(case_.status) && (
                <button
                  onClick={handleShowDecisionPanel}
                  className="flex items-center space-x-2 bg-[#0b7e84] hover:bg-[#096a70] text-white px-4 py-2 rounded-lg transition"
                >
                  <Gavel size={16} />
                  <span>Make Decision</span>
                </button>
              )}
            </div>
          </div>

          {/* Case Detail View */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{case_.case_number}</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-300">
                  <span className="capitalize">{case_.dispute_type.replace('_', ' ')}</span>
                  <span className={`px-2 py-1 rounded-full border ${getPriorityColor(case_.priority_level)}`}>
                    {case_.priority_level}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(case_.status)}`}>
                    {case_.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">${case_.disputed_amount}</p>
                <p className="text-sm text-gray-400">Disputed Amount</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Case Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Opened:</span>
                    <span className="text-white">{new Date(case_.opened_at).toLocaleDateString()}</span>
                  </div>
                  {case_.assigned_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Assigned:</span>
                      <span className="text-white">{new Date(case_.assigned_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {case_.resolved_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Resolved:</span>
                      <span className="text-white">{new Date(case_.resolved_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {case_.last_activity && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Activity:</span>
                      <span className="text-white">{new Date(case_.last_activity).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Case Activity</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="text-blue-400" size={16} />
                      <span className="text-gray-300 text-sm">Messages</span>
                    </div>
                    <span className="text-white font-medium">{case_.message_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="text-green-400" size={16} />
                      <span className="text-gray-300 text-sm">Evidence</span>
                    </div>
                    <span className="text-white font-medium">{case_.evidence_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="text-orange-400" size={16} />
                      <span className="text-gray-300 text-sm">Complexity</span>
                    </div>
                    <span className="text-white font-medium">{case_.complexity_score}/10</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Financial Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Disputed:</span>
                    <span className="text-white font-medium">${case_.disputed_amount}</span>
                  </div>
                  {case_.refund_amount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">
                        {case_.refund_amount > 0 ? 'Refunded:' : 'Final Decision:'}
                      </span>
                      <span className={`font-medium ${
                        case_.refund_amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {case_.refund_amount > 0 ? `$${case_.refund_amount}` : 'No Refund'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Case Management</h1>
            <p className="text-gray-400">
              {viewMode === 'assigned' ? 'Your assigned cases' : 'All system cases'} 
              {filteredCases.length !== cases.length && ` (${filteredCases.length} of ${cases.length})`}
            </p>
          </div>
          
          {(judgeRank === 'senior' || judgeRank === 'chief') && (
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('assigned')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'assigned'
                    ? 'bg-[#0b7e84] text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                My Cases
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'all'
                    ? 'bg-[#0b7e84] text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All Cases
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by case number or dispute type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
            >
              <option value="assigned_at">Assigned Date</option>
              <option value="opened_at">Opened Date</option>
              <option value="priority_level">Priority</option>
              <option value="disputed_amount">Amount</option>
              <option value="case_number">Case Number</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:text-white transition"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b7e84] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading cases...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="text-center py-12">
          <Gavel className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">No Cases Found</h3>
          <p className="text-gray-400">
            {cases.length === 0 
              ? 'No cases have been assigned to you yet.'
              : 'No cases match your current filters.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((case_) => (
            <div
              key={case_.id}
              onClick={() => handleCaseSelect(case_.id)}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-700 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="font-mono text-lg font-bold text-white">{case_.case_number}</h3>
                    
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(case_.status)}
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(case_.status)}`}>
                        {case_.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <span className={`px-2 py-1 rounded-full border text-xs ${getPriorityColor(case_.priority_level)}`}>
                      {case_.priority_level}
                    </span>

                    <span className="text-xs text-gray-400">
                      Complexity: {case_.complexity_score}/10
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-300">
                    <span className="capitalize">{case_.dispute_type.replace('_', ' ')}</span>
                    <span>${case_.disputed_amount}</span>
                    <span>Opened: {new Date(case_.opened_at).toLocaleDateString()}</span>
                    {case_.assigned_at && (
                      <span>Assigned: {new Date(case_.assigned_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <MessageCircle size={14} />
                    <span>{case_.message_count}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText size={14} />
                    <span>{case_.evidence_count}</span>
                  </div>
                  <Eye className="text-gray-400" size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}