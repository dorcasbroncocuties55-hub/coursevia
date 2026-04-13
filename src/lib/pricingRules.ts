export type LearnerPlanId = "free" | "monthly" | "yearly";

export const VIDEO_PREVIEW_SECONDS = 5;
export const PLATFORM_FEE_RATE = 0.05;
export const MIN_PROVIDER_PRICE = 6;
export const MONTHLY_SUBSCRIPTION_PRICE = 10;
export const YEARLY_SUBSCRIPTION_PRICE = 120;
export const MONTHLY_MEMBER_DISCOUNT_RATE = 0.05;
export const YEARLY_MEMBER_DISCOUNT_RATE = 0.1;

export const pricingPlans = [
  {
    id: "free" as const,
    name: "Starter",
    price: 0,
    periodLabel: "forever",
    featured: false,
    benefits: [
      "Create an account and browse the marketplace",
      "Preview the first 5 seconds of paid videos",
      "Save favourites and compare coaches, creators, and therapists",
      "Public profile browsing and standard support",
    ],
    ruleSummary:
      "Starter does not unlock paid courses, paid videos, or paid bookings. Creators, coaches, and therapists still set their own prices.",
  },
  {
    id: "monthly" as const,
    name: "Learner Plus Monthly",
    price: MONTHLY_SUBSCRIPTION_PRICE,
    periodLabel: "/month",
    featured: true,
    benefits: [
      "Save a payment method for faster checkout",
      "Priority booking support and direct learner messaging",
      "Certificate downloads where the content includes certificates",
      "5% off eligible paid bookings and paid content",
    ],
    ruleSummary:
      "Monthly membership gives platform benefits. Paid content from creators, coaches, and therapists still follows the normal checkout rules.",
  },
  {
    id: "yearly" as const,
    name: "Learner Plus Yearly",
    price: YEARLY_SUBSCRIPTION_PRICE,
    periodLabel: "/year",
    featured: false,
    benefits: [
      "Everything in monthly membership",
      "Longer uninterrupted access for heavy learners",
      "Priority booking support and direct learner messaging",
      "10% off eligible paid bookings and paid content",
    ],
    ruleSummary:
      "Yearly membership keeps the same learner benefits for a longer billing cycle and improves member savings on eligible items.",
  },
];

export const resolveLearnerPlan = (subscription: any): LearnerPlanId => {
  if (!subscription) return "free";
  const status = String(subscription.status || "").toLowerCase();
  if (status !== "active") return "free";

  const rawPlan = String(subscription.plan_code || subscription.plan || "monthly").toLowerCase();
  return rawPlan === "yearly" ? "yearly" : "monthly";
};

export const getMemberDiscountRate = (planId: LearnerPlanId) => {
  if (planId === "yearly") return YEARLY_MEMBER_DISCOUNT_RATE;
  if (planId === "monthly") return MONTHLY_MEMBER_DISCOUNT_RATE;
  return 0;
};

export const roundMoney = (value: number) =>
  Math.max(0, Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100);

export const getDiscountedPrice = (basePrice: number, planId: LearnerPlanId) => {
  const price = Number(basePrice || 0);
  const discountRate = getMemberDiscountRate(planId);
  const discounted = roundMoney(price * (1 - discountRate));

  return {
    originalPrice: roundMoney(price),
    discountRate,
    discountedPrice: discounted,
    savings: roundMoney(price - discounted),
  };
};

export const getBenefitHeadline = (planId: LearnerPlanId) => {
  if (planId === "yearly") {
    return "Yearly member pricing applies: 10% off eligible paid content and bookings.";
  }

  if (planId === "monthly") {
    return "Monthly member pricing applies: 5% off eligible paid content and bookings.";
  }

  return "Starter access lets you browse and preview content before purchase.";
};

export const getPlanButtonLabel = (planId: LearnerPlanId) => {
  if (planId === "yearly") return "Manage yearly plan";
  if (planId === "monthly") return "Manage monthly plan";
  return "Choose plan";
};

export const getAdminShare = (amount: number, paymentType?: string) => {
  const safeAmount = roundMoney(Number(amount || 0));
  if (String(paymentType || "").toLowerCase() === "subscription") {
    return safeAmount;
  }
  return roundMoney(safeAmount * PLATFORM_FEE_RATE);
};

export const getProviderShare = (amount: number, paymentType?: string) => {
  const safeAmount = roundMoney(Number(amount || 0));
  return roundMoney(safeAmount - getAdminShare(safeAmount, paymentType));
};

export const isValidProviderPrice = (amount: number) => roundMoney(amount) >= MIN_PROVIDER_PRICE;
