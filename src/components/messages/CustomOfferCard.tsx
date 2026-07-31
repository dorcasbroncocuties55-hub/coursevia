import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  offer: any;
  currentUserId: string;
  onAction?: () => void;
};

export default function CustomOfferCard({ offer, currentUserId, onAction }: Props) {
  const [loading, setLoading] = useState(false);

  if (!offer) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Offer details unavailable.
      </div>
    );
  }

  const isRecipient = offer.receiver_id === currentUserId;
  const isPending = offer.status === "pending";

  const handleAccept = async () => {
    setLoading(true);
    await supabase.from("custom_offers").update({ status: "accepted" }).eq("id", offer.id);
    setLoading(false);
    onAction?.();
  };

  const handleDecline = async () => {
    setLoading(true);
    await supabase.from("custom_offers").update({ status: "declined" }).eq("id", offer.id);
    setLoading(false);
    onAction?.();
  };

  const statusColor =
    offer.status === "accepted"
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : offer.status === "declined"
        ? "text-red-600 bg-red-50 border-red-200"
        : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-[#0b7e84]">Custom Offer</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{offer.title || "Session Offer"}</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusColor}`}>
          {offer.status || "pending"}
        </span>
      </div>

      {offer.description ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{offer.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
        {offer.price != null && (
          <div>
            <span className="text-slate-500">Price:</span>{" "}
            <span className="font-semibold">${Number(offer.price).toFixed(2)}</span>
          </div>
        )}
        {offer.duration_minutes != null && (
          <div>
            <span className="text-slate-500">Duration:</span>{" "}
            <span className="font-semibold">{offer.duration_minutes} mins</span>
          </div>
        )}
        {offer.sessions != null && (
          <div>
            <span className="text-slate-500">Sessions:</span>{" "}
            <span className="font-semibold">{offer.sessions}</span>
          </div>
        )}
      </div>

      {isRecipient && isPending && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="rounded-xl bg-[#0b7e84] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}
