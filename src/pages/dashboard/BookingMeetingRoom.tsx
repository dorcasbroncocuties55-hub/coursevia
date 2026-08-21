/**
 * BookingMeetingRoom
 * Route: /session/:bookingId
 * Opens the Jitsi video session for a confirmed booking.
 * Works for both learner and provider (therapist/coach).
 */
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Video, VideoOff, Mic, MicOff, PhoneOff, ExternalLink, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// ── Jitsi types (loaded from CDN) ─────────────────────────────────────────────
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface BookingDetail {
  id: string;
  scheduled_at: string;
  status: string | null;
  meeting_url: string | null;
  duration_minutes: number;
  coach_id: string;
  learner_id: string;
  notes: string | null;
  provider_name?: string;
  learner_name?: string;
  service_title?: string;
}

export default function BookingMeetingRoom() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [booking, setBooking]     = useState<BookingDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [jitsiReady, setJitsiReady] = useState(false);
  const [ended, setEnded]         = useState(false);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef       = useRef<any>(null);
  const jitsiLoadedRef    = useRef(false);

  // ── Load booking ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId || !user?.id) return;

    (async () => {
      setLoading(true);
      try {
        const { data: b, error: bErr } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();

        if (bErr || !b) { setError("Booking not found."); setLoading(false); return; }

        // Check user is participant
        const isParticipant = b.learner_id === user.id || b.coach_id === user.id;
        if (!isParticipant) { setError("You are not a participant in this session."); setLoading(false); return; }

        // Check status
        if (b.status === "cancelled") { setError("This session has been cancelled."); setLoading(false); return; }

        // Generate meeting URL if missing
        let meetingUrl = b.meeting_url;
        if (!meetingUrl) {
          meetingUrl = `https://meet.jit.si/coursevia-${b.id}`;
          await supabase.from("bookings")
            .update({ meeting_url: meetingUrl, status: b.status === "pending" ? "confirmed" : b.status } as any)
            .eq("id", b.id);
        }

        // Fetch names
        const [{ data: provider }, { data: learner }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("user_id", b.coach_id).maybeSingle(),
          supabase.from("profiles").select("full_name").eq("user_id", b.learner_id).maybeSingle(),
        ]);

        // Fetch service title
        let serviceTitle = "Session";
        if (b.service_id) {
          const { data: svc } = await supabase.from("coach_services").select("title").eq("id", b.service_id).maybeSingle();
          if (svc?.title) serviceTitle = svc.title;
        }

        setBooking({
          ...b,
          meeting_url: meetingUrl,
          provider_name: (provider as any)?.full_name || "Provider",
          learner_name:  (learner  as any)?.full_name || "Learner",
          service_title: serviceTitle,
        });
      } catch (e: any) {
        setError(e.message || "Could not load session");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId, user?.id]);

  // ── Load Jitsi SDK ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!booking?.meeting_url || jitsiLoadedRef.current) return;

    const loadJitsi = () => {
      if (window.JitsiMeetExternalAPI) { initJitsi(); return; }
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload  = initJitsi;
      script.onerror = () => setError("Failed to load video SDK. Please check your connection.");
      document.head.appendChild(script);
    };

    const initJitsi = () => {
      if (!jitsiContainerRef.current || !booking.meeting_url) return;
      jitsiLoadedRef.current = true;

      // Extract room name from URL
      const roomName = booking.meeting_url.replace("https://meet.jit.si/", "");

      try {
        jitsiApiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName,
          parentNode: jitsiContainerRef.current,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName: profile?.full_name || user?.email || "Participant",
            email: profile?.email || user?.email || "",
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            toolbarButtons: [
              "microphone", "camera", "closedcaptions", "desktop",
              "fullscreen", "fodeviceselection", "hangup", "chat",
              "recording", "sharedvideo", "settings", "raisehand",
              "videoquality", "filmstrip", "tileview", "download", "help",
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_ALWAYS_VISIBLE: false,
            DEFAULT_BACKGROUND: "#0F3D2E",
            BRAND_WATERMARK_LINK: "",
            APP_NAME: "Coursevia Session",
          },
        });

        jitsiApiRef.current.addEventListener("videoConferenceLeft", handleLeft);
        jitsiApiRef.current.addEventListener("readyToClose", handleLeft);

        setJitsiReady(true);
      } catch (e: any) {
        setError(e.message || "Could not start video session");
      }
    };

    loadJitsi();

    return () => {
      jitsiApiRef.current?.dispose();
    };
  }, [booking?.meeting_url]);

  // ── End session handler ─────────────────────────────────────────────────────
  const handleLeft = async () => {
    jitsiApiRef.current?.dispose();
    setEnded(true);

    // Mark as completed if provider
    if (booking && user?.id === booking.coach_id) {
      await supabase.from("bookings")
        .update({ status: "completed" } as any)
        .eq("id", booking.id);
      toast.success("Session marked as completed");
    }
  };

  const handleHangup = () => {
    jitsiApiRef.current?.executeCommand("hangup");
  };

  const handleOpenExternal = () => {
    if (booking?.meeting_url) window.open(booking.meeting_url, "_blank");
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 bg-[#0F3D2E] flex items-center justify-center">
      <div className="text-center text-white">
        <Loader2 size={36} className="animate-spin mx-auto mb-4 text-[#2D9E6B]" />
        <p className="font-semibold">Joining session…</p>
        <p className="text-sm text-white/60 mt-1">Setting up your video room</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="fixed inset-0 bg-[#0F3D2E] flex items-center justify-center p-6">
      <div className="text-center text-white max-w-sm">
        <AlertTriangle size={40} className="mx-auto mb-4 text-amber-400" />
        <h2 className="text-xl font-bold mb-2">Cannot join session</h2>
        <p className="text-white/70 mb-6">{error}</p>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 mx-auto bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-lg font-medium transition">
          <ArrowLeft size={16} /> Go back
        </button>
      </div>
    </div>
  );

  if (ended) return (
    <div className="fixed inset-0 bg-[#0F3D2E] flex items-center justify-center p-6">
      <div className="text-center text-white max-w-sm">
        <div className="w-16 h-16 rounded-full bg-[#2D9E6B]/20 flex items-center justify-center mx-auto mb-4">
          <Video size={28} color="#2D9E6B" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Session ended</h2>
        <p className="text-white/70 mb-2">
          {booking?.service_title} with {user?.id === booking?.coach_id ? booking?.learner_name : booking?.provider_name}
        </p>
        <p className="text-white/50 text-sm mb-8">
          {booking?.scheduled_at ? new Date(booking.scheduled_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : ""}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-lg font-medium transition">
            <ArrowLeft size={15} /> Back
          </button>
          <button onClick={() => navigate(`/${booking?.coach_id === user?.id ? "therapist" : "dashboard"}/sessions`)}
            className="flex items-center gap-2 bg-[#2D9E6B] hover:bg-[#259060] px-5 py-2.5 rounded-lg font-medium transition">
            View Sessions
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0F3D2E] shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white transition">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-white font-semibold text-sm leading-none">{booking?.service_title}</p>
            <p className="text-white/60 text-xs mt-0.5">
              with {user?.id === booking?.coach_id ? booking?.learner_name : booking?.provider_name}
              {booking?.scheduled_at && ` · ${new Date(booking.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[#2D9E6B] bg-[#2D9E6B]/15 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B] animate-pulse" />
            Live
          </span>
          <button onClick={handleOpenExternal} className="text-white/50 hover:text-white transition p-1.5" title="Open in new tab">
            <ExternalLink size={15} />
          </button>
          <button onClick={handleHangup}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition">
            <PhoneOff size={13} /> End Session
          </button>
        </div>
      </div>

      {/* ── Jitsi container ── */}
      <div ref={jitsiContainerRef} className="flex-1 w-full">
        {!jitsiReady && (
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin mx-auto mb-3 text-[#2D9E6B]" />
              <p className="text-sm text-white/60">Loading video…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
