import { supabase } from "@/integrations/supabase/client";

export type UnifiedContentType = "single_video" | "episode_series" | "course";

export const contentTypeMeta: Record<UnifiedContentType, {
  label: string;
  pricingHint: string;
  benefitHint: string;
}> = {
  single_video: {
    label: "Single Video",
    pricingHint: "Best for one clear lesson, solution, or quick outcome.",
    benefitHint: "Learners buy this when the value is immediate and focused.",
  },
  episode_series: {
    label: "Episode Series",
    pricingHint: "Best when value grows across multiple episodes.",
    benefitHint: "Price should reflect continuity, depth, and number of episodes.",
  },
  course: {
    label: "Course",
    pricingHint: "Best for full transformation, structured learning, and support.",
    benefitHint: "Higher value because learners get organized lessons and help when stuck.",
  },
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const uploadVideoFile = async (userId: string, file: File) => {
  const filePath = `videos/${userId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from("videos").upload(filePath, file);
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from("videos").getPublicUrl(data.path);
  return publicUrl.publicUrl;
};

export const uploadThumbnailFile = async (userId: string, file: File) => {
  const filePath = `thumbnails/${userId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from("thumbnails").upload(filePath, file);
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from("thumbnails").getPublicUrl(data.path);
  return publicUrl.publicUrl;
};
