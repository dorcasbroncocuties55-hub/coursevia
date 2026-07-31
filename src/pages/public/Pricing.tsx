import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Check, Sparkles, Zap, Crown, ArrowRight, Shield, Clock, Users } from "lucide-react";
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
    name: "Plus",
    price: 10,
    priceLabel: "$10",
    currency: "USD",
    intervalLabel: "/month",
    benefits: [
      "Contact coaches & therapists",
      "Latest platform alerts",
      "Create playlists",
      "Download content",
      "Leave reviews",
    ],
    featured: true,
  },
  {
    code: "yearly",
    name: "Plus Annual",
    price: 120,
    priceLabel: "$120",
    currency: "USD",
    intervalLabel: "/year",
    benefits: [
      "All monthly features",
      "Save $24 per year",
      "Priority support",
      "Early access to features",
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
          "Browse courses & videos",
          "Create account",
          "Purchase individually",
        ],
        cta: user ? "Current plan" : "Get started",
        featured: false,
        icon: Sparkles,
      },
      ...plans.map((plan) => ({
        ...plan,
        cta: plan.code === activePlanCode ? "Current plan" : plan.code === "yearly" ? "Choose annual" : "Choose monthly",
        icon: plan.code === "yearly" ? Crown : Zap,
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
      toast.error("Only learner accounts can subscribe.");
      return;
    }

    navigate(`/dashboard/subscription?plan=${plan}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 lg:py-28">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="absolute right-0 top-0 h-96 w-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute left-0 bottom-0 h-96 w-96 bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="container-wide relative">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2">
              <Sparkles size={16} className="text-primary" />
              <span className="text-sm font-semibold text-slate-700">Simple, transparent pricing</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Invest in your{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                future
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Start free and upgrade anytime. Get unlimited access to premium features and accelerate your learning journey.
            </p>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                <span>Secure payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-primary" />
                <span>Join 1000+ learners</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container-wide pb-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {displayPlans.map((plan, index) => {
            const isFreePlan = plan.code === "free";
            const isCurrent = plan.code === activePlanCode;
            const Icon = plan.icon || Sparkles;

            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-3xl border p-8 transition-all duration-300 ${
                  plan.featured
                    ? "scale-105 border-primary bg-white shadow-2xl shadow-primary/10 ring-2 ring-primary/20"
                    : "border-slate-200 bg-white shadow-lg hover:shadow-xl hover:-translate-y-1"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Popular badge */}
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${
                  plan.featured ? "bg-primary/10" : "bg-slate-100"
                }`}>
                  <Icon size={28} className={plan.featured ? "text-primary" : "text-slate-600"} />
                </div>

                {/* Plan name */}
                <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>

                {/* Price */}
                <div className="mt-4 mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-slate-900">{plan.priceLabel}</span>
                    {plan.intervalLabel && (
                      <span className="text-lg text-slate-500">{plan.intervalLabel}</span>
                    )}
                  </div>
                  {!isFreePlan && plan.currency && (
                    <p className="mt-2 text-sm text-slate-500">Billed in {plan.currency}</p>
                  )}
                </div>

                {/* CTA Button */}
                {isFreePlan ? (
                  <Button 
                    className={`w-full mb-6 ${plan.featured ? "" : "bg-slate-900 hover:bg-slate-800"}`}
                    size="lg"
                    asChild
                  >
                    <Link to={user ? "/dashboard" : "/signup"} className="flex items-center justify-center gap-2">
                      {plan.cta} <ArrowRight size={16} />
                    </Link>
                  </Button>
                ) : (
                  <Button 
                    className={`w-full mb-6 ${plan.featured ? "" : "bg-slate-900 hover:bg-slate-800"}`}
                    size="lg"
                    disabled={isCurrent}
                    onClick={() => handleSubscriptionClick(plan.code as LearnerSubscriptionPlan)}
                  >
                    {isCurrent ? (
                      <span className="flex items-center gap-2">
                        <Check size={16} /> Current plan
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {plan.cta} <ArrowRight size={16} />
                      </span>
                    )}
                  </Button>
                )}

                {/* Features */}
                <div className="flex-1">
                  <p className="mb-4 text-sm font-semibold text-slate-900">What's included:</p>
                  <ul className="space-y-3">
                    {plan.benefits.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          plan.featured ? "bg-primary/10" : "bg-slate-100"
                        }`}>
                          <Check size={12} className={plan.featured ? "text-primary" : "text-slate-600"} />
                        </div>
                        <span className="text-sm leading-relaxed text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional info */}
        <div className="mx-auto mt-12 max-w-3xl text-center">
          <p className="text-sm text-slate-500">
            All prices in USD. Paid courses, videos, and sessions use separate checkout. 
            <Link to="/faq" className="ml-1 font-medium text-primary hover:underline">
              Learn more
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-slate-200 bg-slate-50 px-4 py-20">
        <div className="container-wide">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="mb-2 font-semibold text-slate-900">Can I cancel anytime?</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  Yes! You can cancel your subscription at any time from your dashboard. 
                  You'll continue to have access until the end of your billing period.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="mb-2 font-semibold text-slate-900">What payment methods do you accept?</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  We accept all major credit cards, debit cards, and digital payment methods 
                  through our secure payment gateway.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="mb-2 font-semibold text-slate-900">Do I need a subscription to use Coursevia?</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  No! You can use Coursevia for free and purchase courses, videos, or sessions 
                  individually. A subscription gives you additional features and benefits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-200 bg-gradient-to-br from-primary to-primary/80 px-4 py-20">
        <div className="container-wide text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to start learning?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            Join thousands of learners already growing their skills on Coursevia.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-white text-primary hover:bg-slate-50">
              <Link to="/signup" className="flex items-center gap-2">
                Get started free <ArrowRight size={18} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              <Link to="/courses">Browse courses</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
