import { useMemo, useState } from "react";
import { createBooking } from "@/services/bookingService";
import { checkConflict } from "@/services/conflictService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { initializeCheckout } from "@/lib/paymentGateway";
import { getServiceModeLabel } from "@/lib/providerModes";
import { CalendarDays, Clock, Globe, MapPin, MessageCircle, ShieldCheck } from "lucide-react";

type Props = {
  provider: {
    id: string;
    user_id?: string;
    provider_type?: string;
    coach_profile_id?: string;
    service_delivery_mode?: "online" | "in_person" | "both" | string;
    calendar_mode?: "open_schedule" | "provider_calendar" | string;
    phone?: string | null;
    phone_visible_after_booking?: boolean | null;
  };
  learner: { id: string };
  selectedService?: any;
};

export default function BookingModal({ provider, learner, selectedService }: Props) {
  const defaultMode = useMemo(() => {
    const mode = selectedService?.service_delivery_mode || provider.service_delivery_mode;
    if (mode === "both") return "online";
    if (mode === "in_person") return "in_person";
    return "online";
  }, [provider.service_delivery_mode, selectedService]);

  const [sessionMode, setSessionMode] = useState<"online" | "in_person">(defaultMode as any);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const offeredMode = selectedService?.service_delivery_mode || provider.service_delivery_mode || "online";
  const calendarMode = provider.calendar_mode || "provider_calendar";
  const canChooseMode = offeredMode === "both";
  const price = Number(selectedService?.price || 0);

  const handleMessageProvider = () => {
    window.location.href = `/dashboard/messages?user=${provider.user_id || provider.id}`;
  };

  const handleBooking = async () => {
    setLoading(true);
    try {
      if (!date) {
        toast.error("Please choose a date and time.");
        setLoading(false);
        return;
      }

      const conflict = await checkConflict(provider.id, date);
      if (conflict) {
        const choose = window.confirm("This time slot is unavailable.\n\nOK — pick another time\nCancel — message the provider");
        if (!choose) handleMessageProvider();
        setLoading(false);
        return;
      }

      const booking = await createBooking({
        provider_id: provider.id,
        learner_id: learner.id,
        booking_type: "scheduled",
        scheduled_time: date,
        duration: selectedService?.duration_minutes || 60,
        service_id: selectedService?.id || null,
        notes,
        provider_type: provider.provider_type,
        coach_profile_id: selectedService?.coach_id || provider.coach_profile_id || null,
        service_delivery_mode: sessionMode,
        calendar_mode: calendarMode,
        release_provider_phone: sessionMode === "in_person" && Boolean(provider.phone_visible_after_booking),
      } as any);

      // Both online and in-person require payment if price > 0
      if (price > 0) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.email) throw new Error("A valid email is required before payment.");

        const checkout = await initializeCheckout({
          email: authUser.email,
          user_id: learner.id,
          type: "booking",
          amount: price,
          content_id: booking.id,
          content_title: selectedService?.title || "Session booking",
        });

        // Redirect to Stripe checkout directly
        const dest = checkout.authorization_url || checkout.redirect_url;
        if (!dest) throw new Error("No payment URL returned.");
        window.location.href = dest;
        return;
      }

      // Free bookings
      toast.success(
        sessionMode === "in_person"
          ? "In-person booking created. Check your email for office address."
          : "Booking created successfully. Check your email for session details."
      );

      window.location.href = "/dashboard/bookings";
    } catch (error: any) {
      toast.error(error.message || "Booking failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Selected service summary */}
      {selectedService && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Selected service</p>
          <p className="mt-1.5 font-semibold text-slate-900">{selectedService.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Clock size={13} /> {selectedService.duration_minutes || 60} mins</span>
            <span className="flex items-center gap-1">
              {sessionMode === "online" ? <Globe size={13} /> : <MapPin size={13} />}
              {getServiceModeLabel(selectedService.service_delivery_mode || provider.service_delivery_mode)}
            </span>
          </div>
          {price > 0 && (
            <p className="mt-2 text-xl font-bold text-slate-900">${price.toFixed(2)}</p>
          )}
        </div>
      )}

      {/* Session mode toggle */}
      {canChooseMode && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Session type</p>
          <div className="grid grid-cols-2 gap-2">
            {(["online", "in_person"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSessionMode(m)}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
                  sessionMode === m
                    ? "border-[#0b7e84] bg-[#0b7e84] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#0b7e84]/50"
                }`}
              >
                {m === "online" ? <Globe size={14} /> : <MapPin size={14} />}
                {m === "online" ? "Online" : "In-person"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date/time picker */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <CalendarDays size={14} /> Date & time
        </label>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0b7e84] focus:ring-1 focus:ring-[#0b7e84]/20"
        />
      </div>

      {/* Mode info banner */}
      {sessionMode === "in_person" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          In-person: select your appointment time, pay on-site. Provider contact details are released after booking if enabled.
        </div>
      ) : (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          Online: choose your time, complete payment, and receive your session link by email.
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes <span className="text-slate-400">(optional)</span></label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything the provider should know before your session…"
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0b7e84] focus:ring-1 focus:ring-[#0b7e84]/20 resize-none"
        />
      </div>

      {/* Security note */}
      {price > 0 && sessionMode === "online" && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={13} className="text-emerald-500" />
          Payment processed securely via Checkout.com. Booking confirmed after verification.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleBooking}
          disabled={loading}
          className="flex-1 rounded-xl bg-[#0b7e84] py-3 text-sm font-bold text-white hover:bg-[#096a70] disabled:opacity-60 transition"
        >
          {loading ? "Processing…" : price > 0 && sessionMode === "online" ? `Confirm & Pay $${price.toFixed(2)}` : "Confirm Booking"}
        </button>
        <button
          onClick={handleMessageProvider}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <MessageCircle size={16} />
        </button>
      </div>
    </div>
  );
}
