import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Scale, User, Clock, FileText, Image, Video, AlertTriangle, Shield, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CourtRoomProps {
  caseId: string;
  userId?: string;
  judgeId?: string;
  userRole: 'learner' | 'provider' | 'judge';
}

interface CaseMessage {
  id: string;
  case_id: string;
  sender_id: string;
  sender_type: 'learner' | 'provider' | 'judge' | 'system';
  message_type: 'text' | 'evidence' | 'decision' | 'system_update';
  content: string;
  evidence_id?: string;
  is_internal: boolean;
  visible_to: string[];
  created_at: string;
  edited_at?: string;
  read_by: Record<string, boolean>;
}

interface CaseEvidence {
  id: string;
  case_id: string;
  submitted_by: string;
  submitter_type: 'learner' | 'provider' | 'judge';
  evidence_type: 'text' | 'document' | 'image' | 'video' | 'audio' | 'screenshot' | 'system_log';
  title: string;
  description?: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  is_public: boolean;
  evidence_weight: 'minor' | 'normal' | 'major' | 'critical';
  verified: boolean;
  created_at: string;
}

interface CaseDetails {
  id: string;
  case_number: string;
  dispute_type: string;
  priority_level: string;
  status: string;
  disputed_amount: number;
  refund_amount?: number;
  opened_at: string;
  assigned_judge_id?: string;
  learner_id: string;
  provider_id: string;
  judges?: {
    full_name: string;
    email: string;
    rank: string;
  };
}

