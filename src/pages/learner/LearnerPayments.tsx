/**
 * LearnerPayments - Transaction history and receipts
 * Features: Table view, filters, payment status, receipts
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAsync } from "@/lib/portalEngine";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Search, Filter, CreditCard, Calendar } from "lucide-react";

// ── Coursevia brand tokens ────────────────────────────────────────────────────
const A = "#2D9E6B";  // Primary
const D = "#0F3D2E";  // Dark
const B = "#EAE6E2";  // Border
const TS = "#6B7280"; // Text secondary

// ── Types ─────────────────────────────────────────────────────────────────────
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  description: string | null;
  created_at: string;
  metadata: any;
  stripe_payment_intent_id: string | null;
}

// ── Data Hook ─────────────────────────────────────────────────────────────────
function usePaymentHistory(userId: string | undefined) {
  return useAsync<Payment[]>(async () => {
    if (!userId) return [];

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return payments || [];
  }, [userId]);
}

// ── Components ────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    completed: { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D" },
    pending: { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E" },
    failed: { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
    refunded: { bg: "#EFF6FF", border: "#93C5FD", text: "#1E40AF" },
  };

  const style = styles[status] || styles.pending;

  return (
    <span style={{
      padding: "4px 10px",
      borderRadius: 6,
      background: style.bg,
      border: `1px solid ${style.border}`,
      fontFamily: "Inter,sans-serif",
      fontSize: 11,
      fontWeight: 600,
      color: style.text,
      textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
};

const PaymentRow = ({ payment }: { payment: Payment }) => {
  const date = new Date(payment.created_at);
  
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr auto",
      gap: 16,
      padding: 16,
      borderBottom: `1px solid ${B}`,
      alignItems: "center",
    }}>
      {/* Date & Description */}
      <div>
        <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: "0 0 4px" }}>
          {payment.description || "Payment"}
        </p>
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: 0 }}>
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Payment Method */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CreditCard size={16} style={{ color: TS }} />
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, textTransform: "capitalize" }}>
          {payment.payment_method_brand || "Card"} {payment.payment_method_last4 && `••${payment.payment_method_last4}`}
        </span>
      </div>

      {/* Amount */}
      <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 14, color: D, margin: 0 }}>
        ${payment.amount.toFixed(2)}
      </p>

      {/* Status */}
      <div>
        <StatusBadge status={payment.status} />
      </div>

      {/* Type */}
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS }}>
        {payment.metadata?.type === "course_purchase" ? "Course" :
         payment.metadata?.type === "session_booking" ? "Session" :
         payment.metadata?.type === "subscription" ? "Subscription" :
         "Payment"}
      </span>

      {/* Receipt */}
      <button 
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: `1px solid ${B}`,
          background: "#fff",
          fontFamily: "Inter,sans-serif",
          fontWeight: 600,
          fontSize: 12,
          color: TS,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
        onClick={() => {/* TODO: Generate receipt */}}
      >
        <Download size={12} />
        Receipt
      </button>
    </div>
  );
};

