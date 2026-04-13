import { supabase } from "@/integrations/supabase/client";

type CategoryRole = "coach" | "creator" | "therapist";

export const getCategories = async (roleType?: CategoryRole) => {
  let query = supabase.from("categories").select("*");

  if (roleType) {
    query = query.eq("role_type", roleType);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
};
