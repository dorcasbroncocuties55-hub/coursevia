import { useState } from "react";
import { Search, Send, Paperclip, MoreVertical, Star, Archive, Trash2 } from "lucide-react";

// ── Figma-exact Creator Portal design tokens (Indigo theme) ──────────────────
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

// Mock messages data
const CONVERSATIONS = [
  {
    id: 1,
    student: "Sarah Johnson",
    avatar: "SJ",
    lastMessage: "Thank you for the detailed explanation on async/await patterns!",
    timestamp: "2 min ago",
    unread: true,
    course: "Advanced React Patterns",
  },
  {
    id: 2,
    student: "Michael Chen",
    avatar: "MC",
    lastMessage: "Could you clarify the TypeScript generics section?",
    timestamp: "1 hour ago",
    unread: true,
    course: "TypeScript Masterclass",
  },
  {
    id: 3,
    student: "Emily Davis",
    avatar: "ED",
    lastMessage: "The course materials are excellent, really enjoying it so far",
    timestamp: "3 hours ago",
    unread: false,
    course: "Node.js Backend Dev",
  },
  {
    id: 4,
    student: "James Wilson",
    avatar: "JW",
    lastMessage: "When will the next module be available?",
    timestamp: "Yesterday",
    unread: false,
    course: "Advanced React Patterns",
  },
  {
    id: 5,
    student: "Lisa Anderson",
    avatar: "LA",
    lastMessage: "Got it working, thanks for your help!",
    timestamp: "2 days ago",
    unread: false,
    course: "Full Stack Development",
  },
];

const CHAT_MESSAGES = [
  {
    id: 1,
    sender: "student",
    text: "Hi! I'm having trouble understanding the async/await patterns in lesson 4. Could you help?",
    timestamp: "10:32 AM",
  },
  {
    id: 2,
    sender: "creator",
    text: "Of course! Async/await is syntactic sugar over Promises. Think of 'await' as pausing execution until a Promise resolves. What specific part is confusing?",
    timestamp: "10:35 AM",
  },
  {
    id: 3,
    sender: "student",
    text: "I get the basics, but when should I use try/catch blocks with async/await?",
    timestamp: "10:38 AM",
  },
  {
    id: 4,
    sender: "creator",
    text: "Great question! You should wrap await calls in try/catch whenever you need to handle errors. Without it, unhandled promise rejections can crash your app. Let me share an example...",
    timestamp: "10:40 AM",
  },
  {
    id: 5,
    sender: "student",
    text: "Thank you for the detailed explanation on async/await patterns!",
    timestamp: "10:45 AM",
  },
];

export default function CreatorMessages() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<typeof CONVERSATIONS[0] | null>(
    CONVERSATIONS[0]
  );
  const [messageInput, setMessageInput] = useState("");

  const filteredConversations = CONVERSATIONS.filter(conv =>
    conv.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // In production: send message via API
    console.log("Sending:", messageInput);
    setMessageInput("");
  };

  return (
    <div style={{ fontFamily: "Inter,sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: S.full, margin: 0, marginBottom: 8 }}>
          Messages
        </h1>
        <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
          Communicate with your students and answer questions
        </p>
      </div>

      {/* Messages Layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gap: 0,
        height: "calc(100vh - 220px)",
        minHeight: 600,
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {/* Left: Conversations List */}
        <div style={{
          borderRight: `1px solid ${S.border}`,
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Search */}
          <div style={{ padding: 16, borderBottom: `1px solid ${S.border}` }}>
            <div style={{ position: "relative" }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: S.dim,
                }}
              />
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

          {/* Conversations */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                style={{
                  padding: "16px",
                  borderBottom: `1px solid ${S.border}`,
                  cursor: "pointer",
                  background: selectedConversation?.id === conv.id ? S.accentLight : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (selectedConversation?.id !== conv.id) {
                    e.currentTarget.style.background = S.bg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedConversation?.id !== conv.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: conv.unread ? S.accent : S.accentLight,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 15,
                    flexShrink: 0,
                  }}>
                    {conv.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}>
                      <span style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: S.full,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {conv.student}
                      </span>
                      <span style={{ fontSize: 12, color: S.dim, flexShrink: 0, marginLeft: 8 }}>
                        {conv.timestamp}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: S.dim,
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {conv.course}
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: conv.unread ? S.full : S.dim,
                      fontWeight: conv.unread ? 500 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {conv.lastMessage}
                    </div>
                  </div>
                  {conv.unread && (
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: S.accent,
                      flexShrink: 0,
                      marginTop: 8,
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Chat Area */}
        {selectedConversation ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Chat Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${S.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
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
                  {selectedConversation.avatar}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: S.full }}>
                    {selectedConversation.student}
                  </div>
                  <div style={{ fontSize: 13, color: S.dim }}>
                    {selectedConversation.course}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: `1px solid ${S.border}`,
                  background: S.card,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}>
                  <Star size={16} style={{ color: S.dim }} />
                </button>
                <button style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: `1px solid ${S.border}`,
                  background: S.card,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}>
                  <Archive size={16} style={{ color: S.dim }} />
                </button>
                <button style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: `1px solid ${S.border}`,
                  background: S.card,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}>
                  <MoreVertical size={16} style={{ color: S.dim }} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}>
              {CHAT_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "creator" ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={{
                    maxWidth: "70%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}>
                    <div style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: msg.sender === "creator" ? S.accent : S.bg,
                      color: msg.sender === "creator" ? "#FFFFFF" : S.full,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}>
                      {msg.text}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: S.dim,
                      textAlign: msg.sender === "creator" ? "right" : "left",
                      paddingLeft: msg.sender === "creator" ? 0 : 16,
                      paddingRight: msg.sender === "creator" ? 16 : 0,
                    }}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div style={{
              padding: "16px 20px",
              borderTop: `1px solid ${S.border}`,
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
            }}>
              <button style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: `1px solid ${S.border}`,
                background: S.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}>
                <Paperclip size={18} style={{ color: S.dim }} />
              </button>
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  rows={1}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: `1px solid ${S.border}`,
                    borderRadius: 8,
                    fontSize: 15,
                    fontFamily: "Inter,sans-serif",
                    outline: "none",
                    resize: "none",
                    minHeight: 40,
                    maxHeight: 120,
                  }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  background: S.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: messageInput.trim() ? "pointer" : "not-allowed",
                  opacity: messageInput.trim() ? 1 : 0.5,
                  flexShrink: 0,
                }}
                disabled={!messageInput.trim()}
              >
                <Send size={18} style={{ color: "#FFFFFF" }} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: S.dim,
            fontSize: 15,
          }}>
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
