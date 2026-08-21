import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import TherapistLayout from "@/components/layouts/TherapistLayout";
import { useConversations, useMessages, sendMessage, getInitials } from "@/lib/portalEngine";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, FileText } from "lucide-react";
import { toast } from "sonner";

const A = "#2D9E6B", D = "#0F3D2E", B = "#EAE6E2", TM = "#1A1A1A", TS = "#6B7280";

const Av = ({ name, url, size = 38 }: { name: string | null; url?: string | null; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: "#E5E7EB", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: size * 0.33, color: TS }}>{getInitials(name)}</span>}
  </div>
);

export default function TherapistMessages() {
  const { user } = useAuth();
  const { data: convs, loading: loadingConvs, refetch: refetchConvs } = useConversations(user?.id);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = convs?.find(c => c.id === (activeConvId ?? convs[0]?.id)) ?? convs?.[0] ?? null;
  const { data: messages, loading: loadingMsgs, refetch: refetchMsgs } = useMessages(activeConv?.id);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!activeConv?.id) return;
    const channel = supabase
      .channel(`messages:${activeConv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv.id}` },
        () => { refetchMsgs(); refetchConvs(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id]);

  const handleSend = async () => {
    if (!draft.trim() || !user?.id || !activeConv?.other_user?.user_id) return;
    setSending(true);
    try {
      await sendMessage(user.id, activeConv.other_user.user_id, draft.trim());
      setDraft("");
      refetchMsgs(); refetchConvs();
    } catch (e: any) { toast.error(e.message || "Failed to send"); }
    finally { setSending(false); }
  };

  return (
    <TherapistLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: 0 }}>Secure Messaging Portal</h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, marginTop: 4 }}>Encrypted direct messaging channel for client therapy support.</p>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, border: "1px solid #166534", background: "#F0FDF4" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#166534" }} />
          <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: "#166534" }}>Secure Channel Active</span>
        </span>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Inbox */}
        <div style={{ width: 290, flexShrink: 0, background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 20, maxHeight: 580, overflowY: "auto" }}>
          <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 17, color: D, margin: "0 0 14px" }}>Inbound Logs</h3>
          {loadingConvs
            ? <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Loader2 size={20} className="animate-spin" style={{ color: A }} /></div>
            : !convs?.length
              ? <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>No conversations yet</p>
              : convs.map(c => {
                const isActive = c.id === (activeConvId ?? convs[0]?.id);
                return (
                  <div key={c.id} onClick={() => setActiveConvId(c.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, background: isActive ? "#F0FDF6" : "#fff", border: `1px solid ${isActive ? "rgba(45,158,107,0.25)" : B}`, cursor: "pointer", marginBottom: 8 }}>
                    <Av name={c.other_user?.full_name ?? null} url={c.other_user?.avatar_url} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TM }}>{c.other_user?.full_name || "Patient"}</span>
                        {(c.unread_count ?? 0) > 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: A, flexShrink: 0 }} />}
                      </div>
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last_message || "…"}</p>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Chat panel */}
        <div style={{ flex: "1 1 400px", background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", minHeight: 520, maxHeight: 600 }}>
          {!activeConv
            ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>Select a conversation</p>
            </div>
            : <>
              {/* Top bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${B}`, marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Av name={activeConv.other_user?.full_name ?? null} url={activeConv.other_user?.avatar_url} size={42} />
                  <div>
                    <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 15, color: TM, margin: 0 }}>{activeConv.other_user?.full_name || "Patient"}</p>
                    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0 }}>Patient · Therapy session</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
                {loadingMsgs
                  ? <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Loader2 size={20} className="animate-spin" style={{ color: A }} /></div>
                  : !messages?.length
                    ? <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, textAlign: "center" }}>No messages yet. Start the conversation.</p>
                    : messages.map(m => {
                      const isMine = m.sender_id === user?.id;
                      return (
                        <div key={m.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: 340, padding: 12, borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isMine ? "#F0FDF6" : "#F9F8F6", display: "flex", flexDirection: "column", gap: 4 }}>
                            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: isMine ? D : TM, margin: 0, lineHeight: 1.5 }}>{m.content}</p>
                            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: isMine ? A : TS, textAlign: "right" }}>
                              {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div style={{ borderTop: `1px solid ${B}`, paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F9F8F6", border: `1px solid ${B}`, borderRadius: 10 }}>
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Secure clinical reply…"
                    style={{ flex: 1, border: "none", background: "transparent", fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none" }}
                  />
                  <FileText size={15} color={TS} style={{ cursor: "pointer", flexShrink: 0 }} />
                  <button onClick={handleSend} disabled={!draft.trim() || sending}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "none", background: draft.trim() ? A : "#D1D5DB", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: "#fff", cursor: draft.trim() ? "pointer" : "default", flexShrink: 0 }}>
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
                  </button>
                </div>
              </div>
            </>}
        </div>
      </div>
    </TherapistLayout>
  );
}
