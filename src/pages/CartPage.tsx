import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageLoading } from "@/components/LoadingSpinner";`nimport Navbar from "@/components/landing/Navbar";
import { PageLoading } from "@/components/LoadingSpinner";`nimport Footer from "@/components/landing/Footer";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { Button } from "@/components/ui/button";
import { getCartItems, removeCartItem, type CartItem } from "@/lib/cart";
import { getDiscountedPrice, getBenefitHeadline, resolveLearnerPlan } from "@/lib/pricingRules";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CartPage = () => {
  const navigate = useNavigate();
  const { user , loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    setItems(getCartItems());
  }, []);

  useEffect(() => {
    const loadSubscription = async () => {
            const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .maybeSingle();
      setSubscription(data || null);
    };

    loadSubscription();
  }, [user]);

  const planId = resolveLearnerPlan(subscription);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => sum + getDiscountedPrice(item.price, planId).discountedPrice, 0),
    [items, planId]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container-wide section-spacing">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Your Cart</h1>
              <p className="text-sm text-muted-foreground mt-2">
                {getBenefitHeadline(planId)}
              </p>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 space-y-4">
                <p className="text-muted-foreground">Your cart is empty.</p>
                <Button asChild>
                  <Link to="/courses">Browse content</Link>
                </Button>
              </div>
            ) : (
              items.map((item) => {
                const pricing = getDiscountedPrice(item.price, planId);

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="rounded-2xl border border-border bg-card p-5 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        {item.type}
                      </p>
                      <h2 className="font-semibold text-foreground">{item.title}</h2>
                      <div className="text-sm text-muted-foreground mt-2">
                        {pricing.savings > 0 ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="line-through">${pricing.originalPrice.toFixed(2)}</span>
                            <span className="text-foreground font-medium">
                              ${pricing.discountedPrice.toFixed(2)}
                            </span>
                            <span className="text-green-600">Save ${pricing.savings.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span>${pricing.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setItems(removeCartItem(item.id, item.type))}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <aside className="rounded-2xl border border-border bg-card p-6 h-fit sticky top-24 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="text-foreground">{items.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="text-foreground capitalize">{planId}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold pt-2 border-t border-border">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Prices are still set by each creator, coach, or therapist. Membership only adds the benefits shown on the pricing page.
            </p>

            <Button
              className="w-full"
              disabled={items.length === 0}
              onClick={() => navigate("/checkout")}
            >
              Continue to Checkout
            </Button>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CartPage;

