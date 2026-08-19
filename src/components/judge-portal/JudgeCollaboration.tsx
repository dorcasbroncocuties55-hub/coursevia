import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, Scale, Users, AlertTriangle, FileText, Eye, Clock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CollaborationProps {
  judgeId: string;
  judgeData: {
    id: string;
    full_name: string;
    rank: string;
  };
}

interface JudgeMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_rank: string;
  recipient_id?: string;
  recipient_name?: string;
  case_id?: string;
  case_number?: string;
  message_type: 'consultation' | 'escalation' | 'general' | 'case_transfer';
  subject: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
}

interface Judge {
  id: string;
  full_name: string;
  rank: string;
  specialization: string[];
  status: string;
  last_login?: string;
}

export default function JudgeCollaboration({ judgeId, judgeData }: CollaborationProps) {
  const [messages, setMessages] = useState<JudgeMessage[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [messageType, setMessageType] = useState<'consultation' | 'escalation' | 'general' | 'case_transfer'>('general');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [selectedCase, setSelectedCase] = useState('');
  const [availableCases, setAvailableCases] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'consultations'>('inbox');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchJudges();
    fetchMessages();
    fetchAvailableCases();
  }, [judgeId]);

  useEffect(() => {
    // Set up real-time subscription for messages
    const subscription = supabase
      .channel(`judge-messages-${judgeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'judge_messages',
          filter: `recipient_id=eq.${judgeId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [payload.new as JudgeMessage, ...prev]);
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [judgeId]);

  const fetchJudges = async () => {
    try {
      const { data, error } = await supabase
        .from('judges')
        .select('*')
        .eq('status', 'active')
        .neq('id', judgeId)
        .order('rank', { ascending: false });

      if (error) throw error;
      setJudges(data || []);
    } catch (error) {
      console.error('Error fetching judges:', error);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // Create a view or function to get messages with sender/recipient names
      const { data, error } = await supabase
        .from('judge_messages')
        .select(`
          *,
          sender:judges!sender_id(full_name, rank),
          recipient:judges!recipient_id(full_name, rank),
          case:court_cases(case_number)
        `)
        .or(`sender_id.eq.${judgeId},recipient_id.eq.${judgeId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedMessages = (data || []).map(msg => ({
        ...msg,
        sender_name: msg.sender?.full_name || 'Unknown',
        sender_rank: msg.sender?.rank || 'junior',
        recipient_name: msg.recipient?.full_name,
        case_number: msg.case?.case_number,
        is_read: msg.recipient_id === judgeId ? msg.is_read : true
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCases = async () => {
    try {
      const { data, error } = await supabase
        .from('judge_case_assignments')
        .select(`
          court_cases(id, case_number, dispute_type, status)
        `)
        .eq('judge_id', judgeId);

      if (error) throw error;

      const cases = (data || [])
        .map(assignment => assignment.court_cases)
        .filter(case_ => case_ && ['open', 'investigating', 'under_review'].includes(case_.status));

      setAvailableCases(cases);
    } catch (error) {
      console.error('Error fetching available cases:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !newSubject.trim() || !selectedRecipient || sending) return;

    setSending(true);
    try {
      const messageData = {
        sender_id: judgeId,
        recipient_id: selectedRecipient,
        case_id: selectedCase || null,
        message_type: messageType,
        subject: newSubject.trim(),
        content: newMessage.trim(),
        priority,
        is_read: false
      };

      const { error } = await supabase
        .from('judge_messages')
        .insert(messageData);

      if (error) throw error;

      // Log the collaboration activity
      await supabase
        .from('judge_activity_log')
        .insert({
          judge_id: judgeId,
          case_id: selectedCase || null,
          activity_type: 'judge_collaboration',
          description: `Sent ${messageType} message to ${judges.find(j => j.id === selectedRecipient)?.full_name}`,
          metadata: { message_type: messageType, priority, subject: newSubject }
        });

      // Reset form
      setNewMessage('');
      setNewSubject('');
      setSelectedRecipient('');
      setMessageType('general');
      setPriority('normal');
      setSelectedCase('');
      setActiveTab('inbox');

      alert('Message sent successfully!');
      fetchMessages();

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('judge_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-900';
      case 'high': return 'text-orange-400 bg-orange-900';
      case 'normal': return 'text-blue-400 bg-blue-900';
      case 'low': return 'text-gray-400 bg-gray-700';
      default: return 'text-gray-400 bg-gray-700';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <MessageCircle className="text-blue-400" size={16} />;
      case 'escalation': return <AlertTriangle className="text-red-400" size={16} />;
      case 'case_transfer': return <FileText className="text-yellow-400" size={16} />;
      default: return <MessageCircle className="text-gray-400" size={16} />;
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'chief': return 'text-yellow-400';
      case 'senior': return 'text-blue-400';
      case 'junior': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getUnreadCount = () => {
    return messages.filter(msg => msg.recipient_id === judgeId && !msg.is_read).length;
  };

  const getConsultationMessages = () => {
    return messages.filter(msg => 
      msg.message_type === 'consultation' || msg.message_type === 'escalation'
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b7e84] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading collaboration workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Judge Collaboration</h1>
        <p className="text-gray-400">Consult with fellow judges and share expertise on complex cases</p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition ${
              activeTab === 'inbox'
                ? 'border-[#0b7e84] text-[#0b7e84]'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <MessageCircle size={16} />
            <span>Inbox</span>
            {getUnreadCount() > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-2">
                {getUnreadCount()}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('consultations')}
            className={`flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition ${
              activeTab === 'consultations'
                ? 'border-[#0b7e84] text-[#0b7e84]'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <Scale size={16} />
            <span>Consultations</span>
            <span className="text-xs text-gray-500">({getConsultationMessages().length})</span>
          </button>

          <button
            onClick={() => setActiveTab('compose')}
            className={`flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition ${
              activeTab === 'compose'
                ? 'border-[#0b7e84] text-[#0b7e84]'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <Send size={16} />
            <span>Compose</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Messages</h2>
            <p className="text-gray-400">{messages.length} total messages</p>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">No Messages</h3>
              <p className="text-gray-400">Start collaborating with fellow judges</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => {
                    setSelectedConversation(message.id);
                    if (message.recipient_id === judgeId && !message.is_read) {
                      markAsRead(message.id);
                    }
                  }}
                  className={`bg-gray-800 border rounded-lg p-4 cursor-pointer transition hover:bg-gray-700 ${
                    message.recipient_id === judgeId && !message.is_read 
                      ? 'border-[#0b7e84] bg-gray-750' 
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getMessageTypeIcon(message.message_type)}
                        <span className="font-medium text-white">
                          {message.sender_id === judgeId ? 'To: ' : 'From: '}
                          {message.sender_id === judgeId ? message.recipient_name : message.sender_name}
                        </span>
                        <span className={`text-xs capitalize ${getRankColor(
                          message.sender_id === judgeId ? 
                          judges.find(j => j.id === message.recipient_id)?.rank || 'junior' :
                          message.sender_rank
                        )}`}>
                          {message.sender_id === judgeId ? 
                            judges.find(j => j.id === message.recipient_id)?.rank || 'junior' :
                            message.sender_rank
                          } Judge
                        </span>
                      </div>
                      
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(message.priority)}`}>
                        {message.priority}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-gray-400">
                      {message.case_number && (
                        <span className="font-mono">{message.case_number}</span>
                      )}
                      <span>{new Date(message.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <h4 className="font-medium text-white mb-2">{message.subject}</h4>
                  <p className="text-gray-300 text-sm line-clamp-2">{message.content}</p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400 capitalize">
                        {message.message_type.replace('_', ' ')}
                      </span>
                      {message.case_number && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-xs text-gray-400">Case Related</span>
                        </>
                      )}
                    </div>
                    
                    {message.recipient_id === judgeId && !message.is_read && (
                      <div className="w-2 h-2 bg-[#0b7e84] rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'consultations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Case Consultations</h2>
            <p className="text-gray-400">{getConsultationMessages().length} consultations</p>
          </div>

          <div className="space-y-3">
            {getConsultationMessages().map((message) => (
              <div key={message.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getMessageTypeIcon(message.message_type)}
                    <span className="font-medium text-white">{message.subject}</span>
                    {message.case_number && (
                      <span className="font-mono text-sm text-[#0b7e84]">{message.case_number}</span>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(message.priority)}`}>
                    {message.priority}
                  </span>
                </div>
                
                <p className="text-gray-300 mb-3">{message.content}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>
                    {message.sender_id === judgeId ? 'You' : message.sender_name} • 
                    {new Date(message.created_at).toLocaleDateString()}
                  </span>
                  <span className="capitalize">{message.message_type.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'compose' && (
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Compose Message</h2>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient *
              </label>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
              >
                <option value="">Select a judge...</option>
                {judges.map((judge) => (
                  <option key={judge.id} value={judge.id}>
                    {judge.full_name} ({judge.rank} Judge) - {judge.specialization.join(', ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Type and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message Type
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
                >
                  <option value="general">General Discussion</option>
                  <option value="consultation">Case Consultation</option>
                  <option value="escalation">Case Escalation</option>
                  <option value="case_transfer">Case Transfer Request</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Case Selection (if applicable) */}
            {(messageType === 'consultation' || messageType === 'escalation' || messageType === 'case_transfer') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Related Case (Optional)
                </label>
                <select
                  value={selectedCase}
                  onChange={(e) => setSelectedCase(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
                >
                  <option value="">No case selected</option>
                  {availableCases.map((case_) => (
                    <option key={case_.id} value={case_.id}>
                      {case_.case_number} - {case_.dispute_type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84]"
                placeholder="Brief description of your message"
                maxLength={100}
              />
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message *
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84]"
                placeholder="Describe your question, concern, or consultation request..."
                maxLength={1000}
              />
              <p className="text-xs text-gray-400 mt-1">
                {newMessage.length}/1000 characters
              </p>
            </div>

            {/* Send Button */}
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-400">
                Messages are sent securely between judges only
              </p>
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !newSubject.trim() || !selectedRecipient || sending}
                className="flex items-center space-x-2 bg-[#0b7e84] hover:bg-[#096a70] disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send size={16} />
                )}
                <span>{sending ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}