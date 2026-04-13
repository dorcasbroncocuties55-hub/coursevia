import { useState } from "react";
import { MIN_PROVIDER_PRICE, isValidProviderPrice } from "@/lib/pricingRules";
import { sendOffer } from "@/services/offerService";

type Props = {
  senderId: string;
  receiverId: string;
  onSent?: () => void;
};

export default function CustomOfferForm({
  senderId,
  receiverId,
  onSent,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOffer = async () => {
    if (!title.trim()) {
      alert("Enter offer title");
      return;
    }

    if (!description.trim()) {
      alert("Enter offer description");
      return;
    }

    if (!price || !isValidProviderPrice(Number(price))) {
      alert("Enter a valid price of at least $6");
      return;
    }

    setLoading(true);
    try {
      await sendOffer({
        sender_id: senderId,
        receiver_id: receiverId,
        title,
        description,
        price: Number(price),
        duration_minutes: Number(durationMinutes || 60),
        scheduled_at: scheduledAt || null,
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setDurationMinutes("60");
      setScheduledAt("");
      alert("Offer sent successfully");
      onSent?.();
    } catch (error: any) {
      alert(error.message || "Failed to send offer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border p-4 space-y-3 bg-white">
      <h3 className="text-lg font-semibold">Create Custom Offer</h3>

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Offer title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full border rounded-lg px-3 py-2 min-h-[100px]"
        placeholder="Offer description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        type="number"
        min={String(MIN_PROVIDER_PRICE)}
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        type="number"
        min="15"
        step="15"
        placeholder="Duration in minutes"
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
      />

      <button
        onClick={handleSendOffer}
        disabled={loading}
        className="rounded-xl px-4 py-2 bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Offer"}
      </button>
    </div>
  );
}