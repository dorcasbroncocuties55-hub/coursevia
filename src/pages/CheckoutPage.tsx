import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Wallet } from "lucide-react";
import WalletCheckoutModal from "@/components/WalletCheckoutModal";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const [showWallet, setShowWallet] = useState(false);

  const totalAmount = useMemo(
    () => cart.reduce((sum: number, item: any) => sum + Number(item.price || 0), 0),
    [cart]
  );

  // Build a combined title for multi-item carts
  const orderTitle = useMemo(() => {
    if (cart.length === 0) return "Order";
    if (cart.length === 1) return cart[0]?.title || "Order";
    return `${cart.length} items`;
  }, [cart]);

  // For the wallet endpoint we need a single content_id.
  // Multi-item carts: pass null and handle access grants per-item via the
  // wallet pay endpoint's content_items lookup (best-effort on backend).
  // For now we send the first item's id so the backend can at least resolve
  // the provider split — a full multi-item wallet checkout is a future improvement.
  const primaryItem = cart[0];

  const handleWalletSuccess = (ref: string) => {
    clearCart();
    toast.success("Payment complete! Your content is now accessible.");
    navigate("/dashboard/courses");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

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
                      <p className="text-sm text-muted-foreground capitalize">{item.category || item.type || "Course"}</p>
                    </div>
                    <p className="font-semibold text-foreground">${Number(item.price || 0).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-xl font-semibold text-foreground">Order summary</h2>
            <div className="space-y-3 text-sm">
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

            {/* Wallet pay — primary path */}
            <Button
              className="w-full gap-2"
              disabled={cart.length === 0}
              onClick={() => setShowWallet(true)}
            >
              <Wallet size={16} />
              Pay with Wallet
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Funds are deducted from your Coursevia wallet balance.{" "}
              <a href="/dashboard/wallet" className="text-primary hover:underline">
                Top up wallet
              </a>
            </p>
          </div>
        </div>
      </div>

      {showWallet && (
        <WalletCheckoutModal
          contentType={(primaryItem?.type as any) || "course"}
          contentId={primaryItem?.id || null}
          contentTitle={orderTitle}
          amount={totalAmount}
          onClose={() => setShowWallet(false)}
          onSuccess={handleWalletSuccess}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
