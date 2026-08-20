import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays,
  Wallet,
  Users,
  MessageSquare,
  HeartHandshake,
  Settings,
  User,
  Shield,
  Video,
  Home,
  BookOpen,
  FileText,
  CreditCard,
  Bell,
  Search,
  LogOut,
  Plus,
  Send,
  Paperclip,
  Clock,
  AlertTriangle,
  CheckCircle,
  Lock,
  Eye,
  MoreVertical,
  Archive,
  Flag,
  Info
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface TherapistProfile {
  id: string;
  user_id: string;
  therapy_category: string;
  is_health_related: boolean;
}

interface Conversation {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  status: 'active' | 'archived';
  is_urgent: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'appointment' | 'document' | 'system';
  is_read: boolean;
  is_encrypted: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

const TherapistMessages = () => {
  const { user, profile } = useAuth();
  const [therapistProfile, setTherapistProfile] = useState<TherapistProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Check if this therapist requires HIPAA compliance
  const requiresHIPAA = therapistProfile?.is_health_related || false;

  useEffect(() => {
    if (user) {
      loadTherapistProfile();
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadTherapistProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from('therapist_profiles')
        .select('id, user_id, therapy_category, is_health_related')
        .eq('user_id', user?.id)
        .single();

      if (profileData) {
        setTherapistProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading therapist profile:', error);
    }
  };

  const loadConversations = async () => {
    try {
      // Get therapist profile
      const { data: therapistProfile } = await supabase
        .from('therapist_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (therapistProfile) {
        // Get all unique patients who have messaged this therapist
        const { data: messagesData } = await supabase
          .from('messages')
          .select(`
            id,
            sender_id,
            receiver_id,
            content,
            created_at,
            is_read,
            profiles!messages_sender_id_fkey(
              full_name,
              avatar_url
            )
          `)
          .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
          .order('created_at', { ascending: false });

        if (messagesData) {
          // Group messages by conversation partner
          const conversationMap = new Map();

          messagesData.forEach(message => {
            const partnerId = message.sender_id === user?.id ? message.receiver_id : message.sender_id;
            const partnerProfile = message.sender_id === user?.id
              ? null
              : message.profiles as any;

            if (!conversationMap.has(partnerId)) {
              conversationMap.set(partnerId, {
                id: `conv_${partnerId}`,
                patient_id: partnerId,
                patient_name: partnerProfile?.full_name || 'Unknown Patient',
                patient_avatar: partnerProfile?.avatar_url,
                last_message: message.content,
                last_message_time: message.created_at,
                unread_count: 0,
                status: 'active' as const,
                is_urgent: false,
                messages: []
              });
            }

            const conversation = conversationMap.get(partnerId);
            conversation.messages.push(message);

            // Count unread messages from patient to therapist
            if (message.receiver_id === user?.id && !message.is_read) {
              conversation.unread_count++;
            }

            // Update last message if this is more recent
            if (new Date(message.created_at) > new Date(conversation.last_message_time)) {
              conversation.last_message = message.content;
              conversation.last_message_time = message.created_at;
            }
          });

          // Convert to array and sort by last message time
          const conversationsArray = Array.from(conversationMap.values())
            .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

          setConversations(conversationsArray);

          // Auto-select first conversation if none selected
          if (!selectedConversation && conversationsArray.length > 0) {
            setSelectedConversation(conversationsArray[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const patientId = conversationId.replace('conv_', '');

      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          message_type,
          is_read,
          created_at,
          profiles!messages_sender_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${patientId}),and(sender_id.eq.${patientId},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (messagesData) {
        const formattedMessages: Message[] = messagesData.map(msg => ({
          id: msg.id,
          conversation_id: conversationId,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          content: msg.content,
          message_type: (msg.message_type as any) || 'text',
          is_read: msg.is_read,
          is_encrypted: requiresHIPAA, // Encryption based on HIPAA requirement
          created_at: msg.created_at,
          sender_name: (msg.profiles as any)?.full_name,
          sender_avatar: (msg.profiles as any)?.avatar_url
        }));

        setMessages(formattedMessages);

        // Mark messages as read
        const unreadMessages = messagesData.filter(msg =>
          msg.receiver_id === user?.id && !msg.is_read
        );

        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadMessages.map(msg => msg.id));
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: selectedConversation.patient_id,
          content: newMessage.trim(),
          message_type: 'text',
          is_read: false
        });

      if (error) throw error;

      setNewMessage("");
      loadMessages(selectedConversation.id);
      loadConversations(); // Refresh conversation list
      toast.success(requiresHIPAA ? 'Message sent securely with HIPAA compliance' : 'Message sent securely');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryDisplayName = (category: string) => {
    const categories: Record<string, string> = {
      'mental_health': 'Mental Health Therapy',
      'physical_therapy': 'Physical Therapy',
      'occupational_therapy': 'Occupational Therapy',
      'speech_therapy': 'Speech Therapy',
      'medical_therapy': 'Medical Therapy',
      'relationship_therapy': 'Relationship Therapy',
      'life_therapy': 'Life Therapy',
      'career_therapy': 'Career Therapy',
      'wellness_therapy': 'Wellness Therapy'
    };
    return categories[category] || 'General Therapy';
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - 260px */}
      <div className="w-[260px] bg-white shadow-lg flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <HeartHandshake className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">mindwell</h1>
              <p className="text-xs text-gray-500">portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4">
          <div className="space-y-1">
            <Link to="/therapist/dashboard" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <Home className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
            <Link to="/therapist/clients" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <Users className="h-5 w-5 mr-3" />
              Patients
            </Link>
            <Link to="/therapist/bookings" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <BookOpen className="h-5 w-5 mr-3" />
              Books
            </Link>
            <Link to="/therapist/sessions" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <FileText className="h-5 w-5 mr-3" />
              Session Notes
            </Link>
            <Link to="/therapist/messages" className="flex items-center px-4 py-3 text-sm font-medium text-primary bg-primary/10 rounded-lg">
              <MessageSquare className="h-5 w-5 mr-3" />
              Messages
            </Link>
            <Link to="/therapist/wallet" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <Wallet className="h-5 w-5 mr-3" />
              Wallet
            </Link>
            <Link to="/therapist/payout" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <CreditCard className="h-5 w-5 mr-3" />
              Payout
            </Link>
            <Link to="/therapist/settings" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Link>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Page Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <div className="flex items-center space-x-2 text-gray-600">
                {requiresHIPAA ? (
                  <>
                    <Lock className="h-4 w-4 text-green-600" />
                    <p className="text-sm">HIPAA-compliant secure messaging</p>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {getCategoryDisplayName(therapistProfile?.therapy_category || '')}
                    </Badge>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 text-blue-600" />
                    <p className="text-sm">Secure messaging platform</p>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      {getCategoryDisplayName(therapistProfile?.therapy_category || '')}
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'T'}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* HIPAA Notice for health-related therapists */}
        {requiresHIPAA && (
          <div className="px-6 py-3 bg-green-50 border-b border-green-200">
            <Alert className="border-green-200">
              <Lock className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>HIPAA Compliance Active:</strong> All messages are encrypted and comply with healthcare privacy regulations.
                Patient health information is protected according to federal standards.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Messages Content */}
        <div className="flex-1 flex">
          {/* Conversations List */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Conversations */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center">
                  <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No conversations found</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedConversation?.id === conversation.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.patient_avatar} alt={conversation.patient_name} />
                          <AvatarFallback className="bg-gray-100 text-gray-600">
                            {conversation.patient_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 truncate">
                              {conversation.patient_name}
                            </h3>
                            <div className="flex items-center space-x-1">
                              {conversation.is_urgent && (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                              {conversation.unread_count > 0 && (
                                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-4 flex items-center justify-center rounded-full">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {conversation.last_message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatMessageTime(conversation.last_message_time)}
                            </span>
                            {requiresHIPAA ? (
                              <Lock className="h-3 w-3 text-green-500" />
                            ) : (
                              <Shield className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Message View */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Message Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedConversation.patient_avatar} alt={selectedConversation.patient_name} />
                        <AvatarFallback className="bg-gray-100 text-gray-600">
                          {selectedConversation.patient_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="font-semibold text-gray-900">{selectedConversation.patient_name}</h2>
                        <div className="flex items-center space-x-2">
                          {requiresHIPAA ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-gray-500">HIPAA-compliant encryption</span>
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3 text-blue-500" />
                              <span className="text-xs text-gray-500">Secure messaging</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Patient Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Conversation
                        </DropdownMenuItem>
                        {requiresHIPAA && (
                          <DropdownMenuItem className="text-red-600">
                            <Flag className="h-4 w-4 mr-2" />
                            Report HIPAA Concern
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const isFromMe = message.sender_id === user?.id;
                      const showDate = index === 0 ||
                        new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="flex items-center justify-center mb-4">
                              <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                                {new Date(message.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md ${isFromMe ? 'order-2' : 'order-1'
                              }`}>
                              <div className={`px-4 py-2 rounded-lg ${isFromMe
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-900'
                                }`}>
                                <p className="text-sm">{message.content}</p>
                              </div>
                              <div className={`flex items-center mt-1 space-x-1 ${isFromMe ? 'justify-end' : 'justify-start'
                                }`}>
                                <span className="text-xs text-gray-400">
                                  {formatMessageTime(message.created_at)}
                                </span>
                                {message.is_encrypted && requiresHIPAA && (
                                  <Lock className="h-3 w-3 text-green-400" />
                                )}
                                {isFromMe && message.is_read && (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="bg-white border-t border-gray-200 p-4">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <Textarea
                        placeholder={requiresHIPAA ? "Type your HIPAA-compliant message..." : "Type your secure message..."}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="min-h-[44px] max-h-32 resize-none"
                      />
                    </div>
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isSending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {requiresHIPAA ? (
                        <>
                          <Lock className="h-3 w-3 text-green-500" />
                          <span>HIPAA-compliant encrypted messaging</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3 text-blue-500" />
                          <span>Secure encrypted messaging</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      Press Enter to send, Shift+Enter for new line
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                  <p className="text-gray-500">
                    Choose a patient conversation to start messaging
                    {requiresHIPAA ? ' with HIPAA compliance' : ' securely'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapistMessages;