/**
 * StripeContext - Stripe Elements Provider for Learner Payments
 * Wraps the app with Stripe Elements for card payment forms
 */

import { createContext, useContext, ReactNode } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

// Load Stripe publishable key from environment
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);

interface StripeContextValue {
  stripe: Promise<Stripe | null>;
}

const StripeContext = createContext<StripeContextValue>({
  stripe: stripePromise,
});

export const useStripe = () => useContext(StripeContext);

interface StripeProviderProps {
  children: ReactNode;
}

/**
 * StripeProvider - Wraps app with Stripe Elements
 * Usage: Wrap your app or specific routes that need Stripe
 */
export function StripeProvider({ children }: StripeProviderProps) {
  const options = {
    // Global appearance settings for Stripe Elements
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#2D9E6B",
        colorBackground: "#ffffff",
        colorText: "#0F3D2E",
        colorDanger: "#ef4444",
        fontFamily: "Inter, system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "8px",
      },
    },
  };

  return (
    <StripeContext.Provider value={{ stripe: stripePromise }}>
      <Elements stripe={stripePromise} options={options}>
        {children}
      </Elements>
    </StripeContext.Provider>
  );
}
