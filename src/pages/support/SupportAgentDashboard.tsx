import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageCircle, Send, User, Search, LogOut, CheckCircle2,
  Clock, AlertCircle, RefreshCw, ArrowRightLeft,
  Headphones, Circle, XCircle, Loader2, Tag, Zap,
  BarChart3, Filter, Star, Archive, Bell,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Conv = {
  id: string; user_id?: string; user_name?: string; user_email?: string;
  agent_id?: string; status: string; subject?: string; priority: string;
  tags?: string[]; created_at: string; updated_at: string;
  agent?: { full_name?: string };
};
type Msg = { id: string; conversation_id: string; sender_name?: string; role: string; text: string; created_at: string; read: boolean };
type Agent = { id: string; user_id: string; full_name?: string; is_online: boolean };
type UserProfile = { user_id: string; full_name?: string; country?: string; created_at?: string; onboarding_completed?: boolean };
type Payment = { id: string; amount: number; payment_type: string; status: string; created_at: string };
type Refund  = { id: string; amount: number; status: string; reason?: string; refund_method?: string; created_at: string };

// Canned responses — Zendesk/Intercom style
const CANNED: { label: string; text: string }[] = [
  { label: "Greeting",        text: "Hi there! 👋 Thanks for reaching out to Coursevia Support. How can I help you today?" },
  { label: "Looking into it", text: "Thanks for the details. I'm looking into this for you right now and will get back to you shortly." },
  { label: "Resolved",        text: "Great news — I've resolved the issue on our end. Please refresh the page and let me know if everything looks good!" },
  { label: "Refund info",     text: "Refund requests are reviewed within 24–48 hours. Once approved, the refund goes back to your original payment method within 5–10 business days." },
  { label: "Password reset",  text: "I've sent a password reset email to your registered address. Please check your inbox (and spam folder) and follow the link to reset your password." },
  { label: "Escalating",      text: "I'm escalating this to our specialist team who will follow up with you shortly. Thank you for your patience!" },
  { label: "Close",           text: "I'm glad we could help! If you have any other questions, don't hesitate to reach out. Have a great day! 😊" },
];

const TAGS = ["billing", "technical", "refund", "account", "course-access", "urgent", "vip", "follow-up"];

const statusColor: Record<string, string> = {
  open:     "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed:   "bg-slate-100 text-slate-500",
};
const priorityColor: Record<string, string> = {
  low:    "text-slate-400",
  normal: "text-blue-500",
  high:   "text-amber-500",
  urgent: "text-red-500",
};

const SupportAgentDashboard = () => {
  const navigate = useNavigate();
  const [agentId, setAgentId]         = useState<string | null>(null);
  const [agentName, setAgentName]     = useState("");
  const [convs, setConvs]             = useState<Conv[]>([]);
  const [agents, setAgents]           = useState<Agent[]>([]);
  const [activeConv, setActiveConv]   = useState<Conv | null>(null);
  const [msgs, setMsgs]               = useState<Msg[]>([]);
  const [reply, setReply]             = useState("");
  const [search, setSearch]           = useState("");
  const [msgSearch, setMsgSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [tab, setTab]                 = useState<"chats"|"user"|"payments"|"refunds"|"stats">("chats");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [userRefunds, setUserRefunds]   = useState<Refund[]>([]);
  const [transferTo, setTransferTo]   = useState("");
  const [loading, setLoading]         = useState(false);
  const [sending, setSending]         = useState(false);
  const [noteText, setNoteText]       = useState("");
  const [showCanned, setShowCanned]   = useState(false);
  const [tagInput, setTagInput]       = useState("");
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [stats, setStats]             = useState({ open: 0, assigned: 0, resolved: 0, avgReply: "—" });
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/support-agent", { replace: true }); return; }
      const { data: agent } = await supabase.from("support_agents" as any).select("id, full_name, is_active").eq("user_id", user.id).maybeSingle();
      if (!agent || !agent.is_active) { navigate("/support-agent", { replace: true }); return; }
      setAgentId(agent.id);
      setAgentName(agent.full_name || "Agent");
      await supabase.from("support_agents" as any).update({ is_online: true }).eq("id", agent.id);
      loadConvs();
      loadAgents();
      loadStats();
    };
    boot();
    return () => {
      if (agentId) supabase.from("support_agents" as any).update({ is_online: false }).eq("id", agentId);
    };
  }, []);

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("support-convs")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () => loadConvs())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, (payload: any) => {
        const m = payload.new as Msg;
        if (activeConv && m.conversation_id === activeConv.id) {
          setMsgs(prev => [...prev.filter(x => x.id !== m.id), m].sort((a, b) => a.created_at.localeCompare(b.created_at)));
        }
        loadConvs();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeConv]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadConvs = async () => {
    const { data } = await supabase
      .from("support_conversations" as any)
      .select("*, agent:support_agents(full_name)")
      .order("updated_at", { ascending: false });
    setConvs((data as Conv[]) || []);
  };

  const loadStats = async () => {
    const { data } = await supabase.from("support_conversations" as any).select("status, created_at, resolved_at");
    if (!data) return;
    const open     = data.filter((c: any) => c.status === "open").length;
    const assigned = data.filter((c: any) => c.status === "assigned").length;
    const resolved = data.filter((c: any) => c.status === "resolved").length;
    const resolvedWithTime = data.filter((c: any) => c.status === "resolved" && c.resolved_at && c.created_at);
    const avgMs = resolvedWithTime.length
      ? resolvedWithTime.reduce((s: number, c: any) => s + (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()), 0) / resolvedWithTime.length
      : 0;
    const avgHours = avgMs ? Math.round(avgMs / 3600000) : 0;
    setStats({ open, assigned, resolved, avgReply: avgHours ? `${avgHours}h` : "—" });
  };

  const loadAgents = async () => {
    const { data } = await supabase.from("support_agents" as any).select("id, user_id, full_name, is_online").eq("is_active", true);
    setAgents((data as Agent[]) || []);
  };

  const loadMsgs = async (convId: string) => {
    const { data } = await supabase.from("support_messages" as any).select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMsgs((data as Msg[]) || []);
    // Mark all as read
    await supabase.from("support_messages" as any).update({ read: true }).eq("conversation_id", convId).eq("read", false);
  };

  const loadUserData = async (userId: string) => {
    const [{ data: profile }, { data: payments }, { data: refunds }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, country, created_at, onboarding_completed").eq("user_id", userId).maybeSingle(),
      supabase.from("payments").select("id, amount, payment_type, status, created_at").eq("payer_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("refunds" as any).select("id, amount, status, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);
    setUserProfile(profile as UserProfile);
    setUserPayments((payments as Payment[]) || []);
    setUserRefunds((refunds as Refund[]) || []);
  };

  const openConv = async (conv: Conv) => {
    setActiveConv(conv);
    setTab("chats");
    await loadMsgs(conv.id);
    if (conv.user_id) loadUserData(conv.user_id);
    // Auto-assign to self if unassigned
    if (!conv.agent_id && agentId) {
      await supabase.from("support_conversations" as any).update({ agent_id: agentId, status: "assigned", updated_at: new Date().toISOString() }).eq("id", conv.id);
      loadConvs();
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!reply.trim() || !activeConv || !agentId) return;
    setSending(true);
    await supabase.from("support_messages" as any).insert({
      conversation_id: activeConv.id,
      sender_id: agentId,
      sender_name: agentName,
      role: "agent",
      text: reply.trim(),
      read: false,
    });
    await supabase.from("support_conversations" as any).update({ updated_at: new Date().toISOString(), status: "assigned" }).eq("id", activeConv.id);
    setReply("");
    setSending(false);
  };

  const addNote = async () => {
    if (!noteText.trim() || !activeConv) return;
    await supabase.from("support_messages" as any).insert({
      conversation_id: activeConv.id,
      sender_name: `[NOTE] ${agentName}`,
      role: "agent",
      text: `📝 Internal note: ${noteText.trim()}`,
      read: true,
    });
    setNoteText("");
    toast.success("Note added.");
  };

  const setStatus = async (status: string) => {
    if (!activeConv) return;
    await supabase.from("support_conversations" as any).update({
      status,
      updated_at: new Date().toISOString(),
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    }).eq("id", activeConv.id);
    setActiveConv(prev => prev ? { ...prev, status } : prev);
    toast.success(`Conversation marked as ${status}.`);
    loadConvs();
  };

  const setPriority = async (priority: string) => {
    if (!activeConv) return;
    await supabase.from("support_conversations" as any).update({ priority, updated_at: new Date().toISOString() }).eq("id", activeConv.id);
    setActiveConv(prev => prev ? { ...prev, priority } : prev);
    loadConvs();
  };

  const transferConv = async () => {
    if (!activeConv || !transferTo) return;
    await supabase.from("support_conversations" as any).update({ agent_id: transferTo, status: "assigned", updated_at: new Date().toISOString() }).eq("id", activeConv.id);
    await supabase.from("support_messages" as any).insert({
      conversation_id: activeConv.id,
      sender_name: agentName,
      role: "agent",
      text: `🔄 Conversation transferred to ${agents.find(a => a.id === transferTo)?.full_name || "another agent"}.`,
      read: false,
    });
    toast.success("Conversation transferred.");
    setTransferTo("");
    loadConvs();
  };

  const approveRefund = async (refundId: string) => {
    setLoading(true);
    const { error } = await supabase.from("refunds" as any).update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", refundId);
    if (error) toast.error(error.message);
    else { toast.success("Refund approved."); if (activeConv?.user_id) loadUserData(activeConv.user_id); }
    setLoading(false);
  };

  const resetUserPassword = async () => {
    if (!userProfile?.full_name) return;
    const email = (userProfile as any).email || "";
    if (!email) { toast.error("No email on file for this user."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message);
    else toast.success(`Password reset email sent to ${email}`);
  };

  const logout = async () => {
    if (agentId) await supabase.from("support_agents" as any).update({ is_online: false }).eq("id", agentId);
    await supabase.auth.signOut();
    navigate("/support-agent", { replace: true });
  };

  const addTag = async (tag: string) => {
    if (!activeConv || !tag.trim()) return;
    const current = activeConv.tags || [];
    if (current.includes(tag)) return;
    const updated = [...current, tag];
    await supabase.from("support_conversations" as any).update({ tags: updated }).eq("id", activeConv.id);
    setActiveConv(prev => prev ? { ...prev, tags: updated } : prev);
    loadConvs();
  };

  const removeTag = async (tag: string) => {
    if (!activeConv) return;
    const updated = (activeConv.tags || []).filter(t => t !== tag);
    await supabase.from("support_conversations" as any).update({ tags: updated }).eq("id", activeConv.id);
    setActiveConv(prev => prev ? { ...prev, tags: updated } : prev);
    loadConvs();
  };

  const bulkAction = async (action: "resolve" | "close") => {
    if (!selected.size) return;
    const status = action === "resolve" ? "resolved" : "closed";
    for (const id of selected) {
      await supabase.from("support_conversations" as any).update({
        status, updated_at: new Date().toISOString(),
        ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
      }).eq("id", id);
    }
    toast.success(`${selected.size} conversation(s) ${status}.`);
    setSelected(new Set());
    loadConvs(); loadStats();
  };

  // ── Filtered convs ────────────────────────────────────────────────────────
  const filtered = useMemo(() => convs.filter(c => {
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchSearch = !search ||
      (c.user_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.user_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.subject || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [convs, filterStatus, search]);

  const filteredMsgs = useMemo(() => msgSearch
    ? msgs.filter(m => m.text.toLowerCase().includes(msgSearch.toLowerCase()))
    : msgs, [msgs, msgSearch]);

  const openCount = convs.filter(c => c.status === "open").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">

      {/* Top bar */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Headphones size={20} className="text-primary" />
          <span className="font-bold text-foreground">Coursevia Support</span>
          <span className="text-xs text-muted-foreground hidden sm:block">Agent Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats pills */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{stats.open} open</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{stats.assigned} assigned</span>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{stats.resolved} resolved</span>
            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">avg {stats.avgReply}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Circle size={8} className="fill-emerald-500 text-emerald-500" />
            {agentName}
          </div>
          <Button size="sm" variant="ghost" onClick={logout} className="gap-1.5 text-muted-foreground">
            <LogOut size={14} /> Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Conversation list ── */}
        <aside className="w-72 border-r border-border bg-card flex flex-col shrink-0">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." className="pl-8 h-8 text-xs" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {["all","open","assigned","resolved","closed"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                    filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            {selected.size > 0 && (
              <div className="flex gap-1.5 pt-1">
                <button onClick={() => bulkAction("resolve")} className="flex-1 text-xs bg-emerald-600 text-white rounded-lg py-1.5 font-medium">Resolve {selected.size}</button>
                <button onClick={() => bulkAction("close")} className="flex-1 text-xs bg-slate-500 text-white rounded-lg py-1.5 font-medium">Close {selected.size}</button>
                <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground px-2">✕</button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No conversations found.</div>
            ) : filtered.map(c => {
              const isSelected = selected.has(c.id);
              return (
                <div key={c.id} className={`flex items-stretch border-b border-border ${activeConv?.id === c.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                  <div className="flex items-center px-2 cursor-pointer" onClick={e => { e.stopPropagation(); setSelected(prev => { const n = new Set(prev); isSelected ? n.delete(c.id) : n.add(c.id); return n; }); }}>
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                      {isSelected && <span className="text-white text-[8px]">✓</span>}
                    </div>
                  </div>
                  <button onClick={() => openConv(c)} className="flex-1 text-left p-2.5 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground truncate">{c.user_name || "Guest"}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusColor[c.status] || "bg-muted text-muted-foreground"}`}>{c.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.user_email || "No email"}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-medium capitalize ${priorityColor[c.priority] || ""}`}>{c.priority === "urgent" ? "🔴 " : ""}{c.priority}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.updated_at))} ago</span>
                    </div>
                    {c.tags && c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.tags.slice(0, 3).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>)}
                      </div>
                    )}
                    {c.agent?.full_name && <p className="text-[10px] text-muted-foreground mt-0.5">👤 {c.agent.full_name}</p>}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-border">
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={loadConvs}>
              <RefreshCw size={12} /> Refresh
            </Button>
          </div>
        </aside>

        {/* ── MAIN: Chat + tools ── */}
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a conversation to start</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">

            {/* Chat panel */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Conv header */}
              <div className="border-b border-border px-4 py-2 shrink-0 bg-card space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{activeConv.user_name || "Guest"}</p>
                    <p className="text-xs text-muted-foreground">{activeConv.user_email || "No email"} · opened {formatDistanceToNow(new Date(activeConv.created_at))} ago</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <select value={activeConv.priority} onChange={e => setPriority(e.target.value)}
                      className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground">
                      {["low","normal","high","urgent"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {activeConv.status !== "resolved" && (
                      <Button size="sm" onClick={() => setStatus("resolved")} className="h-7 px-2.5 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle2 size={11} /> Resolve
                      </Button>
                    )}
                    {activeConv.status === "resolved" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus("open")} className="h-7 px-2.5 text-xs gap-1">
                        <RefreshCw size={11} /> Reopen
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setStatus("closed")} className="h-7 px-2.5 text-xs gap-1 text-muted-foreground">
                      <XCircle size={11} /> Close
                    </Button>
                  </div>
                </div>
                {/* Tags row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(activeConv.tags || []).map(t => (
                    <span key={t} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-red-500">×</button>
                    </span>
                  ))}
                  <select value="" onChange={e => { if (e.target.value) addTag(e.target.value); }}
                    className="text-[10px] border border-dashed border-border rounded-full px-2 py-0.5 bg-background text-muted-foreground cursor-pointer">
                    <option value="">+ tag</option>
                    {TAGS.filter(t => !(activeConv.tags || []).includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredMsgs.map(m => {
                  const isAgent = m.role === "agent";
                  const isNote  = m.text.startsWith("📝 Internal note:");
                  return (
                    <div key={m.id} className={`flex gap-2 ${isAgent ? "flex-row-reverse" : ""}`}>
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isAgent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {isAgent ? (m.sender_name?.[0] || "A") : (activeConv.user_name?.[0] || "U")}
                      </div>
                      <div className={`max-w-[70%] space-y-0.5 ${isAgent ? "items-end" : ""} flex flex-col`}>
                        <p className={`text-[10px] text-muted-foreground ${isAgent ? "text-right" : ""}`}>
                          {m.sender_name || (isAgent ? "Agent" : activeConv.user_name || "User")} · {format(new Date(m.created_at), "HH:mm")}
                        </p>
                        <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          isNote ? "bg-amber-50 border border-amber-200 text-amber-800 rounded-tl-sm" :
                          isAgent ? "bg-primary text-primary-foreground rounded-tr-sm" :
                          "bg-muted text-foreground rounded-tl-sm"
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              <div className="border-t border-border p-3 space-y-2 shrink-0 bg-card">
                {/* Message search */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={msgSearch} onChange={e => setMsgSearch(e.target.value)} placeholder="Search messages..." className="pl-7 h-7 text-xs" />
                </div>
                {/* Canned responses */}
                <div className="relative">
                  <button onClick={() => setShowCanned(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Zap size={12} /> Canned responses {showCanned ? "▲" : "▼"}
                  </button>
                  {showCanned && (
                    <div className="absolute bottom-full left-0 mb-1 w-72 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-10">
                      {CANNED.map(c => (
                        <button key={c.label} onClick={() => { setReply(c.text); setShowCanned(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-xs border-b border-border last:border-0">
                          <span className="font-medium text-foreground">{c.label}</span>
                          <p className="text-muted-foreground truncate mt-0.5">{c.text}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                  rows={3}
                  className="resize-none text-sm"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {["Thanks for reaching out!", "I'm looking into this.", "Issue resolved!"].map(q => (
                      <button key={q} onClick={() => setReply(q)}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors truncate max-w-[110px]">
                        {q}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" onClick={sendReply} disabled={!reply.trim() || sending} className="gap-1.5 shrink-0">
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Send
                  </Button>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Tools panel ── */}
            <aside className="w-72 border-l border-border bg-card flex flex-col shrink-0 overflow-hidden">

              {/* Tabs */}
              <div className="flex border-b border-border shrink-0 overflow-x-auto">
                {(["chats","user","payments","refunds","stats"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors whitespace-nowrap px-2 ${
                      tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">

                {/* ── CHATS tab: transfer + note ── */}
                {tab === "chats" && (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Transfer Conversation</p>
                      <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                        className="w-full text-xs border border-border rounded-lg px-2 py-2 bg-background text-foreground">
                        <option value="">Select agent...</option>
                        {agents.filter(a => a.id !== agentId).map(a => (
                          <option key={a.id} value={a.id}>
                            {a.full_name} {a.is_online ? "🟢" : "⚫"}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" className="w-full gap-1.5 text-xs" onClick={transferConv} disabled={!transferTo}>
                        <ArrowRightLeft size={12} /> Transfer to agent
                      </Button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-semibold text-foreground">Internal Note</p>
                      <Textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                        placeholder="Add a private note (not visible to user)..."
                        rows={3} className="resize-none text-xs" />
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={addNote} disabled={!noteText.trim()}>
                        Add Note
                      </Button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-semibold text-foreground">Online Agents</p>
                      {agents.map(a => (
                        <div key={a.id} className="flex items-center gap-2 text-xs">
                          <Circle size={7} className={a.is_online ? "fill-emerald-500 text-emerald-500" : "fill-slate-300 text-slate-300"} />
                          <span className="text-foreground">{a.full_name}</span>
                          {a.id === agentId && <span className="text-muted-foreground">(you)</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── USER tab ── */}
                {tab === "user" && (
                  <>
                    {!userProfile ? (
                      <p className="text-xs text-muted-foreground">No user linked to this conversation.</p>
                    ) : (
                      <>
                        <div className="rounded-xl border border-border p-3 space-y-1.5 text-xs">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {(userProfile.full_name || "U")[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{userProfile.full_name || "—"}</p>
                              <p className="text-muted-foreground capitalize">{(userProfile as any).role || "learner"}</p>
                            </div>
                          </div>
                          <p><span className="text-muted-foreground">Email:</span> {(userProfile as any).email || "—"}</p>
                          <p><span className="text-muted-foreground">Country:</span> {userProfile.country || "—"}</p>
                          <p><span className="text-muted-foreground">Joined:</span> {userProfile.created_at ? format(new Date(userProfile.created_at), "PP") : "—"}</p>
                          <p><span className="text-muted-foreground">Onboarded:</span> {userProfile.onboarding_completed ? "Yes" : "No"}</p>
                        </div>
                        <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={resetUserPassword}>
                          <RefreshCw size={11} /> Send password reset
                        </Button>
                      </>
                    )}
                  </>
                )}

                {/* ── PAYMENTS tab ── */}
                {tab === "payments" && (
                  <>
                    <p className="text-xs font-semibold text-foreground">Recent Payments</p>
                    {userPayments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No payments found.</p>
                    ) : userPayments.map(p => (
                      <div key={p.id} className="rounded-xl border border-border p-3 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="font-semibold text-foreground capitalize">{p.payment_type.replace(/_/g, " ")}</span>
                          <span className="font-mono font-bold">${Number(p.amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{format(new Date(p.created_at), "PP")}</span>
                          <span className={`capitalize px-1.5 py-0.5 rounded-full ${
                            ["completed","approved","success"].includes(p.status) ? "bg-emerald-100 text-emerald-700" :
                            p.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                          }`}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* ── REFUNDS tab ── */}
                {tab === "refunds" && (
                  <>
                    <p className="text-xs font-semibold text-foreground">Refund Requests</p>
                    {userRefunds.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No refund requests.</p>
                    ) : userRefunds.map(r => (
                      <div key={r.id} className="rounded-xl border border-border p-3 text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="font-mono font-bold">${Number(r.amount).toFixed(2)}</span>
                          <span className={`capitalize px-1.5 py-0.5 rounded-full ${
                            r.status === "processed" ? "bg-emerald-100 text-emerald-700" :
                            r.status === "rejected"  ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>{r.status}</span>
                        </div>
                        {r.reason && <p className="text-muted-foreground line-clamp-2">{r.reason}</p>}
                        {r.refund_method && <p className="text-muted-foreground">Method: {r.refund_method.replace(/_/g, " ")}</p>}
                        <p className="text-muted-foreground">{format(new Date(r.created_at), "PP")}</p>
                        {r.status === "pending" && (
                          <Button size="sm" onClick={() => approveRefund(r.id)} disabled={loading}
                            className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                            <CheckCircle2 size={11} /> Approve refund
                          </Button>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* ── STATS tab ── */}
                {tab === "stats" && (
                  <>
                    <p className="text-xs font-semibold text-foreground">Platform Stats</p>
                    <div className="space-y-2">
                      {[
                        { label: "Open conversations",    value: stats.open,     color: "text-amber-600" },
                        { label: "Assigned",              value: stats.assigned, color: "text-blue-600" },
                        { label: "Resolved",              value: stats.resolved, color: "text-emerald-600" },
                        { label: "Avg resolution time",   value: stats.avgReply, color: "text-foreground" },
                      ].map(s => (
                        <div key={s.label} className="flex justify-between items-center p-2.5 rounded-xl border border-border bg-background">
                          <span className="text-xs text-muted-foreground">{s.label}</span>
                          <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 mt-2" onClick={loadStats}>
                      <RefreshCw size={11} /> Refresh stats
                    </Button>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportAgentDashboard;
