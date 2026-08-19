const fs = require('fs');
const path = require('path');
const bookingModalContent = String.raw`import { useState } from "react";
import { createBooking } from "@/services/bookingService";
import { checkConflict } from "@/services/conflictService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { walletPay } from "@/lib/walletPay";
import { 
  CalendarDays, Clock, Globe, MapPin, MessageCircle, 
  ChevronRight, ChevronLeft, CheckCircle2, User, FileText
} from "lucide-react";
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
    full_name?: string;
  };
  learner: { id: string };
  selectedService?: any;
  services?: any[];
};
export default function BookingModal({ provider, learner, selectedService: initialService, services = [] }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionMode, setSessionMode] = useState<"online" | "in_person">("online");
  const [selectedService, setSelectedService] = useState(initialService);
  const [learnerGoals, setLearnerGoals] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const offeredMode = selectedService?.service_delivery_mode || provider.service_delivery_mode || "online";
  const canChooseMode = offeredMode === "both";
  const hasMultipleServices = services.length > 1;
  const price = Number(selectedService?.price || 0);
  const providerName = provider.full_name || "Provider";
  let stepSequence: string[] = [];
  if (canChooseMode) stepSequence.push("sessionType");
  if (hasMultipleServices) stepSequence.push("service");
  stepSequence.push("goals", "datetime", "review");
  const totalSteps = stepSequence.length;
  const handleNext = () => {
    const currentStepType = stepSequence[currentStep - 1];
    if (currentStepType === "sessionType" && !sessionMode) {
      toast.error("Please select a session type");
      return;
    }
    if (currentStepType === "service" && !selectedService) {
      toast.error("Please select a service");
      return;
    }
    if (currentStepType === "goals" && !learnerGoals.trim()) {
      toast.error("Please tell us what you want to work on");
      return;
    }
    if (currentStepType === "datetime" && !date) {
      toast.error("Please select a date and time");
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  const handleBooking = async () => {
    setLoading(true);
    try {
      const conflict = await checkConflict(provider.id, date);
      if (conflict) {
        toast.error("This time slot is unavailable. Please select another time.");
        const datetimeStepIndex = stepSequence.indexOf("datetime") + 1;
        setCurrentStep(datetimeStepIndex);
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
        notes: learnerGoals,
        provider_type: provider.provider_type,
        coach_profile_id: selectedService?.coach_id || provider.coach_profile_id || null,
        service_delivery_mode: sessionMode,
        calendar_mode: provider.calendar_mode || "provider_calendar",
        release_provider_phone: sessionMode === "in_person" && Boolean(provider.phone_visible_after_booking),
      } as any);
      if (price > 0) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.email) throw new Error("A valid email is required for payment.");
        await walletPay({
          user_id: learner.id,
          email: authUser.email,
          type: "booking",
          amount: price,
          content_id: booking.id,
          content_title: selectedService?.title || "Session booking",
        });
      }
      toast.success("Booking confirmed! Check your email for session details.");
      window.location.href = "/dashboard/bookings";
    } catch (error: any) {
      toast.error(error.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const currentStepType = stepSequence[currentStep - 1];
  const bookingDate = date ? new Date(date) : null;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#0b7e84] transition-all duration-300"
            style={{ width: ` + '`${(currentStep / totalSteps) * 100}%`' + ` }}
          />
        </div>
      </div>
      <div className="min-h-[300px]">
        {currentStepType === "sessionType" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Choose Session Type</h3>
              <p className="text-sm text-slate-500">How would you like to meet?</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => setSessionMode("online")}
                className={` + '`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition ${' + `
                  sessionMode === "online"
                    ? "border-[#0b7e84] bg-[#0b7e84]/5"
                    : "border-slate-200 hover:border-[#0b7e84]/50"
                }` + '`' + `}
              >
                <Globe size={32} className={sessionMode === "online" ? "text-[#0b7e84]" : "text-slate-400"} />
                <div className="text-center">
                  <p className="font-semibold text-slate-900">Online</p>
                  <p className="text-xs text-slate-500 mt-1">Video call session</p>
                </div>
              </button>
              <button
                onClick={() => setSessionMode("in_person")}
                className={` + '`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition ${' + `
                  sessionMode === "in_person"
                    ? "border-[#0b7e84] bg-[#0b7e84]/5"
                    : "border-slate-200 hover:border-[#0b7e84]/50"
                }` + '`' + `}
              >
                <MapPin size={32} className={sessionMode === "in_person" ? "text-[#0b7e84]" : "text-slate-400"} />
                <div className="text-center">
                  <p className="font-semibold text-slate-900">In-person</p>
                  <p className="text-xs text-slate-500 mt-1">Face-to-face meeting</p>
                </div>
              </button>
            </div>
          </div>
        )}
        {currentStepType === "service" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Select a Service</h3>
              <p className="text-sm text-slate-500">Choose what you'd like to book</p>
            </div>
            <div className="space-y-3 pt-4">
              {services.map((service: any) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={` + '`w-full text-left p-4 rounded-xl border-2 transition ${' + `
                    selectedService?.id === service.id
                      ? "border-[#0b7e84] bg-[#0b7e84]/5"
                      : "border-slate-200 hover:border-[#0b7e84]/50"
                  }` + '`' + `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{service.title}</p>
                      {service.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{service.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {service.duration_minutes || 60} mins
                        </span>
                      </div>
                    </div>
                    {service.price > 0 && (
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-slate-900">$` + '${Number(service.price).toFixed(2)}' + `</p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {currentStepType === "goals" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <FileText size={40} className="mx-auto text-[#0b7e84]" />
              <h3 className="text-xl font-bold text-slate-900">What do you want to work on?</h3>
              <p className="text-sm text-slate-500">Tell {providerName} what you'd like to focus on</p>
            </div>
            <div className="pt-4">
              <textarea
                value={learnerGoals}
                onChange={(e) => setLearnerGoals(e.target.value)}
                placeholder="Example: I want to discuss career transition strategies and create an action plan for the next 3 months..."
                rows={6}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#0b7e84] focus:ring-2 focus:ring-[#0b7e84]/20 resize-none"
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                <span>Be specific to help your session be more effective</span>
                <span>{learnerGoals.length}/500</span>
              </div>
            </div>
          </div>
        )}
        {currentStepType === "datetime" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <CalendarDays size={40} className="mx-auto text-[#0b7e84]" />
              <h3 className="text-xl font-bold text-slate-900">Pick a Date & Time</h3>
              <p className="text-sm text-slate-500">Choose when you'd like your session</p>
            </div>
            <div className="pt-4 space-y-4">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-[#0b7e84] focus:ring-2 focus:ring-[#0b7e84]/20"
              />
              <div className={` + '`rounded-xl border p-3 text-sm ${' + `
                sessionMode === "in_person" 
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-sky-200 bg-sky-50 text-sky-800"
              }` + '`' + `}>
                {sessionMode === "in_person" 
                  ? "💼 In-person: Office address will be shared after booking"
                  : "💻 Online: Meeting link will be sent to your email"}
              </div>
            </div>
          </div>
        )}
        {currentStepType === "review" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <CheckCircle2 size={40} className="mx-auto text-[#0b7e84]" />
              <h3 className="text-xl font-bold text-slate-900">Review Your Booking</h3>
              <p className="text-sm text-slate-500">Please confirm all details are correct</p>
            </div>
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <User size={18} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Provider</p>
                  <p className="text-sm font-semibold text-slate-900">{providerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                {sessionMode === "online" ? <Globe size={18} className="text-slate-400 mt-0.5 shrink-0" /> : <MapPin size={18} className="text-slate-400 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Session Type</p>
                  <p className="text-sm font-semibold text-slate-900">{sessionMode === "online" ? "Online Video Call" : "In-Person Meeting"}</p>
                </div>
              </div>
              {selectedService && (
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <FileText size={18} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium">Service</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedService.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{selectedService.duration_minutes || 60} minutes</p>
                  </div>
                  {price > 0 && (
                    <p className="text-lg font-bold text-[#0b7e84]">$` + '${price.toFixed(2)}' + `</p>
                  )}
                </div>
              )}
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <CalendarDays size={18} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Date & Time</p>
                  {bookingDate && (
                    <>
                      <p className="text-sm font-semibold text-slate-900">
                        {bookingDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </p>
                      <p className="text-sm text-slate-600">
                        {bookingDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <MessageCircle size={18} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">What you want to work on</p>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{learnerGoals}</p>
                </div>
              </div>
            </div>
            {price > 0 && (
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex items-center justify-between text-lg font-bold text-slate-900">
                  <span>Total</span>
                  <span className="text-[#0b7e84]">$` + '${price.toFixed(2)}' + `</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Payment will be deducted from your wallet balance</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        {currentStep > 1 && (
          <button
            onClick={handleBack}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        )}
        {currentStep < totalSteps ? (
          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0b7e84] text-white font-semibold hover:bg-[#096a70] transition"
          >
            Continue
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleBooking}
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-xl bg-[#0b7e84] text-white font-bold hover:bg-[#096a70] disabled:opacity-60 transition"
          >
            {loading ? "Processing..." : price > 0 ? ` + '`Confirm & Pay $${price.toFixed(2)}`' + ` : "Confirm Booking"}
          </button>
        )}
      </div>
    </div>
  );
}
`;
try {
  fs.writeFileSync(path.join(__dirname, 'src', 'components', 'BookingModal.tsx'), bookingModalContent, 'utf8');
  console.log('✅ Multi-step booking wizard created successfully!');
} catch (error) {
  console.error('❌ Error writing file:', error.message);
  process.exit(1);
}
