import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Save, Bell, Mail, Lock, Globe, CreditCard } from "lucide-react";
import { toast } from "sonner";

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
};

export default function CreatorSettings() {
  const { profile } = useAuth();
  
  const [profileData, setProfileData] = useState({
    fullName: profile?.full_name || "",
    email: profile?.email || "",
    bio: "",
    website: "",
    twitter: "",
    linkedin: "",
  });

  const [notifications, setNotifications] = useState({
    emailNewEnrollment: true,
    emailNewMessage: true,
    emailWeeklyReport: true,
    emailMarketingUpdates: false,
    pushNewEnrollment: true,
    pushNewMessage: true,
    pushNewReview: true,
  });

  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showCourseList: true,
    showReviews: true,
  });

  const handleSaveProfile = () => {
    // In production: call Supabase API to update profile
    toast.success("Profile updated successfully");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved");
  };

  const handleSavePrivacy = () => {
    toast.success("Privacy settings saved");
  };

  return (
    <div style={{ fontFamily: "Inter,sans-serif", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: S.full, margin: 0, marginBottom: 8 }}>
          Settings
        </h1>
        <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <div style={{
        background: S.card,
        borderRadius: 12,
        border: `1px solid ${S.border}`,
        padding: 32,
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: S.accentLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Camera size={20} style={{ color: S.accent }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: S.full, margin: 0 }}>
            Profile Information
          </h2>
        </div>

        {/* Avatar */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ 
            display: "block", 
            fontSize: 14, 
            fontWeight: 600, 
            color: S.full, 
            marginBottom: 12 
          }}>
            Profile Photo
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: S.accentLight,
              color: S.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}>
              {profile?.full_name?.charAt(0) || "C"}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{
                padding: "10px 18px",
                background: S.accent,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}>
                Upload New
              </button>
              <button style={{
                padding: "10px 18px",
                background: "transparent",
                color: S.dim,
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}>
                Remove
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Full Name */}
          <div>
            <label style={{ 
              display: "block", 
              fontSize: 14, 
              fontWeight: 600, 
              color: S.full, 
              marginBottom: 8 
            }}>
              Full Name
            </label>
            <input
              type="text"
              value={profileData.fullName}
              onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                fontSize: 15,
                fontFamily: "Inter,sans-serif",
                outline: "none",
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ 
              display: "block", 
              fontSize: 14, 
              fontWeight: 600, 
              color: S.full, 
              marginBottom: 8 
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                fontSize: 15,
                fontFamily: "Inter,sans-serif",
                outline: "none",
              }}
            />
          </div>

          {/* Bio */}
          <div>
            <label style={{ 
              display: "block", 
              fontSize: 14, 
              fontWeight: 600, 
              color: S.full, 
              marginBottom: 8 
            }}>
              Bio
            </label>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              rows={4}
              placeholder="Tell students about yourself..."
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                fontSize: 15,
                fontFamily: "Inter,sans-serif",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          {/* Social Links */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ 
                display: "block", 
                fontSize: 14, 
                fontWeight: 600, 
                color: S.full, 
                marginBottom: 8 
              }}>
                Website
              </label>
              <input
                type="url"
                value={profileData.website}
                onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                placeholder="https://yourwebsite.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: `1px solid ${S.border}`,
                  borderRadius: 8,
                  fontSize: 15,
                  fontFamily: "Inter,sans-serif",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: "block", 
                fontSize: 14, 
                fontWeight: 600, 
                color: S.full, 
                marginBottom: 8 
              }}>
                Twitter
              </label>
              <input
                type="text"
                value={profileData.twitter}
                onChange={(e) => setProfileData({ ...profileData, twitter: e.target.value })}
                placeholder="@username"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: `1px solid ${S.border}`,
                  borderRadius: 8,
                  fontSize: 15,
                  fontFamily: "Inter,sans-serif",
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            background: S.accent,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Save size={18} />
          Save Changes
        </button>
      </div>

      {/* Notification Settings */}
      <div style={{
        background: S.card,
        borderRadius: 12,
        border: `1px solid ${S.border}`,
        padding: 32,
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: S.accentLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Bell size={20} style={{ color: S.accent }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: S.full, margin: 0 }}>
            Notifications
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Email Notifications */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: S.full, margin: "0 0 16px" }}>
              Email Notifications
            </h3>
            {[
              { key: "emailNewEnrollment", label: "New student enrollments" },
              { key: "emailNewMessage", label: "New messages from students" },
              { key: "emailWeeklyReport", label: "Weekly performance report" },
              { key: "emailMarketingUpdates", label: "Marketing updates and tips" },
            ].map(({ key, label }) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: `1px solid ${S.border}`,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 15, color: S.full }}>{label}</span>
                <input
                  type="checkbox"
                  checked={notifications[key as keyof typeof notifications]}
                  onChange={(e) => setNotifications({ 
                    ...notifications, 
                    [key]: e.target.checked 
                  })}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: "pointer",
                    accentColor: S.accent,
                  }}
                />
              </label>
            ))}
          </div>

          {/* Push Notifications */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: S.full, margin: "0 0 16px" }}>
              Push Notifications
            </h3>
            {[
              { key: "pushNewEnrollment", label: "New enrollments" },
              { key: "pushNewMessage", label: "New messages" },
              { key: "pushNewReview", label: "New course reviews" },
            ].map(({ key, label }) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: `1px solid ${S.border}`,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 15, color: S.full }}>{label}</span>
                <input
                  type="checkbox"
                  checked={notifications[key as keyof typeof notifications]}
                  onChange={(e) => setNotifications({ 
                    ...notifications, 
                    [key]: e.target.checked 
                  })}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: "pointer",
                    accentColor: S.accent,
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSaveNotifications}
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            background: S.accent,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Save size={18} />
          Save Preferences
        </button>
      </div>

      {/* Privacy Settings */}
      <div style={{
        background: S.card,
        borderRadius: 12,
        border: `1px solid ${S.border}`,
        padding: 32,
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: S.accentLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Lock size={20} style={{ color: S.accent }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: S.full, margin: 0 }}>
            Privacy & Visibility
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { key: "showProfile", label: "Show my profile publicly", desc: "Your profile will be visible to all users" },
            { key: "showCourseList", label: "Show my course list", desc: "Display all your courses on your profile" },
            { key: "showReviews", label: "Show course reviews", desc: "Display student reviews on course pages" },
          ].map(({ key, label, desc }) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 0",
                borderBottom: `1px solid ${S.border}`,
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: S.full, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: S.dim }}>
                  {desc}
                </div>
              </div>
              <input
                type="checkbox"
                checked={privacy[key as keyof typeof privacy]}
                onChange={(e) => setPrivacy({ 
                  ...privacy, 
                  [key]: e.target.checked 
                })}
                style={{
                  width: 18,
                  height: 18,
                  cursor: "pointer",
                  accentColor: S.accent,
                }}
              />
            </label>
          ))}
        </div>

        <button
          onClick={handleSavePrivacy}
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            background: S.accent,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Save size={18} />
          Save Settings
        </button>
      </div>

      {/* Danger Zone */}
      <div style={{
        background: S.card,
        borderRadius: 12,
        border: `1px solid #FCA5A5`,
        padding: 32,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#DC2626", margin: "0 0 16px" }}>
          Danger Zone
        </h2>
        <p style={{ fontSize: 14, color: S.dim, margin: "0 0 20px", lineHeight: 1.6 }}>
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button style={{
          padding: "10px 20px",
          background: "#FEE2E2",
          color: "#DC2626",
          border: `1px solid #FCA5A5`,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}>
          Delete Account
        </button>
      </div>
    </div>
  );
}
