import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";

const SessionRoom = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBooking = async () => {
      if (!bookingId) return;

      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (data) {
        const meetingLink = (data as any).meeting_url || (data as any).meeting_link || (data as any).session_room_url || `https://meet.jit.si/coursevia-${data.id}`;

        if (!(data as any).meeting_url) {
          await supabase.from("bookings").update({ meeting_url: meetingLink, status: data.status === "pending" ? "confirmed" : data.status } as any).eq("id", data.id);
        }

        setBooking({ ...data, meeting_url: meetingLink });
      }

      setLoading(false);
    };

    loadBooking();
  }, [bookingId]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Live session room</h1>
          <p className="text-muted-foreground">Your secure meeting room opens directly inside Coursevia using Jitsi.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-muted-foreground">Loading session room...</div>
        ) : !booking ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-muted-foreground">We could not find this booking.</div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <p className="font-medium text-foreground">{booking.id}</p>
            </div>
            <iframe
              title="Live Session Room"
              src={booking.meeting_url}
              allow="camera; microphone; fullscreen; display-capture"
              className="h-[78vh] w-full"
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SessionRoom;
