import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart } = useCart();
  const [loading, setLoading] = useState(false);

  const totalAmount = useMemo(
    () => cart.reduce((sum: number, item: any) => sum + Number(item.price || 0), 0),
    [cart]
  );

  const handleCheckout = async () => {
    if (!user?.id || !user?.email) { toast.error("Please log in first."); return; }
    if (!cart.length) { toast.error("Your cart is empty."); return; }

    setLoading(true);
    try {
      const firstItem = cart[0];
      // Redirect to internal payment page — no external processor
      const params = new URLSearchParams({
        type:       "course",
        amount:     String(totalAmount),
        title:      firstItem?.title || "Course purchase",
        content_id: firstItem?.id    || "",
        redirect:   "/dashboard/courses",
      });
      navigate(`/pay?${params.toString()}`);
    } catch (err: any) {
      toast.error(err?.message || "Checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
          <p className="mt-2 text-muted-foreground">Review your order and complete payment securely.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          {/* Items */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">Order items</h2>
            <div className="mt-5 space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              ) : (
                cart.map((item: any, i: number) => (
                  <div key={item.id || i}
                    className="flex items-center justify-between rounded-2xl border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{item.title || item.name || "Untitled item"}</p>
                      <p className="text-sm text-muted-foreground">{item.category || item.type || "Course"}</p>
                    </div>
                    <p className="font-semibold text-foreground">${Number(item.price || 0).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">Order summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="text-foreground">{cart.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <Button className="mt-6 w-full" onClick={handleCheckout}
              disabled={loading || cart.length === 0}>
              {loading ? "Redirecting…" : "Proceed to payment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
