import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

type BookingLike = {
  id: string;
  scheduled_at?: string | null;
  session_opens_at?: string | null;
  session_ends_at?: string | null;
  status?: string | null;
};

export default function JoinSessionButton({ booking }: { booking: BookingLike }) {
  const now = new Date();
  const opensAt = booking.session_opens_at
    ? new Date(booking.session_opens_at)
    : booking.scheduled_at
      ? new Date(new Date(booking.scheduled_at).getTime() - 15 * 60 * 1000)
      : null;
  const endsAt = booking.session_ends_at
    ? new Date(booking.session_ends_at)
    : booking.scheduled_at
      ? new Date(new Date(booking.scheduled_at).getTime() + 2 * 60 * 60 * 1000)
      : null;

  const sessionOpen = !opensAt || !endsAt || (now >= opensAt && now <= endsAt) || booking.status === "confirmed" || booking.status === "in_progress";
  if (!sessionOpen) return null;

  return (
    <Button asChild>
      <Link to={`/session/${booking.id}`}>
        <Video className="mr-2 h-4 w-4" /> Join Session
      </Link>
    </Button>
  );
}
