/**
 * CourseCheckout - Complete checkout flow for course purchase
 * Features: Saved cards, add new card, Stripe payment, enrollment on success
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { 
  listPaymentMethods, 
  createCoursePaymentIntent, 
  confirmPayment,
  type PaymentMethod 
} from "@/lib/stripeLearnerApi";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Lock, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// ── Coursevia brand tokens ────────────────────────────────────────────────────
const A = "#2D9E6B";  // Primary
const D = "#0F3D2E";  // Dark
const B = "#EAE6E2";  // Border
const TS = "#6B7280"; // Text secondary

// ── Types ─────────────────────────────────────────────────────────────────────
interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  creator_id: string;
  creator_name: string | null;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CourseCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const stripe = useStripe();
  const elements = useElements();

  const courseId = searchParams.get("courseId");

  const [course, setCourse] = useState<Course | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch course details
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        toast.error("No course selected");
        navigate("/learner/courses");
        return;
      }

      try {
        const { data: courseData, error } = await supabase
          .from("courses")
          .select(`
            id,
            title,
            description,
            thumbnail_url,
            price,
            creator_id,
            profiles!courses_creator_id_fkey (full_name)
          `)
          .eq("id", courseId)
          .single();

        if (error) throw error;

        setCourse({
          ...courseData,
          creator_name: (courseData as any).profiles?.full_name || "Instructor",
        });

        // Fetch saved payment methods
        if (user?.id) {
          const methods = await listPaymentMethods(user.id);
          setPaymentMethods(methods);
          
          // Auto-select default method
          const defaultMethod = methods.find(m => m.is_default);
          if (defaultMethod) {
            setSelectedMethod(defaultMethod.id);
          }
        }
      } catch (err: any) {
        console.error("Error fetching course:", err);
        toast.error("Failed to load course details");
        navigate("/learner/courses");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, user?.id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id || !course) return;
    if (!stripe || !elements) {
      toast.error("Stripe not loaded");
      return;
    }

    setProcessing(true);

    try {
      let paymentMethodId: string | undefined;

      if (useNewCard) {
        // Create new payment method
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error("Card element not found");
        }

        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: {
            name: profile?.full_name || undefined,
            email: profile?.email || undefined,
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        paymentMethodId = paymentMethod!.id;
      } else {
        // Use saved card
        if (!selectedMethod) {
          throw new Error("Please select a payment method");
        }

        const method = paymentMethods.find(m => m.id === selectedMethod);
        if (!method) {
          throw new Error("Payment method not found");
        }

        paymentMethodId = method.stripe_payment_method_id;
      }

      // Create payment intent
      const { clientSecret, paymentIntentId } = await createCoursePaymentIntent(
        user.id,
        course.id,
        course.price,
        paymentMethodId
      );

      // Confirm payment
      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId,
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Confirm on backend and create enrollment
      await confirmPayment(paymentIntentId, user.id);

      setSuccess(true);
      toast.success("Course purchased successfully!");

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/learner/courses");
      }, 2000);

    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Payment failed");
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

  if (!course) {
    return null;
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 480, background: "#fff", padding: 48, borderRadius: 16, border: `1px solid ${B}` }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${A}15`, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={48} style={{ color: A }} />
          </div>
          <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 24, color: D, margin: "0 0 12px" }}>
            Purchase Complete!
          </h2>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, margin: "0 0 24px" }}>
            You now have access to <strong>{course.title}</strong>
          </p>
          <button 
            onClick={() => navigate("/learner/courses")}
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
            Go to My Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Back Button */}
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, "@media (max-width: 1024px)": { gridTemplateColumns: "1fr" } }}>
          {/* Course Details */}
          <div>
            <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: "0 0 24px" }}>
              Checkout
            </h1>

            <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 16px" }}>
                Course Details
              </h2>
              
              <div style={{ display: "flex", gap: 16 }}>
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} style={{ width: 120, height: 80, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 120, height: 80, borderRadius: 8, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CreditCard size={32} style={{ color: TS }} />
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 16, color: D, margin: "0 0 6px" }}>
                    {course.title}
                  </h3>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: "0 0 8px" }}>
                    by {course.creator_name}
                  </p>
                  {course.description && (
                    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: 0, lineHeight: 1.5 }}>
                      {course.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <form onSubmit={handleSubmit}>
              <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24 }}>
                <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 16px" }}>
                  Payment Method
                </h2>

                {/* Saved Cards */}
                {paymentMethods.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: D, display: "block", marginBottom: 12 }}>
                      Select a saved card
                    </label>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {paymentMethods.map(method => (
                        <label 
                          key={method.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: 16,
                            borderRadius: 12,
                            border: `2px solid ${selectedMethod === method.id && !useNewCard ? A : B}`,
                            background: selectedMethod === method.id && !useNewCard ? `${A}05` : "#fff",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onClick={() => {
                            setSelectedMethod(method.id);
                            setUseNewCard(false);
                          }}
                        >
                          <input 
                            type="radio"
                            name="payment-method"
                            checked={selectedMethod === method.id && !useNewCard}
                            onChange={() => {}}
                            style={{ cursor: "pointer" }}
                          />
                          <div style={{ width: 40, height: 28, borderRadius: 6, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                            💳
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: "0 0 2px", textTransform: "capitalize" }}>
                              {method.brand} •••• {method.last4}
                            </p>
                            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: 0 }}>
                              Expires {method.exp_month.toString().padStart(2, "0")}/{method.exp_year}
                            </p>
                          </div>
                          {method.is_default && (
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              background: `${A}15`,
                              fontFamily: "Inter,sans-serif",
                              fontSize: 11,
                              fontWeight: 600,
                              color: A,
                            }}>
                              Default
                            </span>
                          )}
                        </label>
                      ))}
                    </div>

                    <div style={{ margin: "16px 0", textAlign: "center" }}>
                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>or</span>
                    </div>
                  </div>
                )}

                {/* New Card Option */}
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
                    name="payment-method"
                    checked={useNewCard}
                    onChange={() => {}}
                    style={{ cursor: "pointer" }}
                  />
                  <CreditCard size={20} style={{ color: A }} />
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D }}>
                    Use a new card
                  </span>
                </label>

                {/* Card Element */}
                {useNewCard && (
                  <div style={{
                    padding: "16px",
                    borderRadius: 12,
                    border: `1px solid ${B}`,
                    background: "#F9FAFB",
                    marginBottom: 16,
                  }}>
                    <CardElement 
                      options={{
                        style: {
                          base: {
                            fontSize: "14px",
                            color: D,
                            fontFamily: "Inter, sans-serif",
                            "::placeholder": {
                              color: TS,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={processing || (!selectedMethod && !useNewCard) || !stripe}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    borderRadius: 8,
                    border: "none",
                    background: processing || (!selectedMethod && !useNewCard) || !stripe ? "#D1D5DB" : A,
                    fontFamily: "Inter,sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#fff",
                    cursor: processing || (!selectedMethod && !useNewCard) || !stripe ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {processing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Pay ${course.price.toFixed(2)}
                    </>
                  )}
                </button>

                {/* Security Note */}
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, textAlign: "center", margin: "12px 0 0" }}>
                  🔒 Secured by Stripe · Your payment information is encrypted
                </p>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24, position: "sticky", top: 24 }}>
              <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 16px" }}>
                Order Summary
              </h2>

              <div style={{ paddingBottom: 16, borderBottom: `1px solid ${B}`, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>Course Price</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600, color: D }}>${course.price.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>Platform Fee</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600, color: D }}>$0.00</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 700, color: D }}>Total</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 20, fontWeight: 700, color: A }}>${course.price.toFixed(2)}</span>
              </div>

              {/* Benefits */}
              <div style={{ padding: 16, borderRadius: 12, background: "#F9FAFB" }}>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: D, margin: "0 0 12px" }}>
                  What's included:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: TS, lineHeight: 1.8 }}>
                  <li>Lifetime access to course content</li>
                  <li>Certificate of completion</li>
                  <li>Direct instructor support</li>
                  <li>30-day money-back guarantee</li>
                </ul>
              </div>

              {/* Refund Policy */}
              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#FEF3C7", border: "1px solid #FCD34D" }}>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.6 }}>
                  <strong>Refund Policy:</strong> Request a full refund within 30 days if you're not satisfied.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
