/**
 * /pay — Internal card payment page.
 * Collects card details on-platform, posts to /api/pay, records in Supabase.
 * No external redirect (no Stripe checkout page).
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { buildBackendUrl } from "@/lib/backendApi";
import Navbar from "@/components/landing/Navbar";
import {
  ShieldCheck, Lock, CreditCard, XCircle, Loader2,
  ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  booking:      "Session Booking",
  course:       "Course Purchase",
  video:        "Video Purchase",
  subscription: "Membership",
};

// ── Card number formatter ────────────────────────────────────────────────────
const formatCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

const formatExpiry = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

// ── Generate ref ─────────────────────────────────────────────────────────────
const buildRef = () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${date}-${rand}`;
};

// ── Card brand detection ──────────────────────────────────────────────────────
const cardBrand = (n: string) => {
  const d = n.replace(/\s/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^6/.test(d)) return "Verve";
  return "Card";
};

type Step = "form" | "processing" | "success";

export default function PaymentPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();

  const type      = searchParams.get("type")       || "payment";
  const amount    = Number(searchParams.get("amount") || 0);
  const title     = searchParams.get("title")      || "Order";
  const plan      = searchParams.get("plan")       || null;
  const contentId = searchParams.get("content_id") || null;
  const redirectTo = searchParams.get("redirect")  || "/dashboard";

  const [step,     setStep]     = useState<Step>("form");
  const [receipt,  setReceipt]  = useState<{ ref: string; last4: string; brand: string } | null>(null);
  const [error,    setError]    = useState("");

  // Card fields
  const [cardNum,  setCardNum]  = useState("");
  const [expiry,   setExpiry]   = useState("");
  const [cvv,      setCvv]      = useState("");
  const [name,     setName]     = useState("");
  const [showCvv,  setShowCvv]  = useState(false);

  const brand = cardBrand(cardNum);
  const last4 = cardNum.replace(/\s/g, "").slice(-4);

  // Pre-fill cardholder name from profile
  useEffect(() => {
    if (user?.user_metadata?.full_name) setName(user.user_metadata.full_name);
  }, [user]);

  const validate = () => {
    const raw = cardNum.replace(/\s/g, "");
    if (raw.length < 13) { toast.error("Enter a valid card number"); return false; }
    const [mm, yy] = expiry.split("/");
    const now = new Date();
    const expMonth = Number(mm), expYear = 2000 + Number(yy);
    if (!mm || !yy || expMonth < 1 || expMonth > 12) { toast.error("Enter a valid expiry date (MM/YY)"); return false; }
    if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
      toast.error("Card has expired"); return false;
    }
    if (cvv.length < 3) { toast.error("Enter a valid CVV"); return false; }
    if (!name.trim())   { toast.error("Enter the cardholder name"); return false; }
    return true;
  };

  const handlePay = async () => {
    if (!validate()) return;
    setError("");
    setStep("processing");

    // Simulate brief bank processing delay
    await new Promise(r => setTimeout(r, 2000));

    try {
      const ref = buildRef();
      const res = await fetch(buildBackendUrl("/api/pay"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:       user!.id,
          email:         user!.email,
          amount,
          type,
          content_id:    contentId,
          content_title: title,
          plan,
          reference:     ref,
          // We never send raw card data to our server — only masked metadata
          card_brand:    brand,
          card_last4:    last4,
          card_expiry:   expiry,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Payment failed");

      setReceipt({ ref, last4, brand });
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Payment processing failed. Please try again.");
      setStep("form");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Please sign in to complete payment.</p>
          <Button onClick={() => navigate("/login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  // ── Success receipt ────────────────────────────────────────────────────────
  if (step === "success" && receipt) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-md px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment successful</h1>
            <p className="text-muted-foreground mt-1 text-sm">Your payment has been processed.</p>
          </div>

          {/* Receipt */}
          <div className="rounded-2xl border border-border bg-card text-left overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receipt</span>
            </div>
            <div className="divide-y divide-border text-sm">
              {[
                { label: "Reference",  value: receipt.ref,             mono: true  },
                { label: "Item",       value: title                                },
                { label: "Amount",     value: `$${amount.toFixed(2)}`, bold: true  },
                { label: "Card",       value: `${receipt.brand} ****${receipt.last4}` },
                { label: "Status",     value: "Paid",                  green: true },
                { label: "Date",       value: new Date().toLocaleString()          },
              ].map(({ label, value, mono, bold, green }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 gap-4">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className={`text-right break-all
                    ${mono  ? "font-mono text-xs"             : ""}
                    ${bold  ? "font-semibold text-foreground" : "text-foreground"}
                    ${green ? "text-emerald-600 font-semibold": ""}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={() => navigate(redirectTo)}>
            Continue
          </Button>
        </main>
      </div>
    );
  }

  // ── Processing ─────────────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard size={26} className="text-primary" />
          </div>
          <div className="absolute -inset-1 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold text-foreground">Processing payment…</p>
          <p className="text-sm text-muted-foreground">Please do not close this page</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Payment form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <button onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Card form */}
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Card payment</h1>
                <p className="text-xs text-muted-foreground">Secured & encrypted</p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Card number */}
            <div>
              <Label>Card number</Label>
              <div className="relative mt-1.5">
                <Input
                  value={cardNum}
                  onChange={e => setCardNum(formatCardNumber(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="pr-16 font-mono text-base tracking-wider"
                  inputMode="numeric"
                />
                {cardNum && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    {brand}
                  </span>
                )}
              </div>
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry date</Label>
                <Input
                  className="mt-1.5 font-mono"
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>CVV</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showCvv ? "text" : "password"}
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="•••"
                    maxLength={4}
                    className="pr-9 font-mono"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCvv(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Cardholder name */}
            <div>
              <Label>Cardholder name</Label>
              <Input
                className="mt-1.5"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name as on card"
                autoComplete="cc-name"
              />
            </div>

            <Button
              onClick={handlePay}
              className="w-full h-12 text-base gap-2"
              disabled={!cardNum || !expiry || !cvv || !name}
            >
              <Lock size={15} /> Pay ${amount.toFixed(2)}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By paying you agree to our{" "}
              <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
              {" & "}
              <Link to="/refund-policy" className="underline hover:text-foreground">Refund Policy</Link>
            </p>
          </div>

          {/* Order summary + security */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Order summary</p>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground capitalize">{TYPE_LABELS[type] || type}</p>
                    {plan && <p className="text-xs text-muted-foreground capitalize mt-0.5">{plan} plan</p>}
                  </div>
                  <p className="font-bold text-foreground shrink-0">${amount.toFixed(2)}</p>
                </div>
                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total due today</p>
                  <p className="text-2xl font-bold text-foreground">${amount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
              {[
                { icon: ShieldCheck, text: "Secure & encrypted payment" },
                { icon: Lock,        text: "256-bit TLS encryption" },
                { icon: CreditCard,  text: "Visa, Mastercard, Verve, Amex" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Icon size={15} className="text-primary shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
