/**
 * /pay — Redirects to Stripe Checkout
 * The backend already creates a Stripe session and returns redirect_url.
 * This page just shows a loading state then redirects.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { buildBackendUrl } from "@/lib/backendApi";
import Navbar from "@/components/landing/Navbar";
import { ShieldCheck, Lock, CreditCard, XCircle, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPE_LABELS: Record<string, string> = {
  booking:      "Session Booking",
  course:       "Course Purchase",
  video:        "Video Purchase",
  subscription: "Membership",
};

export default function PaymentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reference  = searchParams.get("reference") || "";
  const type       = searchParams.get("type") || "payment";
  const amount     = Number(searchParams.get("amount") || 0);
  const title      = searchParams.get("title") || "Order";
  const plan       = searchParams.get("plan") || null;
  const contentId  = searchParams.get("content_id") || null;
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email || !user?.id || !reference) return;

    const redirect = async () => {
      try {
        // Ask backend for the Stripe checkout URL
        const res = await fetch(buildBackendUrl("/api/checkout/initialize"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            user_id: user.id,
            type,
            amount,
            content_id: contentId,
            content_title: title,
            plan,
            callback_url: `${window.location.origin}/billing/subscription-callback`,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Could not start checkout");

        const url = data.redirect_url || data.authorization_url;
        if (!url) throw new Error("No checkout URL returned");

        window.location.href = url;
      } catch (err: any) {
        setError(err?.message || "Payment initialization failed");
        setLoading(false);
      }
    };

    redirect();
  }, [user, reference]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-gray-600">Please sign in to complete your payment.</p>
          <Button onClick={() => navigate("/login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  if (!reference) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <XCircle size={40} className="mx-auto text-red-500" />
          <p className="font-semibold text-gray-900">Invalid payment link</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Secure checkout</h1>
                <p className="text-xs text-gray-400">Powered by Stripe</p>
              </div>
            </div>

            {loading && !error && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Loader2 size={32} className="animate-spin text-primary" />
                <p className="text-sm text-gray-500">Redirecting to Stripe checkout…</p>
              </div>
            )}

            {error && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-700">Payment failed</p>
                    <p className="text-sm text-red-600 mt-0.5">{error}</p>
                  </div>
                </div>
                <Button onClick={() => navigate(-1)} variant="outline" className="w-full">Go back</Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Order summary</p>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500 capitalize">{TYPE_LABELS[type] || type}</p>
                    {plan && <p className="text-xs text-gray-400 capitalize mt-0.5">{plan} plan</p>}
                  </div>
                  <p className="font-bold text-gray-900 shrink-0">${amount.toFixed(2)}</p>
                </div>
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <p className="text-sm text-gray-500">Total due today</p>
                  <p className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              {[
                { icon: ShieldCheck, text: "Secured by Stripe" },
                { icon: Lock,        text: "256-bit TLS encryption" },
                { icon: CreditCard,  text: "Visa, Mastercard, Amex" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Icon size={15} className="text-primary shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-gray-400">
              By paying you agree to our{" "}
              <Link to="/terms" className="underline hover:text-gray-600">Terms</Link>
              {" "}and{" "}
              <Link to="/refund-policy" className="underline hover:text-gray-600">Refund Policy</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
