import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ScrollableContent } from "@/components/ui/scrollable-content";
import { PageLoading } from "@/components/LoadingSpinner";

const ProfileSettings = ({ role }: { role: "learner" | "coach" | "creator" }) => {
  const { profile, user, refreshProfile, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [loading, setLoading] = useState(false);

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setPhone(profile.phone || "");
      setCountry(profile.country || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in to update your profile");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName,
        bio,
        phone,
        country,
      }).eq("user_id", user.id);
      
      if (error) {
        console.error("Profile update error:", error);
        toast.error(error.message || "Failed to update profile");
      } else {
        toast.success("Profile updated successfully");
        await refreshProfile();
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout role={role}>
      <ScrollableContent maxHeight="h-full" className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <div className="bg-card border border-border rounded-lg p-6 max-w-lg space-y-4">
        <div>
          <Label>Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>Country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
        </div>
      </ScrollableContent>
    </DashboardLayout>
  );
};

export const LearnerProfile = () => <ProfileSettings role="learner" />;
export const CoachProfileSettings = () => <ProfileSettings role="coach" />;
export const CreatorProfileSettings = () => <ProfileSettings role="creator" />;
