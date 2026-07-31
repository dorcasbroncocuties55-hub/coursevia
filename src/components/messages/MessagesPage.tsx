import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CustomOfferForm from "@/components/messages/CustomOfferForm";
import CustomOfferCard from "@/components/messages/CustomOfferCard";

type Props = {
  currentUserId: string;
  otherUserId: string;
  currentUserRole?: string;
};

export default function MessagesPage({
  currentUserId,
  otherUserId,
  currentUserRole,
}: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [offers, setOffers] = useState<Record<string, any>>({});
  const [text, setText] = useState("");
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const isProvider = useMemo(() => {
    return currentUserRole === "coach" || currentUserRole === "therapist" || currentUserRole === "provider";
  }, [currentUserRole]);

  const loadMessages = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);

      const offerIds = data
        .filter((m) => m.offer_id)
        .map((m) => m.offer_id);

      if (offerIds.length > 0) {
        const { data: offerData } = await supabase
          .from("custom_offers")
          .select("*")
          .in("id", offerIds);

        const mapped: Record<string, any> = {};
        (offerData || []).forEach((offer) => {
          mapped[offer.id] = offer;
        });
        setOffers(mapped);
      } else {
        setOffers({});
      }
    }

    setLoading(false);
  };

  const sendTextMessage = async () => {
    if (!text.trim()) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: text.trim(),
      message_type: "text",
    });

    if (error) {
      alert(error.message || "Failed to send message");
      return;
    }

    setText("");
    loadMessages();
  };

  useEffect(() => {
    loadMessages();
  }, [currentUserId, otherUserId]);

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border p-4 bg-white flex items-center justify-between">
        <h1 className="text-xl font-bold">Messages</h1>

        {isProvider && (
          <button
            onClick={() => setShowOfferForm((prev) => !prev)}
            className="rounded-xl px-4 py-2 bg-blue-600 text-white"
          >
            {showOfferForm ? "Close Offer Form" : "Create Custom Offer"}
          </button>
        )}
      </div>

      {showOfferForm && isProvider && (
        <CustomOfferForm
          senderId={currentUserId}
          receiverId={otherUserId}
          onSent={loadMessages}
        />
      )}

      <div className="rounded-2xl border bg-white p-4 space-y-4 min-h-[400px]">
        {loading ? (
          <div>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div>No messages yet</div>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[80%]">
                  {message.message_type === "custom_offer" && message.offer_id ? (
                    <CustomOfferCard
                      offer={offers[message.offer_id]}
                      currentUserId={currentUserId}
                      onAction={loadMessages}
                    />
                  ) : (
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        mine
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-2xl border bg-white p-4 flex gap-3">
        <input
          className="flex-1 border rounded-xl px-3 py-2"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={sendTextMessage}
          className="rounded-xl px-4 py-2 bg-blue-600 text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
}