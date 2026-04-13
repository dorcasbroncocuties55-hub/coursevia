import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Send, Search, ArrowLeft, CheckCheck, Check,
  Circle, MoreVertical, Phone, Video, Smile,
} from "lucide-react";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { ScrollableContent } from "@/components/ui/scrollable-content";

type DashboardRole = "learner" | "coach" | "creator" | "therapist";

type Conversation = {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  isOnline?: boolean;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

const fmt = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v), now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const BLOCKED = [/\d{7,}/, /@[a-z]/i, /https?:\/\//i, /www\./i, /whatsapp/i, /telegram/i];

const Messages = ({ role }: { role: DashboardRole }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedUserId = searchParams.get("user");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId]       = useState<string | null>(requestedUserId);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [text, setText]                   = useState("");
  const [search, setSearch]               = useState("");
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [typing, setTyping]               = useState(false);
  const [mobileShowList, setMobileShowList] = useState(true);
  const [onlineUsers, setOnlineUsers]     = useState<Set<string>>(new Set());

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId],
  );

  const filteredConvs = useMemo(() =>
    conversations.filter((c) =>
      !search || c.name.toLowerCase().includes(search.toLowerCase())
    ), [conversations, search]);

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + c.unreadCount, 0),
    [conversations],
  );

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = async () => {
    if (!user) return;
    setLoadingConvs(true);
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at, is_read")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) { toast.error("Could not load conversations."); setLoadingConvs(false); return; }

    const grouped = new Map<string, { last: any; unread: number }>();
    (data || []).forEach((row) => {
      const pid = row.sender_id === user.id ? row.receiver_id : row.sender_id;
      if (!pid || pid === user.id) return;
      const ex = grouped.get(pid);
      const unread = row.receiver_id === user.id && !row.is_read ? 1 : 0;
      if (!ex) { grouped.set(pid, { last: row, unread }); return; }
      grouped.set(pid, { last: ex.last, unread: ex.unread + unread });
    });

    if (requestedUserId && !grouped.has(requestedUserId))
      grouped.set(requestedUserId, { last: null, unread: 0 });

    const ids = [...grouped.keys()];
    if (!ids.length) { setConversations([]); setLoadingConvs(false); return; }

    const { data: profiles } = await supabase
      .from("profiles").select("user_id, full_name, avatar_url, role").in("user_id", ids);

    const convs: Conversation[] = ids.map((id) => {
      const p = profiles?.find((x) => x.user_id === id);
      const g = grouped.get(id)!;
      return {
        id,
        name: p?.full_name || "Coursevia member",
        avatar_url: p?.avatar_url || null,
        role: p?.role || null,
        lastMessage: g.last?.content || "Start a conversation",
        lastMessageAt: g.last?.created_at || null,
        unreadCount: g.unread,
        isOnline: onlineUsers.has(id),
      };
    }).sort((a, b) =>
      (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0) -
      (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0)
    );

    setConversations(convs);
    setLoadingConvs(false);
    if (!selectedId && convs[0]) setSelectedId(convs[0].id);
  };

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = async (partnerId: string) => {
    if (!user) return;
    setLoadingMsgs(true);
    const { data, error } = await supabase
      .from("messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    if (error) { toast.error("Could not load messages."); setLoadingMsgs(false); return; }
    setMessages((data as Message[]) || []);

    // Mark as read
    await supabase.from("messages").update({ is_read: true })
      .eq("sender_id", partnerId).eq("receiver_id", user.id).eq("is_read", false);

    setConversations((prev) =>
      prev.map((c) => c.id === partnerId ? { ...c, unreadCount: 0 } : c)
    );
    setLoadingMsgs(false);
  };

  // ── Presence (online status) ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("online-users")
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const online = new Set(Object.keys(state));
        setOnlineUsers(online);
        setConversations((prev) =>
          prev.map((c) => ({ ...c, isOnline: online.has(c.id) }))
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Real-time messages ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !selectedId) return;
    loadMessages(selectedId);
    setMobileShowList(false);

    const channel = supabase
      .channel(`msgs-${user.id}-${selectedId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const msg = payload.new as Message;
        const mine = msg.sender_id === user.id && msg.receiver_id === selectedId;
        const theirs = msg.sender_id === selectedId && msg.receiver_id === user.id;
        if (!mine && !theirs) { loadConversations(); return; }
        setMessages((prev) => [...prev, msg]);
        setTyping(false);
        if (theirs) {
          await supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
          setConversations((prev) => prev.map((c) => c.id === selectedId ? { ...c, unreadCount: 0 } : c));
        }
        loadConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedId]);

  useEffect(() => { loadConversations(); }, [user, requestedUserId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const send = async () => {
    if (!user || !selectedId || !text.trim() || sending) return;
    const clean = text.trim();
    if (BLOCKED.some((p) => p.test(clean))) {
      toast.error("For safety, direct contact details can't be shared here.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id, receiver_id: selectedId,
      content: clean, is_read: false,
    });
    if (error) toast.error("Message could not be sent.");
    else { setText(""); loadConversations(); }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleTyping = () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {}, 2000);
  };

  const selectConv = (id: string) => {
    setSelectedId(id);
    setMobileShowList(false);
    inputRef.current?.focus();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout role={role}>
      <div className="flex h-[calc(100vh-80px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-1 overflow-hidden">

          {/* ── Sidebar ── */}
          <aside className={`flex w-full flex-col border-r border-border bg-white md:w-80 lg:w-96 ${mobileShowList ? "flex" : "hidden md:flex"}`}>
            {/* Sidebar header */}
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-lg font-bold text-foreground">Messages</h1>
                  {totalUnread > 0 && (
                    <p className="text-xs text-muted-foreground">{totalUnread} unread</p>
                  )}
                </div>
              </div>
              {/* Search */}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2">
                <Search size={14} className="text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="space-y-3 p-4">
                  {[1,2,3].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-11 w-11 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 rounded bg-slate-200" />
                        <div className="h-2.5 w-48 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {search ? "No conversations match your search." : "No conversations yet."}
                </div>
              ) : (
                filteredConvs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectConv(c.id)}
                    className={`flex w-full items-start gap-3 border-b border-border/60 px-4 py-3.5 text-left transition hover:bg-secondary/30 ${
                      selectedId === c.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                    }`}
                  >
                    {/* Avatar with online dot */}
                    <div className="relative shrink-0">
                      <ProfileAvatar src={c.avatar_url} name={c.name} className="h-11 w-11 border border-border" />
                      {c.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`truncate text-sm ${c.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                          {c.name}
                        </p>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[11px] text-muted-foreground">{fmt(c.lastMessageAt)}</span>
                          {c.unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              {c.unreadCount > 99 ? "99+" : c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className={`mt-0.5 truncate text-xs ${c.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {c.lastMessage}
                      </p>
                      {c.isOnline && (
                        <p className="mt-0.5 text-[10px] font-medium text-emerald-600">● Online</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* ── Chat area ── */}
          <section className={`flex flex-1 flex-col overflow-hidden ${mobileShowList ? "hidden md:flex" : "flex"}`}>
            {selected ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3 shadow-sm">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileShowList(true)}>
                    <ArrowLeft size={18} />
                  </Button>
                  <div className="relative">
                    <ProfileAvatar src={selected.avatar_url} name={selected.name} className="h-10 w-10 border border-border" />
                    {selected.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selected.isOnline
                        ? <span className="text-emerald-600 font-medium">● Online now</span>
                        : <span className="capitalize">{selected.role || "Member"}</span>
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <Phone size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <Video size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <MoreVertical size={16} />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto bg-[#f5f5f8] px-4 py-5">
                  <div className="mx-auto max-w-2xl space-y-1">
                    {/* Safety notice */}
                    <div className="mb-4 rounded-xl border border-border bg-white/80 px-4 py-2.5 text-center text-xs text-muted-foreground shadow-sm">
                      Keep payments and communication inside Coursevia for a safer experience.
                    </div>

                    {loadingMsgs ? (
                      <div className="space-y-3">
                        {[1,2,3].map((i) => (
                          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                            <div className={`h-10 w-48 animate-pulse rounded-2xl bg-slate-200`} />
                          </div>
                        ))}
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                          <Send size={20} className="text-primary" />
                        </div>
                        <p className="font-medium text-foreground">Start the conversation</p>
                        <p className="mt-1 text-sm text-muted-foreground">Send a professional message to get started.</p>
                      </div>
                    ) : (
                      (() => {
                        let lastDate = "";
                        return messages.map((msg) => {
                          const mine = msg.sender_id === user?.id;
                          const msgDate = new Date(msg.created_at).toDateString();
                          const showDate = msgDate !== lastDate;
                          lastDate = msgDate;

                          return (
                            <div key={msg.id}>
                              {showDate && (
                                <div className="my-4 flex items-center gap-3">
                                  <div className="flex-1 border-t border-border" />
                                  <span className="text-[11px] text-muted-foreground bg-[#f5f5f8] px-2">
                                    {new Date(msg.created_at).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
                                  </span>
                                  <div className="flex-1 border-t border-border" />
                                </div>
                              )}
                              <div className={`flex items-end gap-2 mb-1 ${mine ? "justify-end" : "justify-start"}`}>
                                {!mine && (
                                  <ProfileAvatar src={selected.avatar_url} name={selected.name} className="h-7 w-7 shrink-0 border border-border" />
                                )}
                                <div className={`group relative max-w-[72%] sm:max-w-[60%]`}>
                                  <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                                    mine
                                      ? "rounded-br-sm bg-primary text-primary-foreground"
                                      : "rounded-bl-sm border border-border bg-white text-foreground"
                                  }`}>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                  </div>
                                  <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "justify-end text-muted-foreground" : "text-muted-foreground"}`}>
                                    <span>{fmt(msg.created_at)}</span>
                                    {mine && (
                                      msg.is_read
                                        ? <CheckCheck size={12} className="text-primary" />
                                        : <Check size={12} className="text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}

                    {/* Typing indicator */}
                    {typing && (
                      <div className="flex items-end gap-2">
                        <ProfileAvatar src={selected.avatar_url} name={selected.name} className="h-7 w-7 shrink-0" />
                        <div className="rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-3 shadow-sm">
                          <div className="flex gap-1 items-center">
                            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </div>

                {/* Input bar */}
                <div className="border-t border-border bg-white px-4 py-3">
                  <div className="mx-auto max-w-2xl flex items-end gap-2">
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                      <Smile size={18} />
                    </Button>
                    <div className="flex-1 rounded-2xl border border-border bg-secondary/30 px-4 py-2.5">
                      <input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => { setText(e.target.value); handleTyping(); }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message…"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button
                      onClick={send}
                      disabled={!text.trim() || sending}
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full bg-primary hover:bg-primary/90"
                    >
                      {sending
                        ? <Circle size={16} className="animate-spin" />
                        : <Send size={16} />
                      }
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Send size={24} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Your messages</p>
                  <p className="mt-1 text-sm text-muted-foreground">Select a conversation to start chatting.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const LearnerMessages   = () => <Messages role="learner" />;
export const CoachMessages     = () => <Messages role="coach" />;
export const CreatorMessages   = () => <Messages role="creator" />;
export const TherapistMessages = () => <Messages role="therapist" />;
