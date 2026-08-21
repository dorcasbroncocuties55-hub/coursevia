/**
 * AddNewService
 * Standalone page for creating new therapy services
 * Route: /therapist/services/new
 * Saves directly to therapist_services table in Supabase
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TherapistLayout from "@/components/layouts/TherapistLayout";
import { ArrowLeft, User, Users, Activity, Smile, Sun, Moon, Heart, MoreVertical } from "lucide-react";
import { toast } from "sonner";

const iconOptions = [
  { Icon: User, bg: "#EBF5F6", color: "#0B4F60" },
  { Icon: Users, bg: "#F2ECFE", color: "#7F56D9" },
  { Icon: Activity, bg: "#FFF1E6", color: "#D97706" },
  { Icon: Smile, bg: "#EAF7EE", color: "#10B981" },
  { Icon: Sun, bg: "#FFF1E6", color: "#D97706" },
  { Icon: Moon, bg: "#FFEBF5", color: "#D53F8C" },
  { Icon: Heart, bg: "#F2ECFE", color: "#7F56D9" },
];

export default function AddNewService() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("individual");
  const [duration, setDuration] = useState("50");
  const [price, setPrice] = useState("120");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!serviceName.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!duration || parseInt(duration) <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }
    if (!price || parseFloat(price) < 0) {
      toast.error("Price must be 0 or greater");
      return;
    }
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    setSaving(true);
    try {
      // Get therapist_profile_id
      const { data: profile } = await supabase
        .from("therapist_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.id) {
        toast.error("Therapist profile not found");
        setSaving(false);
        return;
      }

      // Insert service
      const { error } = await supabase.from("therapist_services").insert({
        therapist_id: profile.id,
        title: serviceName.trim(),
        description: description.trim() || null,
        duration_minutes: parseInt(duration),
        price: parseFloat(price),
        is_active: isActive,
        category: category,
        icon_index: selectedIcon,
      });

      if (error) throw error;

      toast.success("Service created successfully");
      navigate("/therapist/services");
    } catch (e: any) {
      toast.error(e.message || "Failed to create service");
    } finally {
      setSaving(false);
    }
  };

  const selectedIconData = iconOptions[selectedIcon];

  return (
    <TherapistLayout>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: 40, gap: 32, background: "#F8FAFC", minHeight: 900 }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 1260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => navigate("/therapist/services")} style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 10, width: 36, height: 36, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer" }}>
              <ArrowLeft size={16} color="#0B4F60" />
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h1 style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 28, color: "#0B4F60", margin: 0 }}>Add New Service</h1>
              <p style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 14, color: "#64748B", margin: 0 }}>Configure and launch a new therapy session option for your patients.</p>
            </div>
          </div>
        </div>

        {/* Split Content */}
        <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 1260 }}>
          
          {/* Form Card */}
          <div style={{ display: "flex", flexDirection: "column", padding: 32, gap: 24, flex: 1, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16 }}>
            
            {/* Section Title */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h2 style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 18, color: "#0F172A", margin: 0 }}>Service Details</h2>
              <p style={{ fontFamily: "Inter", fontSize: 13, color: "#64748B", margin: 0 }}>Basic parameters and descriptions representing your offering.</p>
            </div>

            <div style={{ height: 0, border: "1px solid #E2E8F0" }} />

            {/* Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Service Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#0F172A" }}>Service Name</label>
                <input value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="e.g. Cognitive Behavioral Therapy (CBT)" style={{ padding: "12px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "Inter", fontSize: 14, color: "#0F172A", outline: "none" }} />
              </div>

              {/* Category + Duration */}
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#0F172A" }}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: "12px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "Inter", fontWeight: 500, fontSize: 14, color: "#0F172A", outline: "none", cursor: "pointer" }}>
                    <option value="individual">Individual Therapy</option>
                    <option value="couples">Couples Therapy</option>
                    <option value="family">Family Therapy</option>
                    <option value="group">Group Therapy</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#0F172A" }}>Duration (Minutes)</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="1" style={{ padding: "12px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "Inter", fontSize: 14, color: "#0F172A", outline: "none" }} />
                </div>
              </div>

              {/* Price + Status */}
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#0F172A" }}>Price ($ USD)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" step="0.01" style={{ padding: "12px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "Inter", fontSize: 14, color: "#0F172A", outline: "none" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#0F172A" }}>Initial Status</label>
                  <div style={{ display: "flex", alignItems: "center", padding: "10px 0", gap: 12 }}>
                    <button onClick={() => setIsActive(!isActive)} style={{ display: "flex", justifyContent: isActive ? "flex-end" : "flex-start", alignItems: "center", padding: 2, width: 48, height: 24, background: isActive ? "#0B4F60" : "#CBD5E1", borderRadius: 12, border: "none", cursor: "pointer", transition: "background 0.2s" }}>
                      <div style={{ width: 20, height: 20, background: "#fff", borderRadius: "50%" }} />
                    </button>
                    <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: isActive ? "#0B4F60" : "#64748B" }}>
                      {isActive ? "Active (Visible to patients)" : "Inactive (Hidden)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#0F172A" }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Evidence-based therapy sessions focused on identifying, understanding, and changing destructive or disturbing thought patterns." rows={4} style={{ padding: "12px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "Inter", fontSize: 14, lineHeight: "140%", color: "#0F172A", outline: "none", resize: "vertical" }} />
              </div>

              {/* Icon Picker */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#0F172A" }}>Service Icon & Accent Color</label>
                  <p style={{ fontFamily: "Inter", fontSize: 12, color: "#64748B", margin: 0 }}>Choose an icon and color theme that will distinguish this service on your patient hub.</p>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {iconOptions.map((opt, i) => {
                    const Icon = opt.Icon;
                    const selected = i === selectedIcon;
                    return (
                      <button key={i} onClick={() => setSelectedIcon(i)} style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 4, width: 48, height: 48, border: selected ? "2px solid #0B4F60" : "2px solid transparent", borderRadius: 24, background: "transparent", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, background: opt.bg, borderRadius: 20 }}>
                          <Icon size={18} color={opt.color} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ height: 0, border: "1px solid #E2E8F0" }} />

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => navigate("/therapist/services")} disabled={saving} style={{ padding: "12px 24px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: "#64748B", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "12px 24px", background: saving ? "#94A3B8" : "#0B4F60", border: "none", borderRadius: 8, fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: "#fff", cursor: saving ? "default" : "pointer" }}>
                {saving ? "Saving..." : "Save Service"}
              </button>
            </div>
          </div>

          {/* Preview Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, width: 380, flexShrink: 0 }}>
            
            {/* Preview Header */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h3 style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#64748B", margin: 0 }}>Live Preview</h3>
              <p style={{ fontFamily: "Inter", fontSize: 13, lineHeight: "16px", color: "#64748B", margin: 0 }}>This is how your new service card will look on the main practitioner dashboard.</p>
            </div>

            {/* Service Card Preview */}
            <div style={{ display: "flex", flexDirection: "column", padding: 24, gap: 16, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16 }}>
              
              {/* Card Top */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, background: selectedIconData.bg, borderRadius: 20 }}>
                    <selectedIconData.Icon size={18} color={selectedIconData.color} />
                  </div>
                  <h4 style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 16, color: "#0F172A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                    {serviceName || "Service Name"}
                  </h4>
                </div>
                <button style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 8px" }}>
                  <MoreVertical size={16} color="#64748B" />
                </button>
              </div>

              {/* Description */}
              <p style={{ fontFamily: "Inter", fontSize: 14, lineHeight: "140%", color: "#64748B", margin: 0, minHeight: 40, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {description || "Evidence-based therapy sessions focused on identifying, understanding, and changing destructive or disturbing thought patterns."}
              </p>

              {/* Divider */}
              <div style={{ height: 0, border: "1px solid #E2E8F0" }} />

              {/* Card Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 24 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{duration || "50"} min</span>
                    <span style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 11, color: "#64748B" }}>Duration</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 14, color: "#0F172A" }}>${price || "120"}</span>
                    <span style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 11, color: "#64748B" }}>Price</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", padding: "4px 10px", background: isActive ? "#EAF7EE" : "#F1F5F9", borderRadius: 100 }}>
                  <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 12, color: isActive ? "#10B981" : "#64748B" }}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TherapistLayout>
  );
}
