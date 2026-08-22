import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import CoachLayout from "@/components/layouts/CoachLayout";
import { useProviderBookings, fmtDate, fmtTime, getInitials } from "@/lib/portalEngine";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Lock } from "lucide-react";
import { toast } from "sonner";

const A = "#2D9E6B", D = "#0F3D2E", B = "#EAE6E2", TM = "#1A1A1A", TS = "#6B7280";

const SOAP_LABELS = ["S — Subjective", "O — Objective", "A — Assessment", "P — Plan"];

export default function CoachSessions() {
  const { user } = useAuth();
  const { data: bookings, loading } = useProviderBookings(user?.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [soap, setSoap] = useState({ s: "", o: "", a: "", p: "" });
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);

  const sorted = [...(bookings || [])].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  const selected = sorted.find(b => b.id === (selectedId ?? sorted[0]?.id)) ?? sorted[0];

  // Load notes from booking.notes when selecting
  const selectBooking = (b: typeof sorted[0]) => {
    setSelectedId(b.id);
    setLocked(false);
    try {
      const parsed = b.notes ? JSON.parse(b.notes) : {};
      setSoap({ s: parsed.s || "", o: parsed.o || "", a: parsed.a || "", p: parsed.p || "" });
    } catch { setSoap({ s: b.notes || "", o: "", a: "", p: "" }); }
  };

  const handleSave = async (lock = false) => {
    if (!selected) return;
    setSaving(true);
    try {
      const notesJson = JSON.stringify({ s: soap.s, o: soap.o, a: soap.a, p: soap.p, locked: lock });
      const { error } = await supabase.from("bookings").update({ notes: notesJson, updated_at: new Date().toISOString() }).eq("id", selected.id);
      if (error) throw error;
      if (lock) setLocked(true);
      toast.success(lock ? "Note signed & locked" : "Draft saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <CoachLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: "1 1 auto", minWidth: 200 }}>
          <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: 0 }}>Session Notes & Clinical Logs</h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, marginTop: 4 }}>Draft and lock SOAP clinical files for compliance and progress tracking.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button disabled={!selected || saving || locked} onClick={() => handleSave(false)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              border: `1px solid ${B}`, background: (!selected || saving || locked) ? "#F3F4F6" : "#F9F8F6",
              fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12,
              color: (!selected || saving || locked) ? "#9CA3AF" : TS,
              cursor: (!selected || saving || locked) ? "not-allowed" : "pointer",
              opacity: (!selected || saving || locked) ? 0.6 : 1
            }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Draft
          </button>
          <button disabled={!selected || saving || locked} onClick={() => handleSave(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              border: "none", background: (!selected || saving || locked) ? "#D1D5DB" : A,
              fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: "#fff",
              cursor: (!selected || saving || locked) ? "not-allowed" : "pointer",
              opacity: (!selected || saving || locked) ? 0.6 : 1
            }}>
            <Lock size={12} /> Sign & Lock
          </button>
        </div>
      </div>

      {loading
        ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Loader2 size={28} className="animate-spin" style={{ color: A }} /></div>
        : (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* History list */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 15, color: D, margin: "0 0 12px" }}>Session History</h3>
              {sorted.length === 0
                ? <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>No sessions yet</p>
                : sorted.map(b => {
                  const isSelected = b.id === (selectedId ?? sorted[0]?.id);
                  let isLocked = false;
                  try { isLocked = b.notes ? JSON.parse(b.notes).locked === true : false; } catch { }
                  return (
                    <div key={b.id} onClick={() => selectBooking(b)}
                      style={{ background: isSelected ? "#fff" : "#F1EFEA", border: `1px solid ${isSelected ? A : B}`, borderRadius: 10, padding: 14, marginBottom: 8, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TM }}>{b.learner?.full_name || "Client"}</span>
                        <span style={{
                          padding: "2px 6px", borderRadius: 4,
                          background: isLocked ? "#F0FDF4" : "#FEF3C7",
                          fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 9,
                          color: isLocked ? "#166534" : "#92400E"
                        }}>
                          {isLocked ? "Locked" : "Draft"}
                        </span>
                      </div>
                      <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: A, margin: "0 0 2px" }}>{b.service?.title || "Session"}</p>
                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS }}>{fmtDate(b.scheduled_at)} · {fmtTime(b.scheduled_at)}</span>
                    </div>
                  );
                })}
            </div>

            {/* SOAP editor */}
            {selected && (
              <div style={{ flex: "1 1 400px", background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 28 }}>
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 22, color: D, margin: 0 }}>
                    SOAP Note: {selected.learner?.full_name || "Client"}
                  </h2>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, marginTop: 4 }}>
                    Session: {fmtDate(selected.scheduled_at)} · {fmtTime(selected.scheduled_at)} · {selected.service?.title || "Session"}
                    {locked && <span style={{ marginLeft: 8, padding: "1px 6px", borderRadius: 4, background: "#F0FDF4", fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 9, color: "#166534" }}>LOCKED</span>}
                  </p>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${B}`, marginBottom: 20 }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { key: "s" as const, label: "S — Subjective Observation", placeholder: "What the client reported…" },
                    { key: "o" as const, label: "O — Objective Measurements", placeholder: "Clinical observations, scores…" },
                    { key: "a" as const, label: "A — Clinical Assessment", placeholder: "Your clinical assessment…" },
                    { key: "p" as const, label: "P — Treatment Plan", placeholder: "Next steps and treatment plan…" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: A, textTransform: "uppercase", margin: "0 0 6px" }}>{label}</p>
                      <textarea
                        value={soap[key]}
                        onChange={e => { if (!locked) setSoap(s => ({ ...s, [key]: e.target.value })); }}
                        placeholder={locked ? "" : placeholder}
                        readOnly={locked}
                        rows={4}
                        style={{
                          width: "100%", padding: 12, background: locked ? "#F9F8F6" : "#F9F8F6", border: `1px solid ${B}`, borderRadius: 8,
                          fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none", resize: "vertical",
                          boxSizing: "border-box", cursor: locked ? "default" : "text"
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </CoachLayout>
  );
}
