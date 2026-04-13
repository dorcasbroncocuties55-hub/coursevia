import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Lock, Play, ShoppingCart } from "lucide-react";
import { addCartItem } from "@/lib/cart";
import { toast } from "sonner";
import {
  getPlayableVideoUrl,
  getRpcVideoAccess,
  hasPendingVideoPayment,
  isOwnerOrHasVideoAccess,
} from "@/lib/videoAccess";

type EpisodeRow = {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  video_storage_path?: string | null;
  episode_number?: number | null;
  is_preview?: boolean | null;
};

const VideoDetails = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [video, setVideo] = useState<any>(null);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [creator, setCreator] = useState<any>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [useRpcMode, setUseRpcMode] = useState<"content" | "video" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchUnified = async () => {
      if (!slug) return false;
      const { data, error } = await supabase
        .from("content_items" as any)
        .select("*")
        .eq("slug", slug)
        .in("content_type", ["single_video", "episode_series"])
        .eq("is_published", true)
        .maybeSingle();

      if (error || !data) return false;

      setVideo(data);
      setUseRpcMode("content");

      const [{ data: creatorData }, { data: episodeRows, error: episodesError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, profile_slug")
          .eq("user_id", data.owner_id)
          .maybeSingle(),
        supabase
          .from("content_episodes" as any)
          .select("id, title, description, video_url, video_storage_path, episode_number, is_preview")
          .eq("content_id", data.id)
          .order("episode_number", { ascending: true }),
      ]);

      setCreator(creatorData || null);

      if (!episodesError && episodeRows && episodeRows.length > 0) {
        setEpisodes(episodeRows as EpisodeRow[]);
      } else {
        setEpisodes([
          {
            id: data.id,
            title: data.title,
            description: data.description,
            video_url: data.video_url,
            video_storage_path: data.video_storage_path || null,
            episode_number: 1,
            is_preview: true,
          },
        ]);
      }

      const access = await isOwnerOrHasVideoAccess(user?.id, data.id, data.owner_id);
      setHasAccess(access);
      setPaymentPending(await hasPendingVideoPayment(user?.id, data.id));
      return true;
    };

    const fetchFallback = async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error || !data) return;

      setVideo(data);
      setUseRpcMode("video");
      const { data: creatorData } = await supabase
        .from("profiles")
        .select("full_name, profile_slug")
        .eq("user_id", data.creator_id || data.user_id)
        .maybeSingle();
      setCreator(creatorData || null);
      setEpisodes([
        {
          id: data.id,
          title: data.title,
          description: data.description,
          video_url: data.video_url,
          video_storage_path: data.storage_path || null,
          episode_number: 1,
          is_preview: true,
        },
      ]);

      const ownerId = data.creator_id || data.user_id;
      const access = await isOwnerOrHasVideoAccess(user?.id, data.id, ownerId);
      setHasAccess(access);
      setPaymentPending(await hasPendingVideoPayment(user?.id, data.id));
    };

    (async () => {
      const ok = await fetchUnified();
      if (!ok) await fetchFallback();
    })();
  }, [slug, user?.id]);

  const currentEpisode = useMemo(
    () => episodes[currentEpisodeIndex] || null,
    [episodes, currentEpisodeIndex],
  );
  const previewSeconds = Number(video?.preview_seconds || 5);
  const isSeries = video?.content_type === "episode_series";

  const handleAddToCart = () => {
    if (!video) return;
    setAddingToCart(true);
    
    addCartItem({
      id: video.id,
      title: video.title,
      slug: video.slug,
      type: "video",
      price: Number(video.price || 0),
      creatorId: video.owner_id || video.creator_id || video.user_id,
      image: video.thumbnail_url || video.image_url || null,
    });

    toast.success("Added to cart!", {
      description: "Go to cart to checkout",
      action: {
        label: "View Cart",
        onClick: () => window.location.href = "/cart",
      },
    });
    
    setAddingToCart(false);
  };

  useEffect(() => {
    const loadPlayableUrl = async () => {
      if (!video || !currentEpisode) return;
      try {
        setIsLocked(false);
        if (user && useRpcMode) {
          const rpc = await getRpcVideoAccess(video.id, !hasAccess, useRpcMode);
          if (rpc?.video_url) {
            setPlaybackUrl(rpc.video_url);
            return;
          }
        }

        if (currentEpisode.video_storage_path) {
          const url = await getPlayableVideoUrl(currentEpisode.video_storage_path);
          setPlaybackUrl(url);
          return;
        }

        setPlaybackUrl(currentEpisode.video_url || "");
      } catch {
        setPlaybackUrl(currentEpisode.video_url || "");
      }
    };

    loadPlayableUrl();
  }, [video, currentEpisode, hasAccess, user, useRpcMode]);

  if (!video || !currentEpisode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container-wide section-spacing">
        <div className="grid lg:grid-cols-[1.4fr_0.8fr] gap-8">
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden border border-border bg-card">
              <div className="aspect-video relative bg-black">
                <video
                  key={`${currentEpisode.id}-${playbackUrl}`}
                  ref={videoRef}
                  src={playbackUrl}
                  controls
                  controlsList={!hasAccess ? "nodownload" : undefined}
                  className="w-full h-full"
                  onTimeUpdate={(e) => {
                    if (!hasAccess && e.currentTarget.currentTime > previewSeconds) {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = previewSeconds;
                      setIsLocked(true);
                    }
                  }}
                />
                {!hasAccess && (
                  <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                    Preview: {previewSeconds}s
                  </div>
                )}
                {isLocked && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white p-6">
                    <div className="text-center max-w-sm">
                      <Lock className="mx-auto mb-3" />
                      <h2 className="text-xl font-semibold mb-2">Preview ended</h2>
                      <p className="text-sm text-white/80 mb-4">
                        This platform does not allow free full videos. Watch the full content after payment approval. Only the first {previewSeconds} seconds are previewable.
                      </p>
                      <Button onClick={handleAddToCart}>
                        <ShoppingCart size={16} className="mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-primary">
                {isSeries ? "Episode Series" : "Single Video"}
              </p>
              <h1 className="text-3xl font-bold text-foreground">{video.title}</h1>
              <p className="text-muted-foreground">{video.description}</p>
              {creator?.profile_slug && (
                <a href={`/profile/${creator.profile_slug}`} className="text-primary hover:underline text-sm">
                  View {creator.full_name || "creator"} profile
                </a>
              )}
            </div>

            {isSeries && episodes.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Episodes</h2>
                  <p className="text-sm text-muted-foreground">
                    Buy once to unlock the full series after payment approval.
                  </p>
                </div>
                <div className="space-y-3">
                  {episodes.map((episode, index) => (
                    <button
                      key={episode.id}
                      onClick={() => setCurrentEpisodeIndex(index)}
                      className={`w-full text-left border rounded-xl p-4 transition ${
                        currentEpisodeIndex === index
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Play size={16} className="text-primary shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">
                            Episode {episode.episode_number}: {episode.title}
                          </p>
                          {episode.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {episode.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="bg-card border border-border rounded-2xl p-6 h-fit sticky top-24">
            <div className="space-y-4">
              <p className="text-3xl font-bold text-foreground">
                ${Number(video.price || 0).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasAccess
                  ? "You have access to the full content."
                  : paymentPending
                    ? "Your payment is pending admin verification. Full access will unlock after approval."
                    : `Only the first ${previewSeconds} seconds are available as a preview before purchase.`}
              </p>
              {!hasAccess ? (
                <Button
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={paymentPending || addingToCart}
                >
                  {paymentPending ? (
                    "Payment Pending"
                  ) : addingToCart ? (
                    "Adding..."
                  ) : (
                    <>
                      <ShoppingCart size={16} className="mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>
              ) : (
                <Button className="w-full" variant="outline">
                  Purchased
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VideoDetails;
