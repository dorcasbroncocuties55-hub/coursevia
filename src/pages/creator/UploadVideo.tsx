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
  Upload, Film, Plus, Trash2, ImageIcon, DollarSign,
  CheckCircle2, Loader2, ChevronDown, ChevronUp, X, Play,
} from "lucide-react";

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
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ${
        dragging ? "border-primary bg-primary/5 scale-[1.01]" : file ? "border-emerald-400 bg-emerald-50/50" : "border-border hover:border-primary/50 hover:bg-accent/50"
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        {file ? (
          <>
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Click to replace</p>
          </>
        ) : (
          <>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload size={22} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Drag & drop or click to browse</p>
            </div>
            <p className="text-xs text-muted-foreground/60">MP4, MOV, AVI, MKV supported</p>
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
      className="relative cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/50 transition-all overflow-hidden aspect-video"
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {preview ? (
        <>
          <img src={preview} alt="Thumbnail" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium">Change thumbnail</p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 h-full text-center p-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ImageIcon size={20} className="text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Add thumbnail</p>
          <p className="text-xs text-muted-foreground">Recommended: 1280×720</p>
        </div>
      )}
    </div>
  );
};

const UploadProgress = ({ progress, label }: { progress: number; label: string }) => (
  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
    <div className="flex items-center gap-3 mb-3">
      <Loader2 size={18} className="text-primary animate-spin" />
      <p className="text-sm font-medium text-foreground">{label}</p>
      <span className="ml-auto text-sm font-bold text-primary">{progress}%</span>
    </div>
    <div className="h-2 rounded-full bg-primary/20 overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

const UploadVideo = () => {
  const { user, roles } = useAuth();
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

  return (
    <DashboardLayout role={ownerRole as any}>
      <LongContentHandler 
        content={
          <div className="max-w-3xl space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Film size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Publish Video Content</h1>
                <p className="text-sm text-muted-foreground">Upload a single video or a full episode series for your audience.</p>
              </div>
            </div>

        {loading && uploadProgress > 0 && (
          <UploadProgress progress={uploadProgress} label={uploadLabel} />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content type selector */}
          <div className="grid grid-cols-2 gap-3">
            {(["single_video", "episode_series"] as UnifiedContentType[]).map((type) => {
              const meta = contentTypeMeta[type];
              const active = contentType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContentType(type)}
                  className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                    active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-accent/50"
                  }`}
                >
                  <div className={`mb-2 h-9 w-9 rounded-xl flex items-center justify-center ${active ? "bg-primary/15" : "bg-muted"}`}>
                    {type === "single_video" ? <Play size={18} className={active ? "text-primary" : "text-muted-foreground"} /> : <Film size={18} className={active ? "text-primary" : "text-muted-foreground"} />}
                  </div>
                  <p className={`font-semibold text-sm ${active ? "text-primary" : "text-foreground"}`}>
                    {type === "single_video" ? "Single Video" : "Episode Series"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.pricingHint}</p>
                  {active && <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center"><CheckCircle2 size={12} className="text-white" /></div>}
                </button>
              );
            })}
          </div>

          {/* Core details */}
          <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
            <h2 className="font-semibold text-foreground">Content details</h2>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Title <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your content a compelling title" className="rounded-xl h-11" required />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe what viewers will learn or experience…" className="rounded-xl resize-none" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">
                <span className="flex items-center gap-1.5"><DollarSign size={14} /> Price (USD) <span className="text-red-500">*</span></span>
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input
                  type="number" min={String(MIN_PROVIDER_PRICE)} step="0.01"
                  value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="6.00" className="rounded-xl h-11 pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Minimum ${MIN_PROVIDER_PRICE}. Viewers get a 5-second free preview before purchase.</p>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-foreground">Thumbnail</h2>
              <p className="text-xs text-muted-foreground mt-0.5">A great thumbnail increases clicks. Recommended 1280×720.</p>
            </div>
            <div className="max-w-xs">
              <ThumbnailDropZone file={thumbnailFile} onFile={setThumbnailFile} />
            </div>
          </div>

          {/* Video upload */}
          {contentType === "single_video" ? (
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-foreground">Video file <span className="text-red-500">*</span></h2>
              <VideoDropZone file={singleVideoFile} onFile={setSingleVideoFile} label="Drop your video here" />
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">Episodes</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {validEpisodeCount} of {episodes.length} episodes ready
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addEpisode} className="gap-1.5 rounded-xl">
                  <Plus size={14} /> Add episode
                </Button>
              </div>

              <div className="space-y-3">
                {episodes.map((episode, index) => {
                  const isOpen = expandedEpisode === index;
                  const isReady = episode.title.trim() && episode.file;
                  return (
                    <div key={index} className={`rounded-2xl border transition-colors ${isReady ? "border-emerald-200 bg-emerald-50/30" : "border-border bg-background"}`}>
                      <button
                        type="button"
                        onClick={() => setExpandedEpisode(isOpen ? null : index)}
                        className="flex items-center gap-3 w-full p-4 text-left"
                      >
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isReady ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {isReady ? <CheckCircle2 size={16} /> : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {episode.title || `Episode ${index + 1}`}
                          </p>
                          {episode.file && <p className="text-xs text-muted-foreground">{episode.file.name}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {episodes.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeEpisode(index); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                          {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                          <Input
                            placeholder="Episode title"
                            value={episode.title}
                            onChange={(e) => updateEpisode(index, { title: e.target.value })}
                            className="rounded-xl h-10"
                          />
                          <Textarea
                            placeholder="Episode description (optional)"
                            value={episode.description}
                            onChange={(e) => updateEpisode(index, { description: e.target.value })}
                            rows={2}
                            className="rounded-xl resize-none text-sm"
                          />
                          <VideoDropZone
                            file={episode.file}
                            onFile={(f) => updateEpisode(index, { file: f })}
                            label={`Upload episode ${index + 1}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={loading} size="lg" className="w-full rounded-2xl h-13 gap-2 text-base">
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Publishing…</>
            ) : (
              <><Upload size={18} /> Publish {contentType === "single_video" ? "Video" : "Series"}</>
            )}
          </Button>
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
