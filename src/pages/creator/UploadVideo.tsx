import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  contentTypeMeta, slugify, uploadThumbnailFile, UnifiedContentType,
} from "@/lib/unifiedContent";
import { uploadPrivateVideoFile } from "@/lib/videoAccess";
import { MIN_PROVIDER_PRICE, isValidProviderPrice } from "@/lib/pricingRules";
import { LongContentHandler } from "@/components/ui/long-content-handler";
import {
  Upload, Film, Plus, ImageIcon, DollarSign,
  CheckCircle2, Loader2, ChevronDown, ChevronUp, X, Play,
  Sparkles, Info, FileVideo, Clock, Eye, AlertCircle,
} from "lucide-react";
import { PageLoading } from "@/components/LoadingSpinner";

type EpisodeDraft = { title: string; description: string; file: File | null };
const emptyEpisode = (): EpisodeDraft => ({ title: "", description: "", file: null });

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const VideoDropZone = ({
  file, onFile, label, accept = "video/*",
}: { file: File | null; onFile: (f: File) => void; label: string; accept?: string }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 group ${dragging
          ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 scale-[1.02] shadow-lg"
          : file
            ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-50/30 shadow-sm"
            : "border-gray-300 hover:border-primary hover:shadow-md hover:bg-gradient-to-br hover:from-gray-50 hover:to-white"
        }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        {file ? (
          <>
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                <FileVideo size={14} className="text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{file.name}</p>
              <p className="text-sm text-emerald-600 font-medium">{formatBytes(file.size)}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              Replace File
            </Button>
          </>
        ) : (
          <>
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                <Upload size={28} className="text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                <Plus size={16} className="text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground text-base">{label}</p>
              <p className="text-sm text-muted-foreground">Drag & drop or click to browse</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
              <FileVideo size={14} />
              <span>MP4, MOV, AVI, MKV • Max 2GB</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ThumbnailDropZone = ({ file, onFile }: { file: File | null; onFile: (f: File) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (f: File) => {
    onFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="relative cursor-pointer rounded-xl border-2 border-dashed border-gray-300 hover:border-primary hover:shadow-md transition-all overflow-hidden aspect-video group"
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {preview ? (
        <>
          <img src={preview} alt="Thumbnail" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium flex items-center gap-2">
              <ImageIcon size={16} />
              Change Thumbnail
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 h-full text-center p-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
            <ImageIcon size={24} className="text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Add Thumbnail</p>
            <p className="text-xs text-muted-foreground">Recommended: 1280×720 • 16:9 ratio</p>
          </div>
        </div>
      )}
    </div>
  );
};

const UploadProgress = ({ progress, label }: { progress: number; label: string }) => (
  <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-6 shadow-lg">
    <div className="flex items-center gap-4 mb-4">
      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
        <Loader2 size={20} className="text-primary animate-spin" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">Please don't close this page</p>
      </div>
      <span className="text-xl font-bold text-primary">{progress}%</span>
    </div>
    <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out relative overflow-hidden"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      </div>
    </div>
  </div>
);

const UploadVideo = () => {
  const { user, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const ownerRole = useMemo(() => {
    if (roles.includes("coach")) return "coach";
    if (roles.includes("therapist")) return "therapist";
    return "creator";
  }, [roles]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<UnifiedContentType>("single_video");
  const [price, setPrice] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [singleVideoFile, setSingleVideoFile] = useState<File | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeDraft[]>([emptyEpisode(), emptyEpisode()]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState("");
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(0);

  const updateEpisode = (index: number, next: Partial<EpisodeDraft>) =>
    setEpisodes((prev) => prev.map((item, i) => (i === index ? { ...item, ...next } : item)));

  const addEpisode = () => {
    setEpisodes((prev) => [...prev, emptyEpisode()]);
    setExpandedEpisode(episodes.length);
  };

  const removeEpisode = (index: number) => {
    setEpisodes((prev) => prev.filter((_, i) => i !== index));
    setExpandedEpisode(null);
  };

  const createFallbackVideo = async (storagePath: string, thumbnailUrl: string | null, numericPrice: number) => {
    const { error } = await supabase.from("videos").insert({
      user_id: user!.id, creator_id: user!.id, title: title.trim(),
      description: description.trim() || null, storage_path: storagePath,
      thumbnail_url: thumbnailUrl, role: ownerRole, price: numericPrice,
      is_paid: true, status: "published", slug: `${slugify(title)}-${Date.now()}`, preview_seconds: 5,
    } as any);
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) { toast.error("Title is required."); return; }

    const numericPrice = Number(price || 0);
    if (!Number.isFinite(numericPrice) || !isValidProviderPrice(numericPrice)) {
      toast.error(`Videos must be at least $${MIN_PROVIDER_PRICE}.`); return;
    }
    if (contentType === "single_video" && !singleVideoFile) {
      toast.error("Please upload the video file."); return;
    }
    if (contentType === "episode_series") {
      const valid = episodes.filter((ep) => ep.title.trim() && ep.file);
      if (valid.length === 0) { toast.error("Add at least one episode."); return; }
      if (episodes.find((ep) => ep.title.trim() && !ep.file)) {
        toast.error("Every episode needs a video file."); return;
      }
    }

    try {
      setLoading(true);
      const slug = `${slugify(title)}-${Date.now()}`;
      let thumbnailUrl: string | null = null;

      if (thumbnailFile) {
        setUploadLabel("Uploading thumbnail…");
        setUploadProgress(10);
        thumbnailUrl = await uploadThumbnailFile(user.id, thumbnailFile);
        setUploadProgress(20);
      }

      if (contentType === "single_video") {
        setUploadLabel("Uploading video…");
        setUploadProgress(30);
        const storagePath = await uploadPrivateVideoFile(user.id, singleVideoFile as File);
        setUploadProgress(70);
        setUploadLabel("Publishing content…");

        const { data: contentItem, error: itemError } = await supabase
          .from("content_items" as any)
          .insert({
            owner_id: user.id, owner_role: ownerRole, title: title.trim(), slug,
            description: description.trim() || null, content_type: contentType,
            thumbnail_url: thumbnailUrl, price: numericPrice, preview_seconds: 5,
            video_storage_path: storagePath, is_published: true,
          } as any)
          .select("id").single();

        if (itemError) {
          await createFallbackVideo(storagePath, thumbnailUrl, numericPrice);
        } else {
          const { error: episodeError } = await supabase.from("content_episodes" as any).insert({
            content_id: contentItem.id, title: title.trim(),
            description: description.trim() || null, video_url: null,
            video_storage_path: storagePath, episode_number: 1, is_preview: true,
          } as any);
          if (episodeError) {
            const msg = String(episodeError.message || "").toLowerCase();
            if (msg.includes("does not exist") || msg.includes("content_episodes")) {
              await supabase.from("content_items" as any).update({ video_storage_path: storagePath } as any).eq("id", contentItem.id);
            } else throw episodeError;
          }
        }
        setUploadProgress(100);
      } else {
        const { data: contentItem, error: itemError } = await supabase
          .from("content_items" as any)
          .insert({
            owner_id: user.id, owner_role: ownerRole, title: title.trim(), slug,
            description: description.trim() || null, content_type: contentType,
            thumbnail_url: thumbnailUrl, price: numericPrice, preview_seconds: 5, is_published: true,
          } as any)
          .select("id").single();
        if (itemError) throw itemError;

        const validEpisodes = episodes.filter((ep) => ep.title.trim() && ep.file);
        for (let i = 0; i < validEpisodes.length; i++) {
          const episode = validEpisodes[i];
          setUploadLabel(`Uploading episode ${i + 1} of ${validEpisodes.length}…`);
          setUploadProgress(Math.round(20 + ((i / validEpisodes.length) * 70)));
          const storagePath = await uploadPrivateVideoFile(user.id, episode.file as File);
          const { error: episodeError } = await supabase.from("content_episodes" as any).insert({
            content_id: contentItem.id, title: episode.title.trim(),
            description: episode.description.trim() || null, video_url: null,
            video_storage_path: storagePath, episode_number: i + 1, is_preview: i === 0,
          } as any);
          if (episodeError) throw episodeError;
        }
        setUploadProgress(100);
      }

      toast.success(contentType === "single_video" ? "Video published!" : "Series published!");
      navigate(`/${ownerRole}/content`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to publish content.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setUploadLabel("");
    }
  };

  const validEpisodeCount = episodes.filter((ep) => ep.title.trim() && ep.file).length;

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout role={ownerRole as any}>
      <LongContentHandler
        content={
          <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Enhanced Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 shadow-sm">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
              <div className="flex items-start gap-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shrink-0">
                  <Film size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground mb-2">Upload Your Content</h1>
                  <p className="text-muted-foreground mb-4">
                    Share your expertise with the world. Upload a single video or create an episode series to reach your audience.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/50 rounded-full px-3 py-1.5">
                      <Eye size={14} />
                      <span>5-second free preview</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/50 rounded-full px-3 py-1.5">
                      <Clock size={14} />
                      <span>Instant publishing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/50 rounded-full px-3 py-1.5">
                      <Sparkles size={14} />
                      <span>Professional marketplace</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loading && uploadProgress > 0 && (
              <UploadProgress progress={uploadProgress} label={uploadLabel} />
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Content type selector with better design */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-4">Choose Content Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(["single_video", "episode_series"] as UnifiedContentType[]).map((type) => {
                    const meta = contentTypeMeta[type];
                    const active = contentType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setContentType(type)}
                        className={`relative rounded-xl border-2 p-5 text-left transition-all group ${active
                            ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md scale-[1.02]"
                            : "border-gray-200 hover:border-primary/40 hover:shadow-md hover:scale-[1.01]"
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${active ? "bg-primary shadow-lg" : "bg-gray-100 group-hover:bg-primary/10"
                            }`}>
                            {type === "single_video" ? (
                              <Play size={24} className={active ? "text-white" : "text-gray-600 group-hover:text-primary"} />
                            ) : (
                              <Film size={24} className={active ? "text-white" : "text-gray-600 group-hover:text-primary"} />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold mb-1 ${active ? "text-primary" : "text-foreground"}`}>
                              {type === "single_video" ? "Single Video" : "Episode Series"}
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {type === "single_video"
                                ? "Perfect for tutorials, workshops, or standalone content"
                                : "Create a multi-episode series with organized content"
                              }
                            </p>
                          </div>
                          {active && (
                            <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                              <CheckCircle2 size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core details with better organization */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Info size={18} className="text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Content Details</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label className="mb-2 flex items-center gap-1 text-sm font-semibold">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Complete Python Programming Masterclass"
                      className="rounded-xl h-12 text-base border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Make it clear, compelling, and searchable</p>
                  </div>

                  <div>
                    <Label className="mb-2 block text-sm font-semibold">Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      placeholder="Describe what viewers will learn, what makes your content unique, and who it's for..."
                      className="rounded-xl resize-none text-base border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Help learners understand the value of your content</p>
                  </div>

                  <div>
                    <Label className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <DollarSign size={16} className="text-primary" />
                      Price (USD) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-lg">$</span>
                      <Input
                        type="number"
                        min={String(MIN_PROVIDER_PRICE)}
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="6.00"
                        className="rounded-xl h-12 pl-9 text-base border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-900">
                        Minimum ${MIN_PROVIDER_PRICE}. Buyers get a 5-second free preview before purchasing. Price competitively based on content length and value.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thumbnail section with better visual */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">Thumbnail Image</h2>
                  <p className="text-sm text-muted-foreground">
                    An eye-catching thumbnail increases click-through rates by up to 80%
                  </p>
                </div>
                <div className="max-w-md">
                  <ThumbnailDropZone file={thumbnailFile} onFile={setThumbnailFile} />
                </div>
              </div>

              {/* Video upload section */}
              {contentType === "single_video" ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      Video File <span className="text-red-500">*</span>
                    </h2>
                  </div>
                  <VideoDropZone file={singleVideoFile} onFile={setSingleVideoFile} label="Upload Your Video" />
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-900">
                      Ensure your video is high quality (720p or better) and under 2GB. Supported formats: MP4, MOV, AVI, MKV.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Episodes</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {validEpisodeCount} of {episodes.length} episodes ready to publish
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEpisode}
                      className="gap-2 rounded-xl font-medium"
                    >
                      <Plus size={16} /> Add Episode
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {episodes.map((episode, index) => {
                      const isOpen = expandedEpisode === index;
                      const isReady = episode.title.trim() && episode.file;
                      return (
                        <div
                          key={index}
                          className={`rounded-xl border-2 transition-all ${isReady
                              ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-50/30"
                              : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedEpisode(isOpen ? null : index)}
                            className="flex items-center gap-4 w-full p-4 text-left"
                          >
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${isReady
                                ? "bg-emerald-500 text-white shadow-md"
                                : "bg-gray-100 text-gray-600"
                              }`}>
                              {isReady ? <CheckCircle2 size={20} /> : index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {episode.title || `Episode ${index + 1} - Not configured`}
                              </p>
                              {episode.file && (
                                <p className="text-xs text-muted-foreground truncate">{episode.file.name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {episodes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeEpisode(index); }}
                                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              )}
                              {isOpen ? (
                                <ChevronUp size={18} className="text-gray-400" />
                              ) : (
                                <ChevronDown size={18} className="text-gray-400" />
                              )}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4">
                              <Input
                                placeholder={`Episode ${index + 1} title`}
                                value={episode.title}
                                onChange={(e) => updateEpisode(index, { title: e.target.value })}
                                className="rounded-xl h-11 border-gray-300"
                              />
                              <Textarea
                                placeholder="Episode description (optional)"
                                value={episode.description}
                                onChange={(e) => updateEpisode(index, { description: e.target.value })}
                                rows={3}
                                className="rounded-xl resize-none text-sm border-gray-300"
                              />
                              <VideoDropZone
                                file={episode.file}
                                onFile={(f) => updateEpisode(index, { file: f })}
                                label={`Upload Episode ${index + 1}`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Enhanced Submit Button */}
              <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-2">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full rounded-xl h-14 gap-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Publishing Your Content...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Publish {contentType === "single_video" ? "Video" : "Series"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        }
        type="component"
        maxHeight="h-full"
        scrollable={true}
      />
    </DashboardLayout>
  );
};

export default UploadVideo;
