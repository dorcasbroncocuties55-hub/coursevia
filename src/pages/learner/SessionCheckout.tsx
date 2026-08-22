/**
 * SessionCheckout - Complete checkout flow for session booking
 * Features: Time slot selection, saved cards, Stripe payment, booking creation
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { 
  listPaymentMethods, 
  createSessionPaymentIntent,
  type PaymentMethod 
} from "@/lib/stripeLearnerApi";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Lock, CheckCircle, Calendar, Clock, Video, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// ── Coursevia brand tokens ────────────────────────────────────────────────────
const A = "#2D9E6B";  // Primary
const D = "#0F3D2E";  // Dark
const B = "#EAE6E2";  // Border
const TS = "#6B7280"; // Text secondary

// ── Types ─────────────────────────────────────────────────────────────────────
interface Service {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  coach_id: string;
  coach_name: string | null;
  coach_avatar: string | null;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SessionCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const stripe = useStripe();
  const elements = useElements();

  const serviceId = searchParams.get("serviceId");
  const coachId = searchParams.get("coachId");

  const [service, setService] = useState<Service | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Generate available time slots for next 14 days
  const generateTimeSlots = () => {
    const slots: { date: string; times: string[] }[] = [];
    const today = new Date();

    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const times = [
        "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
        "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
      ];

      slots.push({ date: dateStr, times });
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Fetch service details
  useEffect(() => {
    const fetchService = async () => {
      if (!serviceId || !coachId) {
        toast.error("Invalid session details");
        navigate("/explore");
        return;
      }

      try {
        const { data: serviceData, error } = await supabase
          .from("coach_services")
          .select(`
            id,
            title,
            description,
            price,
            duration_minutes,
            coach_id,
            profiles!coach_services_coach_id_fkey (full_name, avatar_url)
          `)
          .eq("id", serviceId)
          .eq("coach_id", coachId)
          .single();

        if (error) throw error;

        setService({
          ...serviceData,
          coach_name: (serviceData as any).profiles?.full_name || "Coach",
          coach_avatar: (serviceData as any).profiles?.avatar_url,
        });

        // Fetch saved payment methods
        if (user?.id) {
          const methods = await listPaymentMethods(user.id);
          setPaymentMethods(methods);
          
          const defaultMethod = methods.find(m => m.is_default);
          if (defaultMethod) {
            setSelectedMethod(defaultMethod.id);
          }
        }
      } catch (err: any) {
        console.error("Error fetching service:", err);
        toast.error("Failed to load session details");
        navigate("/explore");
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceId, coachId, user?.id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id || !service) return;
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }
    if (!stripe || !elements) {
      toast.error("Stripe not loaded");
      return;
    }

    setProcessing(true);

    try {
      let paymentMethodId: string | undefined;

      if (useNewCard) {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new Error("Card element not found");

        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: {
            name: profile?.full_name || undefined,
            email: profile?.email || undefined,
          },
        });

        if (error) throw new Error(error.message);
        paymentMethodId = paymentMethod!.id;
      } else {
        if (!selectedMethod) throw new Error("Please select a payment method");
        const method = paymentMethods.find(m => m.id === selectedMethod);
        if (!method) throw new Error("Payment method not found");
        paymentMethodId = method.stripe_payment_method_id;
      }

      // Create payment intent
      const { clientSecret, paymentIntentId } = await createSessionPaymentIntent(
        user.id,
        service.id,
        service.coach_id,
        service.price,
        paymentMethodId
      );

      // Confirm payment
      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId,
      });

      if (confirmError) throw new Error(confirmError.message);

      // Create booking in database
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);
      
      const { error: bookingError } = await supabase
        .from("bookings")
        .insert({
          learner_id: user.id,
          coach_id: service.coach_id,
          service_id: service.id,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: service.duration_minutes,
          status: "confirmed",
          notes: notes || null,
        });

      if (bookingError) throw bookingError;

      // Record payment
      await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          amount: service.price,
          currency: "usd",
          status: "completed",
          payment_method: "card",
          stripe_payment_intent_id: paymentIntentId,
          description: `Session: ${service.title}`,
          metadata: {
            type: "session_booking",
            serviceId: service.id,
            coachId: service.coach_id,
          },
        });

      setSuccess(true);
      toast.success("Session booked successfully!");

      setTimeout(() => {
        navigate("/learner/bookings");
      }, 2000);

    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err.message || "Booking failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={48} className="animate-spin" style={{ color: A }} />
      </div>
    );
  }

  if (!service) return null;

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 480, background: "#fff", padding: 48, borderRadius: 16, border: `1px solid ${B}` }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${A}15`, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={48} style={{ color: A }} />
          </div>
          <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 24, color: D, margin: "0 0 12px" }}>
            Session Booked!
          </h2>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, margin: "0 0 8px" }}>
            Your session with <strong>{service.coach_name}</strong> has been confirmed
          </p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, margin: "0 0 24px" }}>
            {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {selectedTime}
          </p>
          <button 
            onClick={() => navigate("/learner/bookings")}
            style={{
              width: "100%",
              padding: "12px 24px",
              borderRadius: 8,
              border: "none",
              background: A,
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            View My Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            marginBottom: 24,
            borderRadius: 8,
            border: `1px solid ${B}`,
            background: "#fff",
            fontFamily: "Inter,sans-serif",
            fontWeight: 600,
            fontSize: 14,
            color: TS,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32 }}>
          <div>
            <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: "0 0 24px" }}>
              Book Session
            </h1>

            {/* Service Details */}
            <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 16px" }}>
                Session Details
              </h2>
              
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E5E7EB", overflow: "hidden", flexShrink: 0 }}>
                  {service.coach_avatar ? (
                    <img src={service.coach_avatar} alt={service.coach_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif", fontSize: 24, fontWeight: 700, color: TS }}>
                      {service.coach_name?.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 16, color: D, margin: "0 0 6px" }}>
                    {service.title}
                  </h3>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: 0 }}>
                    with {service.coach_name}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 24, padding: 16, borderRadius: 12, background: "#F9FAFB" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={16} style={{ color: A }} />
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>
                    {service.duration_minutes} minutes
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Video size={16} style={{ color: A }} />
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>
                    Online Session
                  </span>
                </div>
              </div>

              {service.description && (
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: "16px 0 0", lineHeight: 1.6 }}>
                  {service.description}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Date & Time Selection */}
              <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 16px" }}>
                  Select Date & Time
                </h2>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: D, display: "block", marginBottom: 8 }}>
                    Date
                  </label>
                  <select 
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime("");
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${B}`,
                      fontFamily: "Inter,sans-serif",
                      fontSize: 14,
                      color: D,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Select a date</option>
                    {timeSlots.map(slot => (
                      <option key={slot.date} value={slot.date}>
                        {new Date(slot.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDate && (
                  <div>
                    <label style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: D, display: "block", marginBottom: 8 }}>
                      Time
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                      {timeSlots.find(s => s.date === selectedDate)?.times.map(time => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          style={{
                            padding: "10px",
                            borderRadius: 8,
                            border: `2px solid ${selectedTime === time ? A : B}`,
                            background: selectedTime === time ? `${A}05` : "#fff",
                            fontFamily: "Inter,sans-serif",
                            fontWeight: 600,
                            fontSize: 13,
                            color: selectedTime === time ? A : D,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
                <label style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: D, display: "block", marginBottom: 8 }}>
                  Notes (Optional)
                </label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or questions for the coach..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${B}`,
                    fontFamily: "Inter,sans-serif",
                    fontSize: 14,
                    color: D,
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Payment Method */}
              <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24 }}>
                <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 16px" }}>
                  Payment Method
                </h2>

                {paymentMethods.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    {paymentMethods.map(method => (
                      <label 
                        key={method.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: 16,
                          marginBottom: 12,
                          borderRadius: 12,
                          border: `2px solid ${selectedMethod === method.id && !useNewCard ? A : B}`,
                          background: selectedMethod === method.id && !useNewCard ? `${A}05` : "#fff",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setSelectedMethod(method.id);
                          setUseNewCard(false);
                        }}
                      >
                        <input 
                          type="radio"
                          checked={selectedMethod === method.id && !useNewCard}
                          onChange={() => {}}
                          style={{ cursor: "pointer" }}
                        />
                        <div style={{ width: 40, height: 28, borderRadius: 6, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>💳</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: 0, textTransform: "capitalize" }}>
                            {method.brand} •••• {method.last4}
                          </p>
                        </div>
                      </label>
                    ))}
                    <div style={{ margin: "16px 0", textAlign: "center" }}>
                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>or</span>
                    </div>
                  </div>
                )}

                <label 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 16,
                    borderRadius: 12,
                    border: `2px solid ${useNewCard ? A : B}`,
                    background: useNewCard ? `${A}05` : "#fff",
                    cursor: "pointer",
                    marginBottom: 16,
                  }}
                  onClick={() => setUseNewCard(true)}
                >
                  <input 
                    type="radio"
                    checked={useNewCard}
                    onChange={() => {}}
                    style={{ cursor: "pointer" }}
                  />
                  <CreditCard size={20} style={{ color: A }} />
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D }}>Use a new card</span>
                </label>

                {useNewCard && (
                  <div style={{ padding: "16px", borderRadius: 12, border: `1px solid ${B}`, background: "#F9FAFB", marginBottom: 16 }}>
                    <CardElement 
                      options={{
                        style: {
                          base: {
                            fontSize: "14px",
                            color: D,
                            fontFamily: "Inter, sans-serif",
                            "::placeholder": { color: TS },
                          },
                        },
                      }}
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={processing || !selectedDate || !selectedTime || (!selectedMethod && !useNewCard) || !stripe}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    borderRadius: 8,
                    border: "none",
                    background: processing || !selectedDate || !selectedTime || (!selectedMethod && !useNewCard) || !stripe ? "#D1D5DB" : A,
                    fontFamily: "Inter,sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#fff",
                    cursor: processing || !selectedDate || !selectedTime || (!selectedMethod && !useNewCard) || !stripe ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {processing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Pay ${service.price.toFixed(2)} & Book
                    </>
                  )}
                </button>

                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, textAlign: "center", margin: "12px 0 0" }}>
                  🔒 Secured by Stripe
                </p>
              </div>
            </form>
          </div>

          {/* Summary Sidebar */}
          <div>
            <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24, position: "sticky", top: 24 }}>
              <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 16px" }}>
                Booking Summary
              </h2>

              {selectedDate && selectedTime && (
                <div style={{ padding: 16, borderRadius: 12, background: `${A}05`, border: `1px solid ${A}`, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Calendar size={16} style={{ color: A }} />
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: D }}>
                      {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={16} style={{ color: A }} />
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: D }}>
                      {selectedTime} ({service.duration_minutes} min)
                    </span>
                  </div>
                </div>
              )}

              <div style={{ paddingBottom: 16, borderBottom: `1px solid ${B}`, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>Session Price</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600, color: D }}>${service.price.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>Platform Fee</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600, color: D }}>$0.00</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 700, color: D }}>Total</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 20, fontWeight: 700, color: A }}>${service.price.toFixed(2)}</span>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: "#FEF3C7", border: "1px solid #FCD34D" }}>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#92400E", margin: 0 }}>
                  <strong>Cancellation:</strong> Free cancellation up to 24 hours before the session
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
