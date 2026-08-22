import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import CoachLayout from "@/components/layouts/CoachLayout";
import { useConversations, useMessages, sendMessage, getInitials } from "@/lib/portalEngine";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, FileText, DollarSign, X } from "lucide-react";
import { toast } from "sonner";

const A = "#2D9E6B", D = "#0F3D2E", B = "#EAE6E2", TM = "#1A1A1A", TS = "#6B7280";

const Av = ({ name, url, size = 38 }: { name: string | null; url?: string | null; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: "#E5E7EB", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: size * 0.33, color: TS }}>{getInitials(name)}</span>}
  </div>
);

export default function CoachMessages() {
  const { user } = useAuth();
  const { data: convs, loading: loadingConvs, refetch: refetchConvs } = useConversations(user?.id);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({
    title: "",
    description: "",
    price: "",
    duration_minutes: "60",
    scheduled_at: "",
    session_mode: "online"
  });
  const [creatingOffer, setCreatingOffer] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = convs?.find(c => c.id === (activeConvId ?? convs[0]?.id)) ?? convs?.[0] ?? null;
  const { data: messages, loading: loadingMsgs, refetch: refetchMsgs } = useMessages(activeConv?.id);
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // Fetch offers for the active conversation
  useEffect(() => {
    if (!activeConv?.other_user?.user_id || !user?.id) return;

    const fetchOffers = async () => {
      setLoadingOffers(true);
      try {
        const { data, error } = await supabase
          .from("message_offers")
          .select("*")
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeConv.other_user.user_id}),and(sender_id.eq.${activeConv.other_user.user_id},receiver_id.eq.${user.id})`)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setOffers(data || []);
      } catch (e: any) {
        console.error("Failed to fetch offers:", e);
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, [activeConv?.id, activeConv?.other_user?.user_id, user?.id]);

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

  const handleCreateOffer = async () => {
    if (!user?.id || !activeConv?.other_user?.user_id || !offerForm.title.trim() || !offerForm.price) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreatingOffer(true);
    try {
      const { error } = await supabase.from("message_offers").insert({
        sender_id: user.id,
        receiver_id: activeConv.other_user.user_id,
        title: offerForm.title.trim(),
        description: offerForm.description.trim(),
        price: parseFloat(offerForm.price),
        duration_minutes: parseInt(offerForm.duration_minutes),
        scheduled_at: offerForm.scheduled_at || null,
        session_mode: offerForm.session_mode,
        status: "pending"
      });

      if (error) throw error;

      // Send a message to notify about the offer
      await sendMessage(user.id, activeConv.other_user.user_id, `📋 Custom Offer Sent: ${offerForm.title}`);

      toast.success("Offer sent successfully!");
      setShowOfferModal(false);
      setOfferForm({ title: "", description: "", price: "", duration_minutes: "60", scheduled_at: "", session_mode: "online" });
      refetchMsgs();
      refetchConvs();
    } catch (e: any) {
      toast.error(e.message || "Failed to create offer");
    } finally {
      setCreatingOffer(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: "accept" | "decline") => {
    try {
      const { error } = await supabase
        .from("message_offers")
        .update({ status: action === "accept" ? "accepted" : "declined", updated_at: new Date().toISOString() })
        .eq("id", offerId);

      if (error) throw error;

      toast.success(`Offer ${action}ed successfully!`);
      refetchMsgs();

      // Refetch offers to show updated status
      const { data, error: fetchError } = await supabase
        .from("message_offers")
        .select("*")
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${activeConv?.other_user?.user_id}),and(sender_id.eq.${activeConv?.other_user?.user_id},receiver_id.eq.${user?.id})`)
        .order("created_at", { ascending: true });

      if (!fetchError && data) setOffers(data);
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} offer`);
    }
  };

  return (
    <CoachLayout>
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
                        <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TM }}>{c.other_user?.full_name || "Client"}</span>
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
                    <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 15, color: TM, margin: 0 }}>{activeConv.other_user?.full_name || "Client"}</p>
                    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0 }}>Client · Coaching session</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
                {loadingMsgs
                  ? <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Loader2 size={20} className="animate-spin" style={{ color: A }} /></div>
                  : !messages?.length && !offers?.length
                    ? <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, textAlign: "center" }}>No messages yet. Start the conversation.</p>
                    : <>
                      {/* Merge messages and offers by timestamp */}
                      {[
                        ...(messages || []).map(m => ({ ...m, type: 'message' })),
                        ...(offers || []).map(o => ({ ...o, type: 'offer' }))
                      ]
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map((item: any) => {
                          if (item.type === 'message') {
                            const isMine = item.sender_id === user?.id;
                            return (
                              <div key={`msg-${item.id}`} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                                <div style={{ maxWidth: 340, padding: 12, borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isMine ? "#F0FDF6" : "#F9F8F6", display: "flex", flexDirection: "column", gap: 4 }}>
                                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: isMine ? D : TM, margin: 0, lineHeight: 1.5 }}>{item.content}</p>
                                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: isMine ? A : TS, textAlign: "right" }}>
                                    {new Date(item.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                  </span>
                                </div>
                              </div>
                            );
                          } else {
                            // Offer card
                            const isMine = item.sender_id === user?.id;
                            const statusColor = item.status === 'accepted' ? '#166534' : item.status === 'declined' ? '#DC2626' : '#CA8A04';
                            const statusBg = item.status === 'accepted' ? '#F0FDF4' : item.status === 'declined' ? '#FEF2F2' : '#FFFBEB';

                            return (
                              <div key={`offer-${item.id}`} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                                <div style={{ maxWidth: 380, padding: 16, borderRadius: 12, background: "#fff", border: `2px solid ${A}`, display: "flex", flexDirection: "column", gap: 10 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <DollarSign size={18} color={A} />
                                    <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 14, color: D }}>Custom Offer</span>
                                    <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 999, background: statusBg, fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: statusColor, textTransform: "capitalize" }}>
                                      {item.status}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 15, color: TM, margin: "0 0 4px" }}>{item.title}</h4>
                                    {item.description && <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: 0, lineHeight: 1.4 }}>{item.description}</p>}
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 0", borderTop: `1px solid ${B}`, borderBottom: `1px solid ${B}` }}>
                                    <div>
                                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, display: "block" }}>Price</span>
                                      <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 16, color: A }}>${parseFloat(item.price).toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, display: "block" }}>Duration</span>
                                      <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: TM }}>{item.duration_minutes} min</span>
                                    </div>
                                  </div>

                                  {item.scheduled_at && (
                                    <div style={{ padding: "6px 10px", background: "#F9F8F6", borderRadius: 6 }}>
                                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS }}>Scheduled: </span>
                                      <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TM }}>
                                        {new Date(item.scheduled_at).toLocaleString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "numeric",
                                          minute: "2-digit"
                                        })}
                                      </span>
                                    </div>
                                  )}

                                  {!isMine && item.status === 'pending' && (
                                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                      <button
                                        onClick={() => handleOfferAction(item.id, "decline")}
                                        style={{ flex: 1, padding: "8px 16px", borderRadius: 6, border: `1px solid ${B}`, background: "#fff", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, cursor: "pointer" }}
                                      >
                                        Decline
                                      </button>
                                      <button
                                        onClick={() => handleOfferAction(item.id, "accept")}
                                        style={{ flex: 1, padding: "8px 16px", borderRadius: 6, border: "none", background: A, fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}
                                      >
                                        Accept Offer
                                      </button>
                                    </div>
                                  )}

                                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: TS, textAlign: "right", marginTop: 4 }}>
                                    {new Date(item.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                        })}
                    </>}
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
                  <DollarSign
                    size={15}
                    color={A}
                    style={{ cursor: "pointer", flexShrink: 0 }}
                    onClick={() => setShowOfferModal(true)}
                    title="Send Custom Offer"
                  />
                  <button onClick={handleSend} disabled={!draft.trim() || sending}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "none", background: draft.trim() ? A : "#D1D5DB", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: "#fff", cursor: draft.trim() ? "pointer" : "default", flexShrink: 0 }}>
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
                  </button>
                </div>
              </div>
            </>}
        </div>
      </div>

      {/* Custom Offer Modal */}
      {showOfferModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowOfferModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "90%", maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 22, color: D, margin: 0 }}>Create Custom Offer</h2>
              <X size={20} color={TS} style={{ cursor: "pointer" }} onClick={() => setShowOfferModal(false)} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, display: "block", marginBottom: 6 }}>Title *</label>
                <input
                  value={offerForm.title}
                  onChange={e => setOfferForm({ ...offerForm, title: e.target.value })}
                  placeholder="e.g., One-on-One Coaching Session"
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${B}`, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none" }}
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, display: "block", marginBottom: 6 }}>Description</label>
                <textarea
                  value={offerForm.description}
                  onChange={e => setOfferForm({ ...offerForm, description: e.target.value })}
                  placeholder="Add details about this offer..."
                  rows={3}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${B}`, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, display: "block", marginBottom: 6 }}>Price ($) *</label>
                  <input
                    type="number"
                    value={offerForm.price}
                    onChange={e => setOfferForm({ ...offerForm, price: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${B}`, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, display: "block", marginBottom: 6 }}>Duration (min)</label>
                  <input
                    type="number"
                    value={offerForm.duration_minutes}
                    onChange={e => setOfferForm({ ...offerForm, duration_minutes: e.target.value })}
                    min="15"
                    step="15"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${B}`, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, display: "block", marginBottom: 6 }}>Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={offerForm.scheduled_at}
                  onChange={e => setOfferForm({ ...offerForm, scheduled_at: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${B}`, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none" }}
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, display: "block", marginBottom: 6 }}>Session Mode</label>
                <select
                  value={offerForm.session_mode}
                  onChange={e => setOfferForm({ ...offerForm, session_mode: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${B}`, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none", cursor: "pointer" }}
                >
                  <option value="online">Online</option>
                  <option value="in-person">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => setShowOfferModal(false)}
                  style={{ flex: 1, padding: "12px 20px", borderRadius: 8, border: `1px solid ${B}`, background: "#fff", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: TM, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOffer}
                  disabled={creatingOffer || !offerForm.title.trim() || !offerForm.price}
                  style={{ flex: 1, padding: "12px 20px", borderRadius: 8, border: "none", background: (offerForm.title.trim() && offerForm.price) ? A : "#D1D5DB", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: "#fff", cursor: (offerForm.title.trim() && offerForm.price) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {creatingOffer ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Send Offer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CoachLayout>
  );
}
