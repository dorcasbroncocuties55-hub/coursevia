/**
 * LearnerCourtRoom
 *
 * Full-screen court room view for the learner who filed a refund.
 * Shows: judge name + rank, provider name, live chat, evidence upload.
 * Returns null if the learner has no active court case.
 *
 * Usage: render at the top of LearnerDashboard (and any learner page
 * you want to intercept). The PortalRestrictionGuard equivalent for learners.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Scale, User, Gavel, Send, Upload, FileText, Image, Video,
  Music, File, X, CheckCircle, AlertTriangle, Shield, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaseDetails {
  id: string;
  case_number: string;
  dispute_type: string;
  status: string;
  priority_level: string;
  disputed_amount: number;
  opened_at: string;
  learner_id: string;
  provider_id: string;
  assigned_judge_id?: string;
  judges?: { full_name: string; rank: string };
  learner_name?: string;
  provider_name?: string;
}

interface CaseMessage {
  id: string;
  sender_id: string;
  sender_type: "learner" | "provider" | "judge" | "system";
  message_type: string;
  content: string;
  created_at: string;
}

interface UploadFile {
  localId: string;
  file: File;
  preview?: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface Props {
  userId: string;
}

// ─── Allowed types ────────────────────────────────────────────────────────────

const ALLOWED_MIME: Record<string, boolean> = {
  "image/jpeg": true, "image/png": true, "image/webp": true, "image/gif": true,
  "application/pdf": true,
  "application/msword": true,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
  "video/mp4": true, "video/quicktime": true,
  "audio/mpeg": true, "audio/wav": true,
  "text/plain": true,
};
const MAX_BYTES = 25 * 1024 * 1024;

const FileIcon = ({ mime }: { mime: string }) => {
  if (mime.startsWith("image/")) return <Image size={18} className="text-blue-400" />;
  if (mime.startsWith("video/")) return <Video size={18} className="text-purple-400" />;
  if (mime.startsWith("audio/")) return <Music size={18} className="text-green-400" />;
  if (mime === "application/pdf") return <FileText size={18} className="text-red-400" />;
  return <File size={18} className="text-gray-400" />;
};

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LearnerCourtRoom({ userId }: Props) {
  const [caseData, setCaseData]     = useState<CaseDetails | null>(null);
  const [loading, setLoading]       = useState(true);
  const [caseError, setCaseError]   = useState<string | null>(null);
  const [messages, setMessages]     = useState<CaseMessage[]>([]);
  const [msgInput, setMsgInput]     = useState("");
  const [sending, setSending]       = useState(false);
  const [activeTab, setActiveTab]   = useState<"chat" | "evidence">("chat");
  const [files, setFiles]           = useState<UploadFile[]>([]);
  const [evTitle, setEvTitle]       = useState("");
  const [evDesc, setEvDesc]         = useState("");
  const [evWeight, setEvWeight]     = useState<"minor" | "normal" | "major" | "critical">("normal");
  const [uploading, setUploading]   = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const messagesEndRef              = useRef<HTMLDivElement>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load active court case where this user is the learner ──────────────────
  const loadCase = useCallback(async () => {
    setLoading(true);
    setCaseError(null);
    try {
      const { data: cases, error } = await supabase
        .from("court_cases")
        .select(`
          id, case_number, dispute_type, status, priority_level,
          disputed_amount, opened_at, learner_id, provider_id,
          assigned_judge_id,
          judges ( full_name, rank )
        `)
        .eq("learner_id", userId)
        .in("status", ["open", "under_review", "in_progress"])
        .order("opened_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!cases || cases.length === 0) { setCaseData(null); setLoading(false); return; }

      const c = cases[0] as any;

      const [{ data: learnerProfile }, { data: providerProfile }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", c.learner_id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", c.provider_id).maybeSingle(),
      ]);

      setCaseData({
        ...c,
        judges: c.judges ?? undefined,
        learner_name:  (learnerProfile as any)?.full_name  || "You",
        provider_name: (providerProfile as any)?.full_name || "Provider",
      });

      const { data: msgs } = await supabase
        .from("case_messages")
        .select("*")
        .eq("case_id", c.id)
        .eq("is_internal", false)
        .order("created_at", { ascending: true });
      setMessages((msgs as CaseMessage[]) || []);
    } catch (e: any) {
      setCaseError(e?.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadCase(); }, [loadCase]);

  // ── Real-time messages ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!caseData?.id) return;
    const ch = supabase
      .channel(`learner-msgs-${caseData.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "case_messages",
        filter: `case_id=eq.${caseData.id}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (!msg.is_internal) setMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [caseData?.id]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!msgInput.trim() || !caseData || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("case_messages").insert({
        case_id:      caseData.id,
        sender_id:    userId,
        sender_type:  "learner",
        message_type: "text",
        content:      msgInput.trim(),
        is_internal:  false,
        visible_to:   ["learner", "provider", "judge"],
      });
      if (error) throw error;
      setMsgInput("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // ── Evidence file handling ─────────────────────────────────────────────────
  const addFiles = async (list: FileList) => {
    const added: UploadFile[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f.size > MAX_BYTES) { toast.error(`${f.name} exceeds 25 MB`); continue; }
      if (!ALLOWED_MIME[f.type]) { toast.error(`${f.name}: file type not allowed`); continue; }
      let preview: string | undefined;
      if (f.type.startsWith("image/")) {
        preview = await new Promise<string>(res => {
          const r = new FileReader();
          r.onload = e => res(e.target!.result as string);
          r.readAsDataURL(f);
        });
      }
      added.push({ localId: crypto.randomUUID(), file: f, preview, status: "pending" });
    }
    setFiles(prev => [...prev, ...added]);
  };

  const uploadEvidence = async () => {
    if (!evTitle.trim() || files.length === 0 || !caseData || uploading) return;
    setUploading(true);
    let allOk = true;
    for (const fu of files) {
      setFiles(prev => prev.map(f => f.localId === fu.localId ? { ...f, status: "uploading" } : f));
      try {
        const ext  = fu.file.name.split(".").pop() || "bin";
        const path = `${caseData.id}/learner-${Date.now()}-${fu.localId}.${ext}`;
        const { error: storErr } = await supabase.storage.from("evidence-files").upload(path, fu.file);
        if (storErr) throw storErr;
        const { data: urlData } = supabase.storage.from("evidence-files").getPublicUrl(path);

        let evidenceType = "document";
        if (fu.file.type.startsWith("image/")) evidenceType = "image";
        else if (fu.file.type.startsWith("video/")) evidenceType = "video";
        else if (fu.file.type.startsWith("audio/")) evidenceType = "audio";

        const res = await fetch(`/api/court/case/${caseData.id}/evidence`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id":   userId,
            "x-user-role": "learner",
          },
          body: JSON.stringify({
            title:          files.length === 1 ? evTitle : `${evTitle} (${files.indexOf(fu) + 1}/${files.length})`,
            description:    evDesc || undefined,
            evidenceType,
            fileName:       fu.file.name,
            fileUrl:        urlData.publicUrl,
            fileSize:       fu.file.size,
            fileType:       fu.file.type,
            evidenceWeight: evWeight,
            isPublic:       true,
          }),
        });
        if (!res.ok) throw new Error("Evidence record failed");
        setFiles(prev => prev.map(f => f.localId === fu.localId ? { ...f, status: "done" } : f));
      } catch (e: any) {
        allOk = false;
        setFiles(prev => prev.map(f =>
          f.localId === fu.localId ? { ...f, status: "error", error: e?.message || "Upload failed" } : f
        ));
      }
    }
    setUploading(false);
    if (allOk) {
      toast.success("Evidence submitted successfully");
      setFiles([]); setEvTitle(""); setEvDesc(""); setEvWeight("normal");
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const senderLabel = (msg: CaseMessage) => {
    if (msg.sender_type === "system") return "System";
    if (msg.sender_type === "judge")  return `Judge ${caseData?.judges?.full_name || ""}`;
    if (msg.sender_id === caseData?.provider_id) return caseData?.provider_name || "Provider";
    return "You";
  };

  const bubbleColor = (msg: CaseMessage) => {
    if (msg.sender_type === "system") return "bg-blue-900 border border-blue-700 text-xs text-center mx-auto";
    if (msg.sender_type === "judge")  return "bg-yellow-900 border border-yellow-700";
    if (msg.sender_id === userId)     return "bg-[#0b7e84] text-white";
    return "bg-gray-700";
  };

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b7e84] mx-auto mb-4" />
          <p>Checking account status…</p>
        </div>
      </div>
    );
  }

  if (caseError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
        <div className="text-center text-white max-w-sm">
          <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Could not load case</h2>
          <p className="text-gray-400 mb-4">{caseError}</p>
          <button onClick={loadCase} className="flex items-center gap-2 mx-auto bg-[#0b7e84] px-4 py-2 rounded-lg text-white">
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // No active case for this learner — render nothing
  if (!caseData) return null;

  // ── Full court room UI ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col overflow-hidden">

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Scale className="text-[#0b7e84] shrink-0" size={32} />
            <div>
              <h1 className="text-xl font-bold text-white">
                Court Room — Case {caseData.case_number}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-300">
                <span className="capitalize">{caseData.dispute_type.replace(/_/g, " ")}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  caseData.priority_level === "urgent" ? "bg-red-600 text-white" :
                  caseData.priority_level === "high"   ? "bg-orange-500 text-white" :
                  caseData.priority_level === "medium" ? "bg-yellow-500 text-gray-900" :
                  "bg-green-600 text-white"
                }`}>
                  {caseData.priority_level.toUpperCase()}
                </span>
                <span>•</span>
                <span className="font-semibold text-white">${caseData.disputed_amount}</span>
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-700 text-blue-100">
            {caseData.status.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 shrink-0">
        <div className="flex gap-8">
          {(["chat", "evidence"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition capitalize ${
                activeTab === tab
                  ? "border-[#0b7e84] text-[#0b7e84]"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}>
              {tab === "chat" ? "💬 Live Chat" : "📁 Evidence"}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: chat / evidence */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {activeTab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-gray-500 text-sm mt-8">
                    No messages yet. Describe your issue clearly for the judge.
                  </p>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-md px-4 py-3 rounded-xl text-sm text-white ${bubbleColor(msg)}`}>
                      <div className="flex items-center gap-2 mb-1 opacity-75 text-xs">
                        {msg.sender_type === "judge"  && <Gavel size={11} />}
                        {msg.sender_type === "system" && <Shield size={11} />}
                        {(msg.sender_type === "learner" || msg.sender_type === "provider") && <User size={11} />}
                        <span className="font-medium">{senderLabel(msg)}</span>
                        <span className="ml-auto">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-gray-700 p-4 shrink-0">
                <div className="flex gap-3">
                  <input
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Describe your issue clearly for the judge…"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-[#0b7e84]"
                  />
                  <button onClick={sendMessage} disabled={!msgInput.trim() || sending}
                    className="bg-[#0b7e84] hover:bg-[#096a70] disabled:bg-gray-600 text-white px-4 rounded-lg transition">
                    <Send size={18} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">All messages are visible to the provider and assigned judge.</p>
              </div>
            </>
          )}

          {activeTab === "evidence" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl mx-auto space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload size={20} className="text-[#0b7e84]" /> Submit Evidence
                </h3>

                <div className="space-y-3">
                  <input value={evTitle} onChange={e => setEvTitle(e.target.value)}
                    placeholder="Evidence title *"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0b7e84]" />
                  <textarea value={evDesc} onChange={e => setEvDesc(e.target.value)}
                    placeholder="Description (optional)" rows={2}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0b7e84] resize-none" />
                  <select value={evWeight} onChange={e => setEvWeight(e.target.value as any)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0b7e84]">
                    <option value="minor">Minor — supporting info</option>
                    <option value="normal">Normal — standard evidence</option>
                    <option value="major">Major — important proof</option>
                    <option value="critical">Critical — key evidence</option>
                  </select>
                </div>

                <div
                  onDrop={e => { e.preventDefault(); setDragActive(false); e.dataTransfer.files && addFiles(e.dataTransfer.files); }}
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                    dragActive ? "border-[#0b7e84] bg-gray-700" : "border-gray-600 hover:border-gray-500"
                  }`}>
                  <input ref={fileInputRef} type="file" multiple
                    accept={Object.keys(ALLOWED_MIME).join(",")}
                    className="hidden"
                    onChange={e => e.target.files && addFiles(e.target.files)} />
                  <Upload className="mx-auto text-gray-400 mb-2" size={36} />
                  <p className="text-gray-300 text-sm">Drop files here or click to browse</p>
                  <p className="text-gray-500 text-xs mt-1">Images, Videos, PDFs, Docs, Audio — max 25 MB each</p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map(fu => (
                      <div key={fu.localId} className="flex items-center gap-3 bg-gray-700 border border-gray-600 rounded-lg p-3">
                        {fu.preview
                          ? <img src={fu.preview} className="w-10 h-10 rounded object-cover" alt="" />
                          : <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center"><FileIcon mime={fu.file.type} /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{fu.file.name}</p>
                          <p className="text-xs text-gray-400">{fmtBytes(fu.file.size)}</p>
                          {fu.status === "uploading" && <div className="mt-1 h-1 bg-gray-600 rounded-full"><div className="h-1 bg-[#0b7e84] rounded-full w-1/2 animate-pulse" /></div>}
                          {fu.status === "done"      && <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5"><CheckCircle size={10} /> Uploaded</p>}
                          {fu.status === "error"     && <p className="text-xs text-red-400 flex items-center gap-1 mt-0.5"><AlertTriangle size={10} /> {fu.error}</p>}
                        </div>
                        {fu.status === "pending" && (
                          <button onClick={() => setFiles(prev => prev.filter(f => f.localId !== fu.localId))} className="text-gray-500 hover:text-red-400">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={uploadEvidence}
                  disabled={!evTitle.trim() || files.length === 0 || uploading}
                  className="w-full flex items-center justify-center gap-2 bg-[#0b7e84] hover:bg-[#096a70] disabled:bg-gray-600 text-white py-3 rounded-xl font-medium transition">
                  {uploading
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Uploading…</>
                    : <><Upload size={16} /> Submit Evidence</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: participants sidebar */}
        <div className="w-72 bg-gray-800 border-l border-gray-700 p-5 flex-col gap-4 overflow-y-auto shrink-0 hidden lg:flex">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Case Participants</h3>

          {/* Judge */}
          <div className="bg-yellow-900/60 border border-yellow-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-yellow-700 rounded-full flex items-center justify-center shrink-0">
                <Gavel size={16} className="text-yellow-200" />
              </div>
              <div>
                <p className="text-xs text-yellow-400 font-medium uppercase tracking-wide">Presiding Judge</p>
                <p className="text-sm font-semibold text-yellow-100">
                  {caseData.judges?.full_name || "Unassigned"}
                </p>
                {caseData.judges?.rank && (
                  <p className="text-xs text-yellow-400 capitalize">{caseData.judges.rank} Judge</p>
                )}
              </div>
            </div>
          </div>

          {/* You (learner) */}
          <div className="bg-green-900/60 border border-green-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center shrink-0">
                <User size={16} className="text-green-200" />
              </div>
              <div>
                <p className="text-xs text-green-400 font-medium uppercase tracking-wide">Complainant (You)</p>
                <p className="text-sm font-semibold text-green-100">{caseData.learner_name}</p>
                <p className="text-xs text-green-400">Filed refund request</p>
              </div>
            </div>
          </div>

          {/* Provider */}
          <div className="bg-purple-900/60 border border-purple-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-700 rounded-full flex items-center justify-center shrink-0">
                <User size={16} className="text-purple-200" />
              </div>
              <div>
                <p className="text-xs text-purple-400 font-medium uppercase tracking-wide">Defendant</p>
                <p className="text-sm font-semibold text-purple-100">{caseData.provider_name}</p>
                <p className="text-xs text-purple-400">Service provider</p>
              </div>
            </div>
          </div>

          {/* Case info */}
          <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
            <h4 className="text-xs text-gray-400 uppercase tracking-wide font-medium">Case Info</h4>
            <div className="flex justify-between text-gray-300">
              <span className="text-gray-500">Opened</span>
              <span>{new Date(caseData.opened_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span className="text-gray-500">Amount</span>
              <span className="font-semibold">${caseData.disputed_amount}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span className="text-gray-500">Status</span>
              <span className="capitalize">{caseData.status.replace(/_/g, " ")}</span>
            </div>
          </div>

          {/* Info box */}
          <div className="border-t border-gray-700 pt-4">
            <div className="rounded-xl p-3 text-xs bg-blue-900/50 border border-blue-700 space-y-1">
              <p className="font-semibold text-blue-300">⚖️ What happens next?</p>
              <p className="text-blue-400">
                The judge will review all messages and evidence from both sides before making a final decision.
                You will receive an email notification when a decision is made.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
