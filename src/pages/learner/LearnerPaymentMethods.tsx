/**
 * LearnerPaymentMethods - Manage saved credit/debit cards
 * Features: Add card, set default, delete, Stripe Elements integration
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { 
  listPaymentMethods, 
  savePaymentMethod, 
  setDefaultPaymentMethod, 
  deletePaymentMethod,
  type PaymentMethod 
} from "@/lib/stripeLearnerApi";
import { Loader2, CreditCard, Plus, Star, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

// ── Coursevia brand tokens ────────────────────────────────────────────────────
const A = "#2D9E6B";  // Primary
const D = "#0F3D2E";  // Dark
const B = "#EAE6E2";  // Border
const TS = "#6B7280"; // Text secondary

// ── Card Brand Icons ──────────────────────────────────────────────────────────
const CardBrandIcon = ({ brand }: { brand: string }) => {
  const icons: Record<string, string> = {
    visa: "💳",
    mastercard: "💳",
    amex: "💳",
    discover: "💳",
    diners: "💳",
    jcb: "💳",
    unionpay: "💳",
  };
  
  return (
    <div style={{
      width: 48,
      height: 32,
      borderRadius: 6,
      background: "#F3F4F6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
    }}>
      {icons[brand.toLowerCase()] || "💳"}
    </div>
  );
};

// ── Payment Method Card ───────────────────────────────────────────────────────
const PaymentMethodCard = ({ 
  method, 
  onSetDefault, 
  onDelete, 
  loading 
}: { 
  method: PaymentMethod; 
  onSetDefault: () => void; 
  onDelete: () => void;
  loading: boolean;
}) => (
  <div style={{
    background: "#fff",
    border: `1px solid ${method.is_default ? A : B}`,
    borderRadius: 12,
    padding: 20,
    position: "relative",
    transition: "all 0.2s",
  }}
    onMouseEnter={e => !method.is_default && (e.currentTarget.style.borderColor = A)}
    onMouseLeave={e => !method.is_default && (e.currentTarget.style.borderColor = B)}
  >
    {/* Default Badge */}
    {method.is_default && (
      <div style={{
        position: "absolute",
        top: 12,
        right: 12,
        padding: "4px 10px",
        borderRadius: 6,
        background: `${A}15`,
        border: `1px solid ${A}`,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}>
        <Star size={12} style={{ color: A, fill: A }} />
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 600, color: A }}>
          Default
        </span>
      </div>
    )}

    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
      <CardBrandIcon brand={method.brand || "card"} />
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: "0 0 4px", textTransform: "capitalize" }}>
          {method.brand} •••• {method.last4}
        </p>
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: 0 }}>
          Expires {method.exp_month.toString().padStart(2, "0")}/{method.exp_year}
        </p>
        {method.cardholder_name && (
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: "2px 0 0" }}>
            {method.cardholder_name}
          </p>
        )}
      </div>
    </div>

    {/* Actions */}
    <div style={{ display: "flex", gap: 8 }}>
      {!method.is_default && (
        <button 
          onClick={onSetDefault}
          disabled={loading}
          style={{
            flex: 1,
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px solid ${A}`,
            background: "#fff",
            fontFamily: "Inter,sans-serif",
            fontWeight: 600,
            fontSize: 12,
            color: A,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
          Set as Default
        </button>
      )}
      <button 
        onClick={onDelete}
        disabled={loading}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #FCA5A5",
          background: "#FEF2F2",
          fontFamily: "Inter,sans-serif",
          fontWeight: 600,
          fontSize: 12,
          color: "#991B1B",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        Delete
      </button>
    </div>
  </div>
);

// ── Add Card Modal ────────────────────────────────────────────────────────────
const AddCardModal = ({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void; 
  onSuccess: () => void;
}) => {
  const { user } = useAuth();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [cardholderName, setCardholderName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user?.id) {
      toast.error("Stripe not loaded");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error("Card element not found");
      return;
    }

    setLoading(true);

    try {
      // Create payment method with Stripe
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: cardholderName || undefined,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Save to backend
      await savePaymentMethod(user.id, paymentMethod!.id, setAsDefault);

      toast.success("Card added successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error adding card:", err);
      toast.error(err.message || "Failed to add card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      zIndex: 1000,
    }}
      onClick={onClose}
    >
      <div 
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 20, color: D, margin: "0 0 8px" }}>
          Add Payment Method
        </h2>
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, margin: "0 0 24px" }}>
          Your card details are securely processed by Stripe
        </p>

        <form onSubmit={handleSubmit}>
          {/* Cardholder Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: D, display: "block", marginBottom: 6 }}>
              Cardholder Name
            </label>
            <input 
              type="text"
              value={cardholderName}
              onChange={e => setCardholderName(e.target.value)}
              placeholder="John Doe"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${B}`,
                fontFamily: "Inter,sans-serif",
                fontSize: 14,
                color: D,
                outline: "none",
              }}
            />
          </div>

          {/* Card Element */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: D, display: "block", marginBottom: 6 }}>
              Card Details
            </label>
            <div style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: `1px solid ${B}`,
              background: "#fff",
            }}>
              <CardElement 
                options={{
                  style: {
                    base: {
                      fontSize: "14px",
                      color: D,
                      fontFamily: "Inter, sans-serif",
                      "::placeholder": {
                        color: TS,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Set as Default Checkbox */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input 
                type="checkbox"
                checked={setAsDefault}
                onChange={e => setSetAsDefault(e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: D }}>
                Set as default payment method
              </span>
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                border: `1px solid ${B}`,
                background: "#fff",
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: TS,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading || !stripe}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: A,
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: "#fff",
                cursor: (loading || !stripe) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: (loading || !stripe) ? 0.5 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding Card...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Add Card
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Note */}
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, textAlign: "center", margin: "16px 0 0" }}>
          🔒 Secured by Stripe · PCI-DSS compliant
        </p>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function LearnerPaymentMethods() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchMethods = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const data = await listPaymentMethods(user.id);
      setMethods(data);
    } catch (err: any) {
      console.error("Error fetching payment methods:", err);
      toast.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, [user?.id]);

  const handleSetDefault = async (methodId: string) => {
    if (!user?.id) return;

    setActionLoading(methodId);
    try {
      await setDefaultPaymentMethod(user.id, methodId);
      toast.success("Default payment method updated");
      await fetchMethods();
    } catch (err: any) {
      console.error("Error setting default:", err);
      toast.error(err.message || "Failed to set default");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!user?.id) return;

    if (!confirm("Are you sure you want to delete this payment method?")) {
      return;
    }

    setActionLoading(methodId);
    try {
      await deletePaymentMethod(user.id, methodId);
      toast.success("Payment method deleted");
      await fetchMethods();
    } catch (err: any) {
      console.error("Error deleting payment method:", err);
      toast.error(err.message || "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: "0 0 8px" }}>
              Payment Methods
            </h1>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>
              Manage your saved credit and debit cards
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "none",
              background: A,
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={16} />
            Add Card
          </button>
        </div>

        {/* ── Payment Methods Grid ── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader2 size={40} className="animate-spin" style={{ color: A }} />
          </div>
        ) : methods.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 16, border: `1px solid ${B}` }}>
            <CreditCard size={64} style={{ color: TS, margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 8px" }}>
              No payment methods added
            </h3>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, margin: "0 0 20px" }}>
              Add a credit or debit card to make purchases
            </p>
            <button 
              onClick={() => setShowAddModal(true)}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                border: "none",
                background: A,
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: "#fff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Plus size={16} />
              Add Your First Card
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {methods.map(method => (
              <PaymentMethodCard 
                key={method.id}
                method={method}
                onSetDefault={() => handleSetDefault(method.id)}
                onDelete={() => handleDelete(method.id)}
                loading={actionLoading === method.id}
              />
            ))}
          </div>
        )}

        {/* ── Security Info ── */}
        <div style={{
          marginTop: 40,
          padding: 20,
          background: "#fff",
          border: `1px solid ${B}`,
          borderRadius: 12,
        }}>
          <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 16, color: D, margin: "0 0 12px" }}>
            Your payment information is secure
          </h3>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: "0 0 12px", lineHeight: 1.6 }}>
            All payment data is encrypted and securely processed by Stripe. We never store your full card details on our servers.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: TS }}>
            <span>🔒 256-bit SSL encryption</span>
            <span>✓ PCI-DSS compliant</span>
            <span>✓ 3D Secure supported</span>
          </div>
        </div>
      </div>

      {/* ── Add Card Modal ── */}
      {showAddModal && (
        <AddCardModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchMethods}
        />
      )}
    </div>
  );
}