export default function CourtRoomInterface({ caseId, userId, judgeId, userRole }: CourtRoomProps) {
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [evidence, setEvidence] = useState<CaseEvidence[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'evidence' | 'details'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = judgeId || userId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!caseId || !currentUserId) return;

    const fetchCaseData = async () => {
      setLoading(true);
      try {
        // Fetch case details
        const { data: caseData, error: caseError } = await supabase
          .from('court_cases')
          .select(`
            *,
            judges(full_name, email, rank)
          `)
          .eq('id', caseId)
          .single();

        if (caseError) throw caseError;
        setCaseDetails(caseData);

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('case_messages')
          .select('*')
          .eq('case_id', caseId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(messagesData || []);

        // Fetch evidence
        const { data: evidenceData, error: evidenceError } = await supabase
          .from('dispute_evidence')
          .select('*')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false });

        if (evidenceError) throw evidenceError;
        setEvidence(evidenceData || []);

      } catch (error) {
        console.error('Error fetching case data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();

    // Set up real-time subscriptions
    const messageSubscription = supabase
      .channel(`case-messages-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_messages',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new as CaseMessage]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id ? payload.new as CaseMessage : msg
            ));
          }
        }
      )
      .subscribe();

    const evidenceSubscription = supabase
      .channel(`case-evidence-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispute_evidence',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEvidence(prev => [payload.new as CaseEvidence, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      evidenceSubscription.unsubscribe();
    };
  }, [caseId, currentUserId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('case_messages')
        .insert({
          case_id: caseId,
          sender_id: currentUserId,
          sender_type: userRole,
          message_type: 'text',
          content: newMessage.trim(),
          is_internal: false,
          visible_to: ['learner', 'provider', 'judge']
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getSenderName = (message: CaseMessage) => {
    if (message.sender_type === 'system') return 'System';
    if (message.sender_type === 'judge') return `Judge ${caseDetails?.judges?.full_name || 'Unknown'}`;
    if (message.sender_id === caseDetails?.learner_id) return 'Learner';
    if (message.sender_id === caseDetails?.provider_id) return 'Provider';
    return 'Unknown User';
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'judge': return <Scale className="text-yellow-400" size={16} />;
      case 'system': return <Shield className="text-blue-400" size={16} />;
      case 'learner': return <User className="text-green-400" size={16} />;
      case 'provider': return <User className="text-purple-400" size={16} />;
      default: return <User className="text-gray-400" size={16} />;
    }
  };

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'evidence': return <FileText size={16} />;
      case 'decision': return <Gavel size={16} />;
      case 'system_update': return <AlertTriangle size={16} />;
      default: return null;
    }
  };

  const getEvidenceTypeIcon = (evidenceType: string) => {
    switch (evidenceType) {
      case 'image': return <Image className="text-blue-400" size={20} />;
      case 'video': return <Video className="text-red-400" size={20} />;
      case 'document': return <FileText className="text-green-400" size={20} />;
      default: return <FileText className="text-gray-400" size={20} />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b7e84] mx-auto mb-4"></div>
          <p>Loading Court Room...</p>
        </div>
      </div>
    );
  }

  if (!caseDetails) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-2">Case Not Found</h2>
          <p className="text-gray-400">The requested court case could not be found or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Scale className="text-[#0b7e84]" size={32} />
            <div>
              <h1 className="text-2xl font-bold">Court Room - Case {caseDetails.case_number}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-300">
                <span className="capitalize">{caseDetails.dispute_type.replace('_', ' ')}</span>
                <span>•</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  caseDetails.priority_level === 'high' ? 'bg-red-600' :
                  caseDetails.priority_level === 'medium' ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}>
                  {caseDetails.priority_level} Priority
                </span>
                <span>•</span>
                <span>${caseDetails.disputed_amount}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Assigned Judge</p>
            <p className="font-semibold">{caseDetails.judges?.full_name || 'Unassigned'}</p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <nav className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'chat', label: 'Live Chat', icon: '💬' },
              { id: 'evidence', label: 'Evidence', icon: '📁' },
              { id: 'details', label: 'Case Details', icon: 'ℹ️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'border-[#0b7e84] text-[#0b7e84]'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {activeTab === 'chat' && (
          <>
            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => {
                  const isOwnMessage = message.sender_id === currentUserId;
                  const senderName = getSenderName(message);
                  
                  return (
                    <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.sender_type === 'system' 
                          ? 'bg-blue-900 border border-blue-700 mx-auto text-center'
                          : message.sender_type === 'judge'
                          ? 'bg-yellow-900 border border-yellow-700'
                          : isOwnMessage
                          ? 'bg-[#0b7e84] text-white'
                          : 'bg-gray-700 text-white'
                      }`}>
                        {/* Message Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getSenderIcon(message.sender_type)}
                            <span className="text-xs font-medium">{senderName}</span>
                            {getMessageTypeIcon(message.message_type) && (
                              <div className="text-xs opacity-75">
                                {getMessageTypeIcon(message.message_type)}
                              </div>
                            )}
                          </div>
                          <span className="text-xs opacity-75">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {/* Message Content */}
                        <div className={`text-sm ${message.message_type === 'decision' ? 'font-semibold' : ''}`}>
                          {message.content.split('\n').map((line, index) => (
                            <div key={index}>{line}</div>
                          ))}
                        </div>
                        
                        {/* Evidence Link */}
                        {message.evidence_id && (
                          <div className="mt-2 pt-2 border-t border-opacity-30">
                            <span className="text-xs opacity-75">📎 Evidence attached</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex items-center space-x-4">
                  <button className="p-2 text-gray-400 hover:text-gray-300 transition">
                    <Paperclip size={20} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84]"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-[#0b7e84] hover:bg-[#096a70] disabled:bg-gray-600 text-white p-2 rounded-lg transition"
                  >
                    <Send size={20} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  All messages are visible to learner, provider, and assigned judge.
                </p>
              </div>
            </div>

            {/* Participants Sidebar */}
            <div className="w-80 bg-gray-800 border-l border-gray-700 p-6">
              <h3 className="font-semibold text-white mb-4">Case Participants</h3>
              
              <div className="space-y-4">
                {/* Judge */}
                <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Scale className="text-yellow-400" size={20} />
                    <div>
                      <p className="font-medium text-yellow-200">Presiding Judge</p>
                      <p className="text-sm text-yellow-300">{caseDetails.judges?.full_name || 'Unassigned'}</p>
                      {caseDetails.judges?.rank && (
                        <p className="text-xs text-yellow-400 capitalize">{caseDetails.judges.rank} Judge</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Learner */}
                <div className="bg-green-900 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <User className="text-green-400" size={20} />
                    <div>
                      <p className="font-medium text-green-200">Complainant (Learner)</p>
                      <p className="text-sm text-green-300">Requesting refund</p>
                    </div>
                  </div>
                </div>

                {/* Provider */}
                <div className="bg-purple-900 border border-purple-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <User className="text-purple-400" size={20} />
                    <div>
                      <p className="font-medium text-purple-200">Defendant (Provider)</p>
                      <p className="text-sm text-purple-300">Service provider</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Case Status */}
              <div className="mt-6 pt-6 border-t border-gray-600">
                <h4 className="font-medium text-white mb-3">Case Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`capitalize ${
                      caseDetails.status === 'resolved' ? 'text-green-400' :
                      caseDetails.status === 'under_review' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>
                      {caseDetails.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Opened:</span>
                    <span className="text-white">{new Date(caseDetails.opened_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Evidence:</span>
                    <span className="text-white">{evidence.length} items</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'evidence' && (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Case Evidence</h2>
              
              {evidence.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-400">No evidence has been submitted yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {evidence.map((item) => (
                    <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      {/* Evidence Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getEvidenceTypeIcon(item.evidence_type)}
                          <span className="text-xs text-gray-400 capitalize">{item.evidence_type}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.evidence_weight === 'critical' ? 'bg-red-600' :
                          item.evidence_weight === 'major' ? 'bg-orange-600' :
                          item.evidence_weight === 'normal' ? 'bg-blue-600' :
                          'bg-gray-600'
                        }`}>
                          {item.evidence_weight}
                        </span>
                      </div>

                      {/* Evidence Title */}
                      <h3 className="font-medium text-white mb-2">{item.title}</h3>
                      
                      {/* Evidence Description */}
                      {item.description && (
                        <p className="text-sm text-gray-300 mb-3">{item.description}</p>
                      )}

                      {/* File Info */}
                      {item.file_name && (
                        <div className="text-xs text-gray-400 mb-3">
                          <div>{item.file_name}</div>
                          {item.file_size && <div>{formatFileSize(item.file_size)}</div>}
                        </div>
                      )}

                      {/* Evidence Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-600">
                        <span className="capitalize">
                          By {item.submitter_type === 'judge' ? 'Judge' : item.submitter_type}
                        </span>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {item.verified && (
                        <div className="mt-2 flex items-center space-x-1 text-green-400 text-xs">
                          <Shield size={12} />
                          <span>Verified by Judge</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Case Details</h2>
              
              <div className="grid gap-6 md:grid-cols-2">
                {/* Case Information */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="font-semibold text-white mb-4">Case Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Case Number:</span>
                      <span className="text-white font-mono">{caseDetails.case_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dispute Type:</span>
                      <span className="text-white capitalize">{caseDetails.dispute_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Priority:</span>
                      <span className={`capitalize ${
                        caseDetails.priority_level === 'high' ? 'text-red-400' :
                        caseDetails.priority_level === 'medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {caseDetails.priority_level}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-white capitalize">{caseDetails.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Opened:</span>
                      <span className="text-white">{new Date(caseDetails.opened_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="font-semibold text-white mb-4">Financial Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Disputed Amount:</span>
                      <span className="text-white font-semibold">${caseDetails.disputed_amount}</span>
                    </div>
                    {caseDetails.refund_amount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Approved Refund:</span>
                        <span className="text-green-400 font-semibold">${caseDetails.refund_amount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Case Timeline would go here */}
              <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Case Timeline</h3>
                <p className="text-gray-400 text-sm">Timeline visualization coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}