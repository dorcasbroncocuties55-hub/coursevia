import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Trash2, Star, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentMethod {
  id: string;
  last4?: string;
  card_last4?: string;
  brand?: string;
  card_brand?: string;
  exp_month?: number;
  card_exp_month?: number;
  exp_year?: number;
  card_exp_year?: number;
  is_default: boolean;
  created_at: string;
}

export default function PaymentMethods() {
  const { user , loading: authLoading } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, [user]);

  const loadPaymentMethods = async () => {
        setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMethods(data || []);
    } catch (error: any) {
      console.error("Error loading payment methods:", error);
      toast.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
        setAdding(true);
    try {
      // Redirect to Checkout.com to add card
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/checkout/add-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
        }),
      });

      const data = await response.json();
      
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        throw new Error("No redirect URL returned");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add card");
      setAdding(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
        try {
      const { error } = await supabase.rpc("set_default_payment_method", {
        p_user_id: user.id,
        p_method_id: methodId,
      });

      if (error) throw error;
      
      toast.success("Default payment method updated");
      await loadPaymentMethods();
    } catch (error: any) {
      toast.error(error.message || "Failed to update default payment method");
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm("Remove this payment method?")) return;
    
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", methodId)
        .eq("user_id", user?.id);

      if (error) throw error;
      
      toast.success("Payment method removed");
      await loadPaymentMethods();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove payment method");
    }
  };

  const getCardIcon = (brand: string) => {
    const brandLower = (brand || "").toLowerCase();
    if (brandLower.includes("visa")) return "💳";
    if (brandLower.includes("mastercard")) return "💳";
    if (brandLower.includes("amex")) return "💳";
    return "💳";
  };

  const getCardBrand = (method: PaymentMethod) => method.card_brand || method.brand || "Card";
  const getCardLast4 = (method: PaymentMethod) => method.card_last4 || method.last4 || "****";
  const getExpMonth = (method: PaymentMethod) => method.card_exp_month || method.exp_month || 0;
  const getExpYear = (method: PaymentMethod) => method.card_exp_year || method.exp_year || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Methods</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your saved cards for quick checkout
          </p>
        </div>
        <Button onClick={handleAddCard} disabled={adding}>
          {adding ? (
            <>
              <Loader2 size={14} className="animate-spin mr-2" />
              Adding...
            </>
          ) : (
            <>
              <Plus size={14} className="mr-2" />
              Add Card
            </>
          )}
        </Button>
      </div>

      {methods.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CreditCard size={28} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No saved cards</h3>
            <p className="text-muted-foreground mb-6">
              Add a card for quick and secure checkout
            </p>
            <Button onClick={handleAddCard} disabled={adding}>
              <Plus size={14} className="mr-2" />
              Add Your First Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {methods.map((method) => (
            <Card key={method.id} className={method.is_default ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{getCardIcon(getCardBrand(method))}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground capitalize">
                          {getCardBrand(method)}
                        </p>
                        <span className="text-muted-foreground">••••</span>
                        <span className="font-mono font-semibold">{getCardLast4(method)}</span>
                        {method.is_default && (
                          <Badge className="ml-2">
                            <Star size={10} className="mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Expires {String(getExpMonth(method)).padStart(2, "0")}/{getExpYear(method)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!method.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(method.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Secure & Encrypted</h4>
              <p className="text-sm text-blue-800">
                Your card details are encrypted and stored securely by Checkout.com. 
                We never see or store your full card number.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

