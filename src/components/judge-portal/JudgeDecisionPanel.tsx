import { useState, useEffect } from "react";
import { Gavel, DollarSign, FileText, CheckCircle, XCircle, AlertTriangle, Clock, Scale, Send, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DecisionPanelProps {
  caseId: string;
  judgeId: string;
  onDecisionMade: () => void;
}

interface CaseDetails {
  id: string;
  case_number: string;
  dispute_type: string;
  priority_level: string;
  status: string;
  disputed_amount: number;
  refund_amount?: number;
  learner_id: string;
  provider_id: string;
  opened_at: string;
  complexity_score: number;
  refunds: {
    id: string;
    amount: number;
    reason: string;
    payment_type: string;
    content_title?: string;
  };
}

interface Evidence {
  id: string;
  title: string;
  description?: string;
  evidence_type: string;
  evidence_weight: string;
  submitter_type: string;
  verified: boolean;
  created_at: string;
}

export default function JudgeDecisionPanel({ caseId, judgeId, onDecisionMade }: DecisionPanelProps) {
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [decision, setDecision] = useState<'approve' | 'reject' | ''>('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [reasoning, setReasoning] = useState('');
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [precedentCases, setPrecedentCases] = useState<any[]>([]);

  useEffect(() => {
    if (!caseId || !judgeId) return;

    const fetchCaseData = async () => {
      try {
        // Fetch case details
        const { data: caseData, error: caseError } = await supabase
          .from('court_cases')
          .select(`
            *,
            refunds(*)
          `)
          .eq('id', caseId)
          .single();

        if (caseError) throw caseError;
        setCaseDetails(caseData);
        setRefundAmount(caseData.disputed_amount.toString());

        // Fetch evidence
        const { data: evidenceData, error: evidenceError } = await supabase
          .from('dispute_evidence')
          .select('*')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false });

        if (evidenceError) throw evidenceError;
        setEvidence(evidenceData || []);

        // Fetch similar precedent cases
        const { data: precedentData, error: precedentError } = await supabase
          .from('court_cases')
          .select('case_number, dispute_type, disputed_amount, refund_amount, status')
          .eq('dispute_type', caseData.dispute_type)
          .eq('status', 'resolved')
          .neq('id', caseId)
          .limit(5);

        if (!precedentError && precedentData) {
          setPrecedentCases(precedentData);
        }

      } catch (error) {
        console.error('Error fetching case data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [caseId, judgeId]);

  const handleDecisionSubmit = async () => {
    if (!decision || !reasoning.trim() || submitting) return;

    // Validation
    if (decision === 'approve' && (!refundAmount || parseFloat(refundAmount) <= 0)) {
      alert('Please enter a valid refund amount for approval');
      return;
    }

    if (decision === 'approve' && parseFloat(refundAmount) > (caseDetails?.disputed_amount || 0)) {
      const confirm = window.confirm('Refund amount exceeds disputed amount. Are you sure you want to proceed?');
      if (!confirm) return;
    }

    setSubmitting(true);
    try {
      const finalRefundAmount = decision === 'approve' ? parseFloat(refundAmount) : 0;

      // Submit decision via API
      const response = await fetch(`/api/court/case/${caseId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-judge-id': judgeId
        },
        body: JSON.stringify({
          decision,
          refundAmount: finalRefundAmount,
          reasoning: reasoning.trim(),
          newStatus: 'resolved'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit decision');
      }

      // Add internal notes if provided
      if (internalNotes.trim()) {
        await supabase
          .from('case_messages')
          .insert({
            case_id: caseId,
            sender_id: judgeId,
            sender_type: 'judge',
            message_type: 'text',
            content: `**INTERNAL JUDGE NOTES:**\n\n${internalNotes.trim()}`,
            is_internal: true,
            visible_to: ['judge']
          });
      }

      // Log judge activity
      await supabase
        .from('judge_activity_log')
        .insert({
          judge_id: judgeId,
          case_id: caseId,
          activity_type: 'decision_made',
          description: `Judge ${decision}ed case ${caseDetails?.case_number} with ${decision === 'approve' ? `$${finalRefundAmount} refund` : 'no refund'}`,
          metadata: {
            decision,
            refund_amount: finalRefundAmount,
            reasoning: reasoning.substring(0, 200)
          }
        });

      onDecisionMade();
      alert(`Case ${decision}ed successfully!`);

    } catch (error) {
      console.error('Error submitting decision:', error);
      alert('Failed to submit decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateRecommendedRefund = () => {
    if (!caseDetails || !evidence.length) return caseDetails?.disputed_amount || 0;

    // Simple algorithm based on evidence weight and type
    const weightScores = { critical: 1.0, major: 0.8, normal: 0.6, minor: 0.4 };
    const evidenceScore = evidence.reduce((acc, ev) => {
      return acc + (weightScores[ev.evidence_weight as keyof typeof weightScores] || 0.5);
    }, 0) / evidence.length;

    // Provider vs Learner evidence ratio
    const providerEvidence = evidence.filter(e => e.submitter_type === 'provider').length;
    const learnerEvidence = evidence.filter(e => e.submitter_type === 'learner').length;
    const evidenceRatio = learnerEvidence / (learnerEvidence + providerEvidence || 1);

    // Calculate recommended percentage
    const basePercentage = evidenceScore * evidenceRatio;
    const recommendedPercentage = Math.min(Math.max(basePercentage, 0.1), 1.0);

    return Math.round(caseDetails.disputed_amount * recommendedPercentage * 100) / 100;
  };

  const getDecisionColor = (dec: string) => {
    switch (dec) {
      case 'approve': return 'text-green-400 border-green-400 bg-green-900';
      case 'reject': return 'text-red-400 border-red-400 bg-red-900';
      default: return 'text-gray-400 border-gray-400 bg-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b7e84] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (!caseDetails) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="text-center py-8">
          <AlertTriangle className="mx-auto text-red-400 mb-4" size={32} />
          <p className="text-red-300">Failed to load case details</p>
        </div>
      </div>
    );
  }

  if (caseDetails.status === 'resolved' || caseDetails.status === 'closed') {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="text-center py-8">
          <CheckCircle className="mx-auto text-green-400 mb-4" size={32} />
          <h3 className="text-xl font-bold text-white mb-2">Case Already Resolved</h3>
          <p className="text-gray-300">
            This case was resolved on {caseDetails.status === 'resolved' ? 'resolution date' : 'close date'}
          </p>
          {caseDetails.refund_amount !== undefined && (
            <p className="text-green-400 mt-2 font-semibold">
              Final refund amount: ${caseDetails.refund_amount}
            </p>
          )}
        </div>
      </div>
    );
  }

  const recommendedRefund = calculateRecommendedRefund();

  return (
    <div className="space-y-6">
      {/* Case Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Scale className="text-[#0b7e84]" size={24} />
            <h2 className="text-xl font-bold text-white">
              Case Decision - {caseDetails.case_number}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Complexity Score</p>
            <p className="text-lg font-semibold text-white">{caseDetails.complexity_score}/10</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Dispute Type</p>
            <p className="text-white font-medium capitalize">{caseDetails.dispute_type.replace('_', ' ')}</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Disputed Amount</p>
            <p className="text-white font-medium">${caseDetails.disputed_amount}</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Case Age</p>
            <p className="text-white font-medium">
              {Math.ceil((new Date().getTime() - new Date(caseDetails.opened_at).getTime()) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
        </div>
      </div>

      {/* Evidence Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Evidence Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Evidence Count: {evidence.length} items</p>
            <div className="flex space-x-4 text-sm">
              <span className="text-green-400">
                Learner: {evidence.filter(e => e.submitter_type === 'learner').length}
              </span>
              <span className="text-purple-400">
                Provider: {evidence.filter(e => e.submitter_type === 'provider').length}
              </span>
              <span className="text-yellow-400">
                Judge: {evidence.filter(e => e.submitter_type === 'judge').length}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Evidence Weight Distribution</p>
            <div className="flex space-x-4 text-sm">
              <span className="text-red-400">
                Critical: {evidence.filter(e => e.evidence_weight === 'critical').length}
              </span>
              <span className="text-orange-400">
                Major: {evidence.filter(e => e.evidence_weight === 'major').length}
              </span>
              <span className="text-blue-400">
                Normal: {evidence.filter(e => e.evidence_weight === 'normal').length}
              </span>
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <AlertTriangle className="text-blue-400" size={16} />
            <span className="font-medium text-blue-200">AI Recommendation</span>
          </div>
          <p className="text-blue-300 text-sm">
            Based on evidence analysis: <strong>${recommendedRefund}</strong> refund 
            ({Math.round((recommendedRefund / caseDetails.disputed_amount) * 100)}% of disputed amount)
          </p>
        </div>
      </div>

      {/* Precedent Cases */}
      {precedentCases.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Similar Precedent Cases</h3>
          <div className="space-y-2">
            {precedentCases.map((precedent, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-700 rounded-lg p-3 text-sm">
                <span className="text-gray-300">{precedent.case_number}</span>
                <span className="text-gray-400">${precedent.disputed_amount}</span>
                <span className={`font-medium ${
                  precedent.refund_amount > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {precedent.refund_amount > 0 
                    ? `$${precedent.refund_amount} refunded` 
                    : 'Rejected'
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Panel */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
          <Gavel className="text-yellow-400" size={20} />
          <span>Make Decision</span>
        </h3>

        {/* Decision Choice */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-400 mb-3">Decision</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setDecision('approve')}
              className={`flex items-center justify-center space-x-2 p-4 border-2 rounded-lg transition ${
                decision === 'approve' 
                  ? getDecisionColor('approve')
                  : 'border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-400'
              }`}
            >
              <CheckCircle size={20} />
              <span className="font-medium">Approve Refund</span>
            </button>
            
            <button
              onClick={() => setDecision('reject')}
              className={`flex items-center justify-center space-x-2 p-4 border-2 rounded-lg transition ${
                decision === 'reject' 
                  ? getDecisionColor('reject')
                  : 'border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400'
              }`}
            >
              <XCircle size={20} />
              <span className="font-medium">Reject Refund</span>
            </button>
          </div>
        </div>

        {/* Refund Amount (if approving) */}
        {decision === 'approve' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Refund Amount
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={caseDetails.disputed_amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={() => setRefundAmount(caseDetails.disputed_amount.toString())}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition"
              >
                Full Amount
              </button>
              <button
                onClick={() => setRefundAmount(recommendedRefund.toString())}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition"
              >
                AI Suggested
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Maximum: ${caseDetails.disputed_amount} • Recommended: ${recommendedRefund}
            </p>
          </div>
        )}

        {/* Reasoning */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Decision Reasoning (Required) *
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84]"
            placeholder="Provide detailed reasoning for your decision. This will be visible to all parties."
          />
          <p className="text-xs text-gray-400 mt-1">
            {reasoning.length}/500 characters
          </p>
        </div>

        {/* Internal Notes */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-400">
              Internal Judge Notes (Optional)
            </label>
            <button
              onClick={() => setShowInternalNotes(!showInternalNotes)}
              className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-300"
            >
              {showInternalNotes ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showInternalNotes ? 'Hide' : 'Show'} Internal Notes</span>
            </button>
          </div>
          
          {showInternalNotes && (
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84]"
              placeholder="Internal notes for other judges or case records. Not visible to parties."
            />
          )}
        </div>

        {/* Submit Decision */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-600">
          <div className="text-sm text-gray-400">
            <p>⚠️ This decision is final and will be immediately communicated to all parties.</p>
            <p>Provider restrictions will be lifted and financial transactions will be processed.</p>
          </div>
          
          <button
            onClick={handleDecisionSubmit}
            disabled={!decision || !reasoning.trim() || submitting}
            className="flex items-center space-x-2 bg-[#0b7e84] hover:bg-[#096a70] disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send size={16} />
            )}
            <span>{submitting ? 'Submitting...' : 'Submit Final Decision'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}