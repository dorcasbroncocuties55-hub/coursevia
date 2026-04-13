import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCurrentLearnerSubscription,
  getLearnerSubscriptionPlans,
  type LearnerSubscriptionPlan,
  type SubscriptionPlanSummary,
} from "@/lib/subscriptionBilling";
import { resolveLearnerPlan } from "@/lib/pricingRules";
import { toast } from "sonner";

const fallbackPlans: SubscriptionPlanSummary[] = [
  {
    code: "monthly",
    name: "Learner Plus Monthly",
    price: 10,
    priceLabel: "$10",
    currency: "USD",
    intervalLabel: "/month",
    benefits: [
      "Contact coaches, therapists, and creators",
      "Receive the latest platform alerts",
      "Create playlists and manage saved videos",
      "Download eligible content and leave reviews",
    ],
    featured: true,
  },
  {
    code: "yearly",
    name: "Learner Plus Yearly",
    price: 120,
    priceLabel: "$120",
    currency: "USD",
    intervalLabel: "/year",
    benefits: [
      "Everything in monthly membership",
      "Lower effective annual billing",
      "Best for consistent learning and repeat bookings",
    ],
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlanSummary[]>(fallbackPlans);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [activePlanCode, setActivePlanCode] = useState<string>("free");

  useEffect(() => {
    let active = true;

    getLearnerSubscriptionPlans()
      .then((result) => {
        if (active && result.length) setPlans(result);
      })
      .catch((error: any) => {
        console.error("pricing plans load error", error);
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setActivePlanCode("free");
      setLoadingSubscription(false);
      return () => {
        active = false;
      };
    }

    setLoadingSubscription(true);
    getCurrentLearnerSubscription(user.id)
      .then((subscription) => {
        if (!active) return;
        setActivePlanCode(resolveLearnerPlan(subscription));
      })
      .catch((error: any) => {
        console.error("current subscription load error", error);
        if (active) setActivePlanCode("free");
      })
      .finally(() => {
        if (active) setLoadingSubscription(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const displayPlans = useMemo(
    () => [
      {
        code: "free",
        name: "Starter",
        priceLabel: "Free",
        intervalLabel: "",
        currency: "",
        benefits: [
          "Browse public courses, videos, and provider profiles",
          "Create an account and manage your dashboard",
          "Purchase courses, videos, or sessions individually",
        ],
        cta: user ? "Go to dashboard" : "Get started",
        featured: false,
      },
      ...plans.map((plan) => ({
        ...plan,
        cta: plan.code === activePlanCode ? "Current plan" : plan.code === "yearly" ? "Choose yearly" : "Choose monthly",
      })),
    ],
    [plans, activePlanCode, user]
  );

  const handleSubscriptionClick = (plan: LearnerSubscriptionPlan) => {
    if (!user) {
      navigate(`/dashboard/subscription?plan=${plan}`);
      return;
    }

    if (primaryRole && primaryRole !== "learner") {
      toast.error("Only learner accounts can start learner subscriptions.");
      return;
    }

    navigate(`/dashboard/subscription?plan=${plan}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container-wide section-spacing">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground">Simple pricing for serious learning</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Start free, then upgrade from the pricing page or your learner dashboard. Paid videos, paid courses, and paid sessions still use their own checkout when required.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Prices on Coursevia are displayed in USD. Your final gateway charge follows the secure payment configuration connected to your live backend setup.
          </p>
        </div>

        {(loadingPlans || loadingSubscription) && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading subscription details...
          </div>
        )}

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {displayPlans.map((plan) => {
            const isFreePlan = plan.code === "free";
            const isCurrent = plan.code === activePlanCode;

            return (
              <div
                key={plan.code}
                className={`rounded-lg border p-6 ${plan.featured ? "scale-105 border-primary bg-card shadow-lg" : "border-border bg-card"}`}
              >
                {plan.featured ? (
                  <span className="mb-4 inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Recommended
                  </span>
                ) : null}

                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <div className="mb-6 mt-3">
                  <span className="font-mono text-3xl font-bold text-foreground">{plan.priceLabel}</span>
                  <span className="text-sm text-muted-foreground">{plan.intervalLabel}</span>
                  {!isFreePlan && plan.currency ? (
                    <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Billed in {plan.currency}</p>
                  ) : null}
                </div>

                <ul className="mb-6 space-y-2.5">
                  {plan.benefits.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isFreePlan ? (
                  <Button className="w-full" variant="outline" asChild>
                    <Link to={user ? "/dashboard" : "/signup"}>{plan.cta}</Link>
                  </Button>
                ) : (
                  <Button className="w-full" disabled={isCurrent} onClick={() => handleSubscriptionClick(plan.code as LearnerSubscriptionPlan)}>
                    {isCurrent ? "Current plan" : plan.cta}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Pricing;
