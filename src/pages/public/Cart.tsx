import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getCartItems, removeCartItem, clearCart, type CartItem } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { ShoppingCart, Trash2, Video, Lock, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { initializeCheckout } from "@/lib/paymentGateway";

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setItems(getCartItems());
  }, []);

  const handleRemove = (id: string, type: CartItem["type"]) => {
    const updated = removeCartItem(id, type);
    setItems(updated);
    toast.success("Removed from cart");
  };

  const handleCheckout = async () => {
    if (!user?.id || !user.email) {
      toast.error("Please sign in to checkout");
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setProcessing(true);

    try {
      // For now, checkout first item (you can extend this to handle multiple items)
      const item = items[0];
      
      const checkout = await initializeCheckout({
        email: user.email,
        user_id: user.id,
        type: item.type,
        amount: item.price,
        content_id: item.id,
        content_title: item.title,
      });

      const url = checkout.authorization_url || checkout.redirect_url;
      if (!url) throw new Error("No payment URL returned.");

      // Clear cart on successful checkout initiation
      clearCart();
      
      // Redirect to payment
      window.location.href = url;
    } catch (error: any) {
      toast.error(error?.message || "Unable to start checkout.");
      setProcessing(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container-wide section-spacing">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ShoppingCart size={32} />
              Shopping Cart
            </h1>
            <p className="text-muted-foreground mt-2">
              {items.length === 0 ? "Your cart is empty" : `${items.length} item${items.length > 1 ? "s" : ""} in your cart`}
            </p>
          </div>

          {items.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShoppingCart size={28} className="text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground mb-6">
                  Browse videos and add them to your cart to get started
                </p>
                <Button onClick={() => navigate("/courses")}>
                  Browse Courses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-[1fr_400px] gap-6">
              {/* Cart Items */}
              <div className="space-y-4">
                {items.map((item) => (
                  <Card key={`${item.type}-${item.id}`}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        <div className="w-32 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Video size={24} className="text-muted-foreground" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground line-clamp-2">
                                {item.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 capitalize">
                                {item.type}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xl font-bold text-foreground">
                                ${item.price.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemove(item.id, item.type)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={14} className="mr-1" />
                              Remove
                            </Button>
                            {item.slug && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/video/${item.slug}`)}
                              >
                                View Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:sticky lg:top-24 h-fit">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-foreground mb-4">
                        Order Summary
                      </h2>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">${total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="font-medium">$0.00</span>
                        </div>
                        <div className="border-t pt-3 flex justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="text-2xl font-bold text-foreground">
                            ${total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={handleCheckout}
                        disabled={processing || items.length === 0}
                        className="w-full h-12 text-base font-semibold"
                      >
                        {processing ? (
                          "Processing..."
                        ) : (
                          <>
                            <Lock size={16} className="mr-2" />
                            Proceed to Checkout
                            <ArrowRight size={16} className="ml-2" />
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => navigate("/courses")}
                        className="w-full"
                      >
                        Continue Shopping
                      </Button>
                    </div>

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start gap-2">
                        <Lock size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-emerald-800">
                            Secure Checkout
                          </p>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Your payment information is encrypted and secure
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
