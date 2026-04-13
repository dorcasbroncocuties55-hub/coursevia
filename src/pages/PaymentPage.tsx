/**
 * /pay — Universal checkout page (Checkout.com Frames v2)
 *
 * URL params:
 *   reference   — pre-created payment reference from backend
 *   type        — booking | course | video | subscription
 *   amount      — numeric USD amount
 *   title       — human-readable item name
 *   plan        — subscription plan code (monthly | yearly)
 *   content_id  — booking/course/video ID
 *   redirect    — where to go after success
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { buildBackendUrl } from "@/lib/backendApi";
import Navbar from "@/components/landing/Navbar";
import {
  ShieldCheck, Lock, CreditCard, CheckCircle2,
  XCircle, Loader2, ArrowLeft, AlertCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

declare global { interface Window { Frames: any } }

const PUBLIC_KEY = import.meta.env.VITE_CHECKOUT_PUBLIC_KEY || "";

const TYPE_LABELS: Record<string, string> = {
  booking:      "Session Booking",
  course:       "Course Purchase",
  video:        "Video Purchase",
  subscription: "Membership",
};

type Stage = "loading" | "form" | "processing" | "success" | "error";

export default function PaymentPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();

  const reference  = searchParams.get("reference") || "";
  const type       = searchParams.get("type") || "payment";
  const amount     = Number(searchParams.get("amount") || 0);
  const title      = searchParams.get("title") || "Order";
  const plan       = searchParams.get("plan") || null;
  const contentId  = searchParams.get("content_id") || null;
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [stage, setStage]         = useState<Stage>("loading");
  const [cardValid, setCardValid]  = useState(false);
  const [errorMsg, setErrorMsg]    = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [debugLog, setDebugLog]    = useState<string[]>([]);
  const initialized = useRef(false);

  const log = (msg: string) => {
    console.log("[PaymentPage]", msg);
    setDebugLog(prev => [...prev.slice(-4), msg]);
  };

  // ── Init Frames ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;

    // If Frames SDK already exists from a previous page visit, its internal
    // iframes are destroyed by React navigation. Force a hard reload so the
    // SDK starts completely fresh with a clean DOM.
    if (window.Frames && typeof window.Frames.isCardValid === "function") {
      const container = document.getElementById("cko-pay-container");
      const hasIframes = container && container.querySelectorAll("iframe").length > 0;
      if (!hasIframes) {
        log("Stale SDK detected — reloading for clean init…");
        window.location.reload();
        return;
      }
    }

    let attempts = 0;
    log("Waiting for SDK + container…");

    const poll = setInterval(() => {
      attempts++;
      const container = document.getElementById("cko-pay-container");
      const sdk = window.Frames;

      if (!sdk) {
        if (attempts % 10 === 0) log(`SDK not ready (attempt ${attempts})`);
      }
      if (!container) {
        if (attempts % 10 === 0) log(`Container not found (attempt ${attempts})`);
      }

      if (sdk && container && !initialized.current) {
        clearInterval(poll);
        initialized.current = true;
        log("SDK + container ready — initialising Frames…");
        initFrames(sdk);
        return;
      }

      if (attempts > 80) { // 8 seconds
        clearInterval(poll);
        log("Timeout: SDK or container never became available");
        setStage("error");
        setErrorMsg(
          !window.Frames
            ? "Checkout.com SDK failed to load. Check your internet connection and refresh."
            : "Card form container not found. Please refresh the page."
        );
      }
    }, 100);

    return () => {
      clearInterval(poll);
      try { window.Frames?.removeAllEventHandlers?.(); } catch { /* ignore */ }
    };
  }, []);

  const initFrames = (sdk: any) => {
    try {
      sdk.init({
        publicKey: PUBLIC_KEY,
        containerSelector: "#cko-pay-container",
        style: {
          base: {
            fontSize: "15px",
            color: "#111827",
            fontFamily: "system-ui, -apple-system, sans-serif",
            lineHeight: "1.6",
          },
          invalid: { color: "#dc2626" },
          placeholder: { base: { color: "#9ca3af" } },
        },
      });

      sdk.addEventHandler(sdk.Events.READY, () => {
        log("Frames READY ✓");
        setStage("form");
      });

      sdk.addEventHandler(sdk.Events.CARD_VALIDATION_CHANGED, () => {
        const valid = sdk.isCardValid();
        setCardValid(valid);
        log(`Card valid: ${valid}`);
      });

      sdk.addEventHandler(sdk.Events.FRAME_VALIDATION_CHANGED, () => {
        setCardValid(sdk.isCardValid());
      });

      sdk.addEventHandler(sdk.Events.CARD_TOKENIZED, async (e: any) => {
        log(`Card tokenised: ${e?.token?.slice(0, 12)}…`);
        const token = e?.token;
        if (!token) {
          setErrorMsg("Card tokenisation failed. Please try again.");
          setStage("error");
          return;
        }
        await chargeCard(token);
      });

      sdk.addEventHandler(sdk.Events.CARD_TOKENIZATION_FAILED, (e: any) => {
        log(`Tokenisation failed: ${JSON.stringify(e)}`);
        setErrorMsg("Could not read card details. Please check and try again.");
        setStage("error");
      });

      log("Frames init called — waiting for READY event…");

    } catch (err: any) {
      log(`Frames init threw: ${err?.message}`);
      setStage("error");
      setErrorMsg(`Card form error: ${err?.message || "Unknown error"}`);
    }
  };

  // ── Charge ─────────────────────────────────────────────────────────────────
  const chargeCard = async (token: string) => {
    if (!user?.email || !user?.id) {
      setErrorMsg("You must be signed in to complete payment.");
      setStage("error");
      return;
    }

    setStage("processing");
    log("Charging card…");

    try {
      const res = await fetch(buildBackendUrl("/api/checkout/charge"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: user.email,
          user_id: user.id,
          type,
          amount,
          currency: "USD",
          content_id: contentId,
          plan,
          reference,
        }),
      });

      const json = await res.json().catch(() => ({}));
      log(`Charge response: ${res.status} ${JSON.stringify(json).slice(0, 80)}`);

      // 3DS
      if (json?.requires_action && json?.redirect_url) {
        log("3DS required — redirecting…");
        window.location.assign(json.redirect_url);
        return;
      }

      if (!res.ok || !json.success) {
        setErrorMsg(json?.message || "Payment failed. Please try a different card.");
        setStage("error");
        return;
      }

      setSuccessMsg(json.message || "Payment confirmed.");
      setStage("success");
      log("Payment success ✓");

      setTimeout(() => {
        navigate(json.redirectTo || redirectTo, { replace: true });
      }, 1800);

    } catch (err: any) {
      log(`Charge error: ${err?.message}`);
      setErrorMsg(err?.message || "Payment failed. Please try again.");
      setStage("error");
    }
  };

  const handlePay = () => {
    if (!cardValid || stage === "processing" || !window.Frames) return;
    log("Submitting card…");
    setStage("processing");
    try { window.Frames.submitCard(); }
    catch (err: any) {
      log(`submitCard error: ${err?.message}`);
      setErrorMsg("Could not submit card. Please refresh and try again.");
      setStage("error");
    }
  };

  const handleRetry = () => {
    setStage("form");
    setErrorMsg("");
    try { window.Frames?.enableSubmitForm?.(); } catch { /* ignore */ }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
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
          <p className="text-sm text-gray-500">No payment reference found. Please go back and try again.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">

          {/* ── Left: Card form ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b7e84]/10">
                <CreditCard size={20} className="text-[#0b7e84]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Secure checkout</h1>
                <p className="text-xs text-gray-400">Powered by Checkout.com · Sandbox mode</p>
              </div>
            </div>

            {/* Loading */}
            {stage === "loading" && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Loader2 size={32} className="animate-spin text-[#0b7e84]" />
                <p className="text-sm text-gray-500">Loading secure card form…</p>
                {/* Debug log */}
                {debugLog.length > 0 && (
                  <div className="mt-2 w-full rounded-lg bg-gray-50 border border-gray-200 p-3 text-left">
                    {debugLog.map((l, i) => (
                      <p key={i} className="text-xs text-gray-500 font-mono">{l}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Success */}
            {stage === "success" && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <CheckCircle2 size={48} className="text-emerald-500" />
                <p className="text-xl font-bold text-gray-900">Payment confirmed!</p>
                <p className="text-sm text-gray-500">{successMsg}</p>
                <p className="text-xs text-gray-400">Redirecting you now…</p>
              </div>
            )}

            {/* Error */}
            {stage === "error" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-700">Payment failed</p>
                    <p className="text-sm text-red-600 mt-0.5">{errorMsg}</p>
                  </div>
                </div>
                {debugLog.length > 0 && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    {debugLog.map((l, i) => (
                      <p key={i} className="text-xs text-gray-500 font-mono">{l}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button onClick={handleRetry} className="flex-1 gap-2">
                    <RefreshCw size={14} /> Try again
                  </Button>
                  <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
                    Refresh page
                  </Button>
                </div>
              </div>
            )}

            {/* Processing */}
            {stage === "processing" && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <Loader2 size={40} className="animate-spin text-[#0b7e84]" />
                <p className="font-semibold text-gray-900">Processing payment…</p>
                <p className="text-sm text-gray-500">Please do not close this page.</p>
              </div>
            )}

            {/* Card form — ALWAYS in DOM so SDK can init into it */}
            {/* Only hidden visually when not in form stage */}
            <div className={stage === "form" ? "block" : "hidden"}>
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Card number, expiry & CVV
                </label>
                {/* Checkout.com Frames injects iframes here */}
                <div
                  id="cko-pay-container"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-4 min-h-[56px] shadow-sm focus-within:border-[#0b7e84] focus-within:ring-1 focus-within:ring-[#0b7e84]/20 transition-all"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Test card: 4242 4242 4242 4242 · Any future date · Any CVV
                </p>
              </div>

              <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700">
                  Card details are encrypted end-to-end and never touch our servers.
                </p>
              </div>

              <Button
                onClick={handlePay}
                disabled={!cardValid}
                className="w-full h-12 text-base font-semibold bg-[#0b7e84] hover:bg-[#096a70] text-white"
              >
                <Lock size={16} className="mr-2" />
                Pay ${amount.toFixed(2)}
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <Lock size={10} /> 256-bit TLS · PCI DSS Level 1
              </p>
            </div>

            {/* Container always in DOM even when hidden — SDK needs it mounted */}
            {stage !== "form" && (
              <div id="cko-pay-container" className="hidden" aria-hidden="true" />
            )}
          </div>

          {/* ── Right: Order summary ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Order summary
              </p>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500 capitalize">{TYPE_LABELS[type] || type}</p>
                    {plan && (
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{plan} plan</p>
                    )}
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
                { icon: ShieldCheck, text: "Secured by Checkout.com" },
                { icon: Lock,        text: "256-bit TLS encryption" },
                { icon: CreditCard,  text: "Visa, Mastercard, Amex" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Icon size={15} className="text-[#0b7e84] shrink-0" />
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
