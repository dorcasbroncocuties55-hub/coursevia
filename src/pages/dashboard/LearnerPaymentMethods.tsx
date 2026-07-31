import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Trash2, Star, Plus, Loader2, ShieldCheck, X } from "lucide-react";
import { PageLoading } from "@/components/LoadingSpinner";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

declare global { interface Window { Stripe: any } }

const brandColor: Record<string, string> = {
  visa: "text-blue-600",
  mastercard: "text-red-500",
  amex: "text-green-600",
  unknown: "text-slate-500",
};

const LearnerPaymentMethods = () => {
  const { user, loading: authLoading } = useAuth();
  const [methods, setMethods]           = useState<any[]>([]);
  const [adding, setAdding]             = useState(false);
  const [saving, setSaving]             = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [settingId, setSettingId]       = useState<string | null>(null);
  const [tableError, setTableError]     = useState<string | null>(null);
  const [sdkReady, setSdkReady]         = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError]       = useState("");

  const stripeRef  = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const cardRef    = useRef<any>(null);
  const mountedRef = useRef(false);

  // ── Load Stripe SDK ──────────────────────────────────────────────────────
  useEffect(() => {
    if (window.Stripe) { setSdkReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => setSdkReady(true);
    document.head.appendChild(script);
  }, []);

  // ── Mount card element when form opens ──────────────────────────────────
  useEffect(() => {
    if (!adding || !sdkReady || mountedRef.current) return;
    if (!STRIPE_PK) { toast.error("Stripe not configured."); return; }

    // Stripe live keys require HTTPS - skip on HTTP
    const isHttps = window.location.protocol === "https:";
    if (!isHttps && STRIPE_PK.startsWith("pk_live_")) {
      toast.error("Live payments require HTTPS. Please access the app via HTTPS.");
      setAdding(false);
      return;
    }

    try {
      const stripe = window.Stripe(STRIPE_PK);
      stripeRef.current = stripe;
      const elements = stripe.elements();
      elementsRef.current = elements;

      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "15px",
            color: "#111827",
            fontFamily: "system-ui, sans-serif",
            "::placeholder": { color: "#9ca3af" },
          },
          invalid: { color: "#dc2626" },
        },
        hidePostalCode: true,
      });

      cardRef.current = card;
      card.mount("#stripe-card-element");
      mountedRef.current = true;

      card.on("change", (e: any) => {
        setCardComplete(e.complete);
        setCardError(e.error?.message || "");
      });

      return () => {
        card.unmount();
        mountedRef.current = false;
      };
    } catch (err: any) {
      toast.error(err.message || "Could not load card form.");
      setAdding(false);
    }
  }, [adding, sdkReady]);

  // ── Load saved methods ───────────────────────────────────────────────────
  const load = async () => {
    if (!user) {
      setMethods([]);
      return;
    }
    const { data, error } = await supabase
      .from("payment_methods" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) setTableError(error.message);
    else { setTableError(null); setMethods(data || []); }
  };

  useEffect(() => { load(); }, [user]);

  // ── Save card via Stripe ─────────────────────────────────────────────────
  const save = async () => {
    if (!user || !stripeRef.current || !cardRef.current) return;
    if (!cardComplete) { toast.error("Please complete your card details."); return; }

    setSaving(true);
    try {
      // Create payment method token via Stripe.js
      const { paymentMethod, error } = await stripeRef.current.createPaymentMethod({
        type: "card",
        card: cardRef.current,
      });

      if (error) throw new Error(error.message);

      const pm = paymentMethod;
      const card = pm.card;

      // Save to Supabase (store Stripe PM ID, never raw card data)
      const { error: dbError } = await supabase.from("payment_methods" as any).insert({
        user_id: user.id,
        provider: "stripe",
        method_type: "card",
        stripe_payment_method_id: pm.id,
        brand: card.brand,
        last4: card.last4,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        cardholder_name: pm.billing_details?.name || "",
        is_default: methods.length === 0,
      });

      if (dbError) throw dbError;

      toast.success("Card saved successfully!");
      setAdding(false);
      mountedRef.current = false;
      setCardComplete(false);
      setCardError("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Could not save card.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this card?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("payment_methods" as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
      toast.success("Card removed.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Could not remove card.");
    } finally {
      setDeletingId(null);
    }
  };

  const setDefault = async (id: string) => {
    setSettingId(id);
    try {
      await supabase.from("payment_methods" as any)
        .update({ is_default: false })
        .eq("user_id", user!.id);
      const { error } = await supabase.from("payment_methods" as any)
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
      toast.success("Default card updated.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Could not update default.");
    } finally {
      setSettingId(null);
    }
  };

  const handleCancel = () => {
    setAdding(false);
    mountedRef.current = false;
    setCardComplete(false);
    setCardError("");
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout role="learner">
      <div className="max-w-xl space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment Methods</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Saved cards for quick checkout</p>
          </div>
          {!adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus size={15} className="mr-1" /> Add card
            </Button>
          )}
        </div>

        {tableError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Database setup required</p>
            <p className="text-xs">Run <code className="bg-amber-100 px-1 rounded">SIMPLE_FIX_PAYMENT_METHODS.sql</code> in Supabase SQL editor.</p>
          </div>
        )}

        {/* ── Add card form ── */}
        {adding && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard size={16} /> New card
              </p>
              <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {window.location.protocol !== "https:" && STRIPE_PK.startsWith("pk_live_") ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">HTTPS required for live payments</p>
                <p className="text-xs">
                  Stripe live keys only work over HTTPS. To save cards locally, use Stripe test keys
                  (<code className="bg-amber-100 px-1 rounded">pk_test_...</code>) in your <code className="bg-amber-100 px-1 rounded">.env</code> file.
                  <br /><br />
                  Get test keys at: <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noreferrer" className="underline font-medium">dashboard.stripe.com/test/apikeys</a>
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={handleCancel}>Close</Button>
              </div>
            ) : !sdkReady ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 size={14} className="animate-spin" /> Loading secure card form…
              </div>
            ) : (
              <>
                {/* Stripe Card Element — handles number, expiry AND CVV */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Card number, expiry & CVV
                  </label>
                  <div
                    id="stripe-card-element"
                    className="rounded-xl border border-input bg-background px-4 py-3.5 min-h-[46px] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all"
                  />
                  {cardError && (
                    <p className="text-xs text-destructive mt-1">{cardError}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your card number, expiry date, and CVV
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700">
                    Card details are encrypted by Stripe. We never see your full card number or CVV.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={save}
                    disabled={saving || !cardComplete}
                    className="flex-1"
                  >
                    {saving
                      ? <><Loader2 size={14} className="animate-spin mr-1" /> Saving…</>
                      : "Save card"
                    }
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Saved cards ── */}
        {methods.length === 0 && !adding ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <CreditCard size={20} className="text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">No saved cards yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add a card for quick and secure checkout</p>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus size={14} className="mr-1" /> Add your first card
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map(m => (
              <div
                key={m.id}
                className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                  m.is_default ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                    <CreditCard size={18} className={brandColor[m.brand] || "text-slate-500"} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm capitalize">
                      {m.brand} •••• {m.last4}
                      {m.is_default && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.cardholder_name && `${m.cardholder_name} · `}
                      Expires {String(m.exp_month).padStart(2, "0")}/{m.exp_year}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!m.is_default && (
                    <button
                      onClick={() => setDefault(m.id)}
                      disabled={settingId === m.id}
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                      title="Set as default"
                    >
                      {settingId === m.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Star size={14} />}
                    </button>
                  )}
                  <button
                    onClick={() => remove(m.id)}
                    disabled={deletingId === m.id}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive transition"
                    title="Remove card"
                  >
                    {deletingId === m.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Your default card is used automatically at checkout.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default LearnerPaymentMethods;
