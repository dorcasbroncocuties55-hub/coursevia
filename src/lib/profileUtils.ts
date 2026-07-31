import { supabase } from "@/integrations/supabase/client";

export interface ProfileData {
  user_id: string;
  email?: string;
  full_name?: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  bio?: string;
  phone?: string;
  country?: string;
  city?: string;
  profession?: string;
  experience?: string;
  certification?: string;
  specialization_type?: string;
  specialization_slug?: string;
  business_name?: string;
  business_email?: string;
  business_phone?: string;
  business_website?: string;
  business_address?: string;
  business_description?: string;
  learner_goal?: string;
  learner_looking_forward?: string;
  profile_slug?: string;
  onboarding_completed?: boolean;
  headline?: string;
  languages?: string[];
  skills?: string[];
  service_delivery_mode?: string;
  calendar_mode?: string;
  meeting_preference?: string;
  office_address?: string;
  phone_visible_after_booking?: boolean;
  is_verified?: boolean;
}

export const saveProfile = async (profileData: ProfileData) => {
  try {
    // First, update the profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          ...profileData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      console.error("Profile save error:", profileError);
      throw profileError;
    }

    // Update user roles
    if (profileData.role) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          {
            user_id: profileData.user_id,
            role: profileData.role,
          },
          { onConflict: "user_id,role" }
        );

      if (roleError) {
        console.warn("Role save warning:", roleError);
      }
    }

    // Update auth metadata
    try {
      await supabase.auth.updateUser({
        data: {
          role: profileData.role,
          requested_role: profileData.role,
          account_type: profileData.role,
          provider_type: profileData.role === "learner" ? null : profileData.role,
          avatar_url: profileData.avatar_url || null,
          full_name: profileData.full_name || null,
        },
      });
    } catch (authError) {
      console.warn("Auth metadata update failed:", authError);
    }

    // Create wallet if it doesn't exist
    try {
      await supabase
        .from("wallets")
        .upsert(
          {
            user_id: profileData.user_id,
            currency: "USD",
            balance: 0,
            pending_balance: 0,
            available_balance: 0,
          },
          { onConflict: "user_id", ignoreDuplicates: true }
        );
    } catch (walletError) {
      console.warn("Wallet creation failed:", walletError);
    }

    return { success: true };
  } catch (error) {
    console.error("Profile save failed:", error);
    throw error;
  }
};

export const createProviderProfile = async (
  userId: string,
  role: "coach" | "therapist",
  profileData: {
    headline?: string;
    skills?: string[];
    languages?: string[];
    is_active?: boolean;
  }
) => {
  try {
    const tableName = role === "therapist" ? "therapist_profiles" : "coach_profiles";
    
    const { error } = await supabase
      .from(tableName)
      .upsert(
        {
          user_id: userId,
          headline: profileData.headline || null,
          skills: profileData.skills || [],
          languages: profileData.languages || [],
          is_active: profileData.is_active ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error(`${role} profile save error:`, error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error(`${role} profile save failed:`, error);
    throw error;
  }
};