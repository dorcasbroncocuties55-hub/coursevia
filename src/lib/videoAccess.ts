import { supabase } from "@/integrations/supabase/client";

export const sanitizeFileName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

export const uploadPrivateVideoFile = async (userId: string, file: File) => {
  const filePath = `content/${userId}/videos/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { data, error } = await supabase.storage.from("videos").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "video/mp4",
  });

  if (error) throw error;
  return data.path;
};

export const getPlayableVideoUrl = async (storagePath: string) => {
  const { data, error } = await supabase.storage
    .from("videos")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
};

export const isOwnerOrHasVideoAccess = async (
  userId: string | null | undefined,
  contentId: string,
  ownerId?: string | null,
) => {
  if (!userId) return false;
  if (ownerId && ownerId === userId) return true;

  const [{ data: access }, { data: completedPayment }, { data: approvedPurchase }] =
    await Promise.all([
      supabase
        .from("content_access")
        .select("id")
        .eq("user_id", userId)
        .eq("content_id", contentId)
        .eq("content_type", "video")
        .maybeSingle(),
      supabase
        .from("payments")
        .select("id")
        .eq("payer_id", userId)
        .eq("reference_id", contentId)
        .eq("payment_type", "video")
        .eq("status", "completed")
        .maybeSingle(),
      supabase
        .from("video_purchases")
        .select("id")
        .eq("user_id", userId)
        .eq("video_id", contentId)
        .eq("status", "approved")
        .maybeSingle(),
    ]);

  return Boolean(access || completedPayment || approvedPurchase);
};

export const hasPendingVideoPayment = async (
  userId: string | null | undefined,
  contentId: string,
) => {
  if (!userId) return false;
  const [{ data: pendingPayment }, { data: pendingPurchase }] = await Promise.all([
    supabase
      .from("payments")
      .select("id")
      .eq("payer_id", userId)
      .eq("reference_id", contentId)
      .eq("payment_type", "video")
      .eq("status", "pending")
      .maybeSingle(),
    supabase
      .from("video_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("video_id", contentId)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  return Boolean(pendingPayment || pendingPurchase);
};

export type VideoAccessPayload = {
  has_access?: boolean;
  preview_only?: boolean;
  preview_seconds?: number;
  video_url?: string;
  title?: string;
  message?: string;
};

export const getRpcVideoAccess = async (
  videoId: string,
  preview: boolean,
  mode: "content" | "video" = "content",
): Promise<VideoAccessPayload | null> => {
  const fn = mode === "content" ? "get_content_video_access" : "get_video_access";
  const args = mode === "content"
    ? { p_content_id: videoId, p_preview: preview }
    : { p_video_id: videoId, p_preview: preview };

  const { data, error } = await supabase.rpc(fn as any, args as any);
  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (
      message.includes("function") ||
      message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("content_items") ||
      message.includes("videos table")
    ) {
      return null;
    }
    throw error;
  }

  return (data as VideoAccessPayload) || null;
};
