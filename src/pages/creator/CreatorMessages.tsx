import { useState, useEffect, useRef } from "react";
import { Search, Send, Paperclip, MoreVertical, Star, Archive } from "lucide-react";
import { getConversations, getConversation, sendMessage, subscribeToConversation } from "@/lib/api/messagingService";
import { formatNotificationTime } from "@/lib/api/notificationService";

const S = {
  accent: "#4F46E5",
  accentLight: "#EEF2FF",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  dim: "#64748B",
  full: "#0F172A",
  success: "#10B981",
  warning: "#F59E0B",
};

export default function CreatorMessages() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.otherUserId);
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedConv) return;

    const channel = subscribeToConversation(
      selectedConv.courseId,
      selectedConv.otherUserId,
      (message) => {
        setMessages(prev => [...prev, message]);
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [selectedConv]);

  const loadConversations = async () => {
    setLoading(true);
    const { data } = await getConversations({ limit: 50 });
    if (data) {
      setConversations(data);
      if (data.length > 0) {
        setSelectedConv(data[0]);
      }
    }
    setLoading(false);
  };

  const loadMessages = async (otherUserId: string) => {
    const { data } = await getConversation(selectedConv.courseId, otherUserId, { limit: 100 });
    if (data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;

    const { data } = await sendMessage(
      selectedConv.courseId,
      selectedConv.otherUserId,
      newMessage
    );

    if (data) {
      setMessages(prev => [...prev, data]);
      setNewMessage("");
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <div style={{ fontSize: 16, color: S.dim }}>Loading messages...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter,sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: S.full, margin: 0, marginBottom: 8 }}>
          Messages
        </h1>
        <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
          Communicate with your students
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: 24, height: "calc(100vh - 220px)" }}>
        {/* Conversations sidebar */}
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Search */}
          <div style={{ padding: 16, borderBottom: `1px solid ${S.border}` }}>
            <div style={{ position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.dim }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 40px",
                  border: `1px solid ${S.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "Inter,sans-serif",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredConversations.map((conv) => (
              <div
                key={`${conv.courseId}-${conv.otherUserId}`}
                onClick={() => setSelectedConv(conv)}
                style={{
                  padding: 16,
                  borderBottom: `1px solid ${S.border}`,
                  cursor: "pointer",
                  background: selectedConv?.otherUserId === conv.otherUserId ? S.accentLight : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (selectedConv?.otherUserId !== conv.otherUserId) {
                    e.currentTarget.style.background = S.bg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedConv?.otherUserId !== conv.otherUserId) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: S.accentLight,
                    color: S.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 16,
                    flexShrink: 0,
                  }}>
                    {getInitials(conv.otherUserName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: S.full }}>{conv.otherUserName}</span>
                      {conv.unreadCount > 0 && (
                        <div style={{
                          minWidth: 20,
                          height: 20,
                          borderRadius: 10,
                          background: S.accent,
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "0 6px",
                        }}>
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: S.dim, marginBottom: 4 }}>
                      {conv.courseTitle}
                    </div>
                    <div style={{ fontSize: 13, color: S.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.lastMessage}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredConversations.length === 0 && (
              <div style={{ padding: "60px 20px", textAlign: "center", color: S.dim, fontSize: 14 }}>
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        {selectedConv ? (
          <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Chat header */}
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: S.accentLight,
                  color: S.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: 14,
                }}>
                  {getInitials(selectedConv.otherUserName)}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: S.full }}>{selectedConv.otherUserName}</div>
                  <div style={{ fontSize: 13, color: S.dim }}>{selectedConv.courseTitle}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Star size={18} style={{ color: S.dim }} />
                </button>
                <button style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Archive size={18} style={{ color: S.dim }} />
                </button>
                <button style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <MoreVertical size={18} style={{ color: S.dim }} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {messages.map((msg) => {
                const isCreator = msg.sender_id !== selectedConv.otherUserId;
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: isCreator ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "70%",
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: isCreator ? S.accent : S.bg,
                      color: isCreator ? "#FFFFFF" : S.full,
                    }}>
                      <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 4 }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right" }}>
                        {formatNotificationTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div style={{ padding: 16, borderTop: `1px solid ${S.border}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Paperclip size={18} style={{ color: S.dim }} />
                </button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    border: `1px solid ${S.border}`,
                    borderRadius: 8,
                    fontSize: 15,
                    fontFamily: "Inter,sans-serif",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border: "none",
                    background: newMessage.trim() ? S.accent : S.border,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: newMessage.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                  }}
                >
                  <Send size={18} style={{ color: "#FFFFFF" }} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: S.dim }}>
              <p style={{ fontSize: 16, margin: 0 }}>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
