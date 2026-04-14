import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  cancelLearnerSubscription,
  getCurrentLearnerSubscription,
  getLearnerSubscriptionPlans,
  initializeLearnerSubscription,
  type LearnerSubscriptionPlan,
  type SubscriptionPlanSummary,
} from "@/lib/subscriptionBilling";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { resolveLearnerPlan } from "@/lib/pricingRules";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const FALLBACK_PLANS: SubscriptionPlanSummary[] = [
  {
    code: "monthly",
    name: "Monthly",
    price: 10,
    priceLabel: "$10",
    currency: "USD",
    intervalLabel: "/month",
    benefits: ["5% off bookings & content", "Priority support", "Certificate downloads"],
    featured: true,
  },
  {
    code: "yearly",
    name: "Yearly",
    price: 120,
    priceLabel: "$120",
    currency: "USD",
    intervalLabel: "/year",
    benefits: ["10% off bookings & content", "Everything in monthly", "Best value"],
  },
];

const LearnerSubscription = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPlan = searchParams.get("plan") === "yearly" ? "yearly" : "monthly";

  const [selectedPlan, setSelectedPlan] = useState<LearnerSubscriptionPlan>(requestedPlan);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlanSummary[]>(FALLBACK_PLANS);
  const [subscription, setSubscription] = useState<any>(null);

  const load = async () => {
    if (!user?.id) return;
    setPageLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        getLearnerSubscriptionPlans().catch(() => FALLBACK_PLANS),
        getCurrentLearnerSubscription(user.id).catch(() => null),
      ]);
      if (plansRes?.length) setPlans(plansRes);
      setSubscription(subRes || null);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { setSelectedPlan(requestedPlan); }, [requestedPlan]);
  useEffect(() => { load(); }, [user?.id]);

  const planId = resolveLearnerPlan(subscription);
  const isActive = String(subscription?.status || "").toLowerCase() === "active";
  const currentPlanCode = String(subscription?.plan_code || subscription?.plan || "").toLowerCase();
  const selectedMeta = useMemo(
    () => plans.find(p => p.code === selectedPlan) || plans[0],
    [plans, selectedPlan],
  );

  const subscribe = async () => {
    if (!user?.email) { 
      toast.error("Sign in first."); 
      return; 
    }
    
    console.log("Starting subscription:", { email: user.email, userId: user.id, plan: selectedPlan });
    setLoading(true);
    
    try {
      console.log("Calling initializeLearnerSubscription...");
      const checkout = await initializeLearnerSubscription(user.email, user.id, selectedPlan);
      console.log("Checkout response:", checkout);
      
      const dest = checkout.authorization_url || checkout.redirect_url;
      if (!dest) {
        console.error("No checkout URL in response:", checkout);
        throw new Error("No checkout URL returned from server.");
      }
      
      console.log("Redirecting to:", dest);
      // Stripe returns a full https://checkout.stripe.com/... URL — go there directly
      window.location.href = dest;
    } catch (e: any) {
      console.error("Subscription error:", e);
      const msg = e.message || "";
      if (msg.includes("fetch") || msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ECONNREFUSED")) {
        toast.error("Payment server is waking up. Please wait 30 seconds and try again.");
      } else {
        toast.error(msg || "Subscription failed. Check console for details.");
      }
      setLoading(false);
    }
  };

  const cancel = async () => {
    if (!user) return;
    setCancelling(true);
    try {
      await cancelLearnerSubscription(user.id, subscription?.id);
      toast.success("Subscription cancelled. Access continues until the period ends.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Cancellation failed.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <DashboardLayout role="learner">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
          {pageLoading && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
        </div>

        {/* Current status */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            {isActive
              ? <CheckCircle2 size={20} className="text-emerald-500" />
              : <XCircle size={20} className="text-muted-foreground" />}
            <div>
              <p className="font-semibold text-foreground">
                {isActive ? `${currentPlanCode === "yearly" ? "Yearly" : "Monthly"} plan active` : "No active plan"}
              </p>
              {isActive && subscription?.ends_at && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(subscription.ends_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {isActive && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancel}
                disabled={cancelling}
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                {cancelling ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                Cancel subscription
              </Button>
              <Button variant="outline" size="sm" onClick={load} disabled={pageLoading}>
                <RefreshCw size={14} className="mr-1" /> Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Plan picker */}
        {!isActive && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="font-semibold text-foreground">Choose a plan</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map(plan => (
                <button
                  key={plan.code}
                  onClick={() => { setSelectedPlan(plan.code); setSearchParams({ plan: plan.code }); }}
                  className={`rounded-xl border p-4 text-left transition ${
                    selectedPlan === plan.code
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-foreground">{plan.priceLabel}<span className="text-sm font-normal text-muted-foreground">{plan.intervalLabel}</span></p>
                  <p className="text-sm font-medium text-foreground mt-1">{plan.name}</p>
                  <ul className="mt-2 space-y-1">
                    {plan.benefits.map(b => (
                      <li key={b} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 size={11} className="text-emerald-500 shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <Button onClick={subscribe} disabled={loading} className="w-full">
              {loading
                ? <><Loader2 size={15} className="animate-spin mr-2" /> Opening checkout…</>
                : `Subscribe — ${selectedMeta?.priceLabel}${selectedMeta?.intervalLabel}`}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payments via Stripe · Cancel anytime
            </p>
          </div>
        )}

        {/* Switch plan (if active) */}
        {isActive && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="font-semibold text-foreground">Switch plan</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.filter(p => p.code !== currentPlanCode).map(plan => (
                <button
                  key={plan.code}
                  onClick={() => { setSelectedPlan(plan.code); setSearchParams({ plan: plan.code }); }}
                  className={`rounded-xl border p-4 text-left transition ${
                    selectedPlan === plan.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-foreground">{plan.priceLabel}<span className="text-sm font-normal text-muted-foreground">{plan.intervalLabel}</span></p>
                  <p className="text-sm text-muted-foreground">{plan.name}</p>
                </button>
              ))}
            </div>
            <Button onClick={subscribe} disabled={loading} variant="outline" className="w-full">
              {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
              Switch to {selectedMeta?.name}
            </Button>
          </div>
        )}

        <div className="flex gap-3 text-sm">
          <Link to="/pricing" className="text-primary hover:underline">View pricing page</Link>
          <Link to="/dashboard/payment-methods" className="text-primary hover:underline">Manage payment methods</Link>
        </div>
      </div>

    </DashboardLayout>
  );
};

export default LearnerSubscription;
