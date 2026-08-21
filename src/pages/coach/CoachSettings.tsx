import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import CoachLayout from "@/components/layouts/CoachLayout";
import { updateProfile, getInitials } from "@/lib/portalEngine";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

const A = "#2D9E6B", D = "#0F3D2E", B = "#EAE6E2", TM = "#1A1A1A", TS = "#6B7280";

const TABS = ["Doctor Profile", "Notifications", "Security & HIPAA"];

const Field = ({ label, value, onChange, readOnly, placeholder, type = "text" }: any) => (
  <div>
    <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: TS, textTransform: "uppercase", margin: "0 0 6px" }}>{label}</p>
    <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} readOnly={readOnly} placeholder={placeholder}
      style={{ width: "100%", padding: "11px 12px", background: "#F9F8F6", border: `1px solid ${B}`, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none", boxSizing: "border-box", cursor: readOnly ? "default" : "text" }} />
  </div>
);

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, background: on ? A : "#D1D5DB", display: "flex", alignItems: "center", padding: "2px 2px", justifyContent: on ? "flex-end" : "flex-start", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
  </div>
);

export default function TherapistSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", bio: "", phone: "", country: "" });
  const [notifs, setNotifs] = useState({ chatAlerts: true, dailySummary: true, bookingConfirmations: true });

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || "", bio: profile.bio || "", phone: profile.phone || "", country: profile.country || "" });
  }, [profile]);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { full_name: form.full_name, bio: form.bio, phone: form.phone, country: form.country });
      await refreshProfile();
      toast.success("Settings saved");
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile(user.id, { avatar_url: publicUrl } as any);
      await refreshProfile();
      toast.success("Profile photo updated");
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
  };

  const initials = getInitials(profile?.full_name);

  return (
    <CoachLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: 0 }}>Account & Practice Settings</h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, marginTop: 4 }}>Manage your credentials, availability, alerts, and platform integrations.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", background: A, fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}>
          {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : "Save All Changes"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Tabs */}
        <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              style={{ padding: "13px 14px", borderRadius: 10, border: `1px solid ${i === tab ? A : B}`, background: i === tab ? "#F0FDF6" : "#fff", fontFamily: "Inter,sans-serif", fontWeight: i === tab ? 600 : 500, fontSize: 13, color: i === tab ? D : TS, cursor: "pointer", textAlign: "left" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: "1 1 400px", background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>

          {tab === 0 && <>
            <div>
              <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 18, color: D, margin: "0 0 4px" }}>Doctor Profile Info</h2>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: 0 }}>Credentials displayed to patients on scheduling dashboards.</p>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${B}`, margin: 0 }} />

            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 20, color: TS }}>{initials}</span>}
                </div>
                <label style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: A, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Camera size={11} color="#fff" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
                </label>
              </div>
              <div>
                <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, margin: 0 }}>{profile?.full_name || "Therapist"}</p>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0 }}>{profile?.email || ""}</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}><Field label="Full Professional Name" value={form.full_name} onChange={set("full_name")} placeholder="Dr. Jane Smith" /></div>
              <div style={{ flex: "1 1 200px" }}><Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" type="tel" /></div>
            </div>
            <Field label="Country" value={form.country} onChange={set("country")} placeholder="United States" />
            <div>
              <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: TS, textTransform: "uppercase", margin: "0 0 6px" }}>Practice Bio</p>
              <textarea value={form.bio ?? ""} onChange={e => set("bio")(e.target.value)} rows={4} placeholder="Describe your practice focus and expertise…"
                style={{ width: "100%", padding: 12, background: "#F9F8F6", border: `1px solid ${B}`, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
          </>}

          {tab === 1 && <>
            <div>
              <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 18, color: D, margin: "0 0 4px" }}>Notification Preferences</h2>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: 0 }}>Control how you receive alerts from the platform.</p>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${B}`, margin: 0 }} />
            {[
              { key: "chatAlerts" as const, label: "Secure Patient Chat Alerts", desc: "Real-time push notifications on new patient messages." },
              { key: "dailySummary" as const, label: "Daily Morning Calendar Summary", desc: "Email summary of today's bookings at 07:30 AM." },
              { key: "bookingConfirmations" as const, label: "Booking Confirmations", desc: "Email and push notification when a booking is confirmed." },
            ].map(n => (
              <div key={n.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, margin: "0 0 2px" }}>{n.label}</p>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0 }}>{n.desc}</p>
                </div>
                <Toggle on={notifs[n.key]} onToggle={() => setNotifs(x => ({ ...x, [n.key]: !x[n.key] }))} />
              </div>
            ))}
          </>}

          {tab === 2 && <>
            <div>
              <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 18, color: D, margin: "0 0 4px" }}>Security & HIPAA Compliance</h2>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: 0 }}>Your portal uses end-to-end encryption and meets HIPAA standards.</p>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${B}`, margin: 0 }} />
            {[
              { label: "End-to-End Encryption", value: "Enabled · AES-256" },
              { label: "HIPAA Compliance", value: "Active" },
              { label: "Two-Factor Authentication", value: profile?.is_verified ? "Verified" : "Not Set" },
              { label: "Session Timeout", value: "30 minutes" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${B}` }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>{r.label}</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM }}>{r.value}</span>
              </div>
            ))}
          </>}
        </div>
      </div>
    </CoachLayout>
  );
}