// ── Mobile Payment Card ───────────────────────────────────────────────────────
const PaymentCard = ({ payment }: { payment: Payment }) => {
  const date = new Date(payment.created_at);
  
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${B}`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: "0 0 4px" }}>
            {payment.description || "Payment"}
          </p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: "0 0 8px" }}>
            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <StatusBadge status={payment.status} />
        </div>
        <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 18, color: D, margin: 0 }}>
          ${payment.amount.toFixed(2)}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${B}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CreditCard size={14} style={{ color: TS }} />
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, textTransform: "capitalize" }}>
            {payment.payment_method_brand || "Card"} {payment.payment_method_last4 && `••${payment.payment_method_last4}`}
          </span>
        </div>
        <button 
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${B}`,
            background: "#fff",
            fontFamily: "Inter,sans-serif",
            fontWeight: 600,
            fontSize: 11,
            color: TS,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Download size={12} />
          Receipt
        </button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function LearnerPayments() {
  const { user } = useAuth();
  const { data: payments, loading } = usePaymentHistory(user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Filter payments
  const filteredPayments = payments?.filter(payment => {
    // Status filter
    if (filterStatus !== "all" && payment.status !== filterStatus) return false;
    
    // Type filter
    if (filterType !== "all") {
      const type = payment.metadata?.type || "";
      if (filterType === "course" && type !== "course_purchase") return false;
      if (filterType === "session" && type !== "session_booking") return false;
      if (filterType === "subscription" && type !== "subscription") return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        payment.description?.toLowerCase().includes(query) ||
        payment.payment_method_brand?.toLowerCase().includes(query) ||
        payment.amount.toString().includes(query)
      );
    }
    
    return true;
  }) || [];

  // Calculate totals
  const totalSpent = payments?.reduce((sum, p) => p.status === "completed" ? sum + p.amount : sum, 0) || 0;
  const completedCount = payments?.filter(p => p.status === "completed").length || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: "0 0 8px" }}>
            Transaction History
          </h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>
            View your payment history and download receipts
          </p>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          <div style={{
            background: "#fff",
            border: `1px solid ${B}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: "0 0 6px" }}>Total Spent</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: A, margin: 0 }}>${totalSpent.toFixed(2)}</p>
          </div>
          <div style={{
            background: "#fff",
            border: `1px solid ${B}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: "0 0 6px" }}>Total Transactions</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: 0 }}>{payments?.length || 0}</p>
          </div>
          <div style={{
            background: "#fff",
            border: `1px solid ${B}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: "0 0 6px" }}>Completed</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: "#15803D", margin: 0 }}>{completedCount}</p>
          </div>
        </div>

        {/* ── Filters & Search ── */}
        <div style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
          background: "#fff",
          padding: 16,
          borderRadius: 12,
          border: `1px solid ${B}`,
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TS }} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: 8,
                border: `1px solid ${B}`,
                fontFamily: "Inter,sans-serif",
                fontSize: 13,
                color: D,
                outline: "none",
              }}
            />
          </div>

          {/* Status Filter */}
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${B}`,
              fontFamily: "Inter,sans-serif",
              fontSize: 13,
              color: D,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Type Filter */}
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${B}`,
              fontFamily: "Inter,sans-serif",
              fontSize: 13,
              color: D,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Types</option>
            <option value="course">Courses</option>
            <option value="session">Sessions</option>
            <option value="subscription">Subscriptions</option>
          </select>
        </div>

        {/* ── Payments Table (Desktop) ── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader2 size={40} className="animate-spin" style={{ color: A }} />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 16, border: `1px solid ${B}` }}>
            <CreditCard size={64} style={{ color: TS, margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 8px" }}>
              {searchQuery || filterStatus !== "all" || filterType !== "all" ? "No transactions found" : "No transactions yet"}
            </h3>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, margin: 0 }}>
              {searchQuery || filterStatus !== "all" || filterType !== "all" ? "Try adjusting your filters" : "Your transaction history will appear here"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div style={{ display: "none", "@media (min-width: 768px)": { display: "block" } }}>
              <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${B}`, overflow: "hidden" }}>
                {/* Table Header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr auto",
                  gap: 16,
                  padding: 16,
                  background: "#F9FAFB",
                  borderBottom: `1px solid ${B}`,
                }}>
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TS, textTransform: "uppercase" }}>Description</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TS, textTransform: "uppercase" }}>Payment Method</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TS, textTransform: "uppercase" }}>Amount</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TS, textTransform: "uppercase" }}>Status</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TS, textTransform: "uppercase" }}>Type</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TS, textTransform: "uppercase" }}>Receipt</span>
                </div>

                {/* Table Rows */}
                {filteredPayments.map(payment => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))}
              </div>
            </div>

            {/* Mobile Cards */}
            <div style={{ display: "block", "@media (min-width: 768px)": { display: "none" } }}>
              {filteredPayments.map(payment => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
