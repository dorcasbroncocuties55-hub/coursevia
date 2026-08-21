import { useState } from "react";
import CreatorLayout from "@/components/layouts/CreatorLayout";
import { DollarSign, Wallet, ArrowUpRight } from "lucide-react";

// Import the shared wallet and withdrawals content
import { CreatorWallet } from "@/pages/dashboard/WalletPage";
import { CreatorWithdrawals } from "@/pages/dashboard/WithdrawalsPage";

// ── Figma-exact Creator Portal design tokens (Indigo theme) ──────────────────
const S = {
  accent: "#4F46E5",
  accentLight: "#EEF2FF",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  dim: "#64748B",
  full: "#0F172A",
};

export default function CreatorRevenue() {
  const [activeTab, setActiveTab] = useState<"wallet" | "withdrawals">("wallet");

  return (
    <CreatorLayout>
      <div style={{ fontFamily: "Inter,sans-serif" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            color: S.full, 
            margin: 0, 
            marginBottom: 8 
          }}>
            Revenue & Payouts
          </h1>
          <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
            Manage your course earnings and withdraw funds
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: "flex", 
          gap: 0, 
          borderBottom: `2px solid ${S.border}`,
          marginBottom: 32,
        }}>
          <button
            onClick={() => setActiveTab("wallet")}
            style={{
              padding: "12px 24px",
              background: "transparent",
              border: "none",
              borderBottom: `3px solid ${activeTab === "wallet" ? S.accent : "transparent"}`,
              color: activeTab === "wallet" ? S.accent : S.dim,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: -2,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Wallet size={18} />
            Wallet & Balance
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            style={{
              padding: "12px 24px",
              background: "transparent",
              border: "none",
              borderBottom: `3px solid ${activeTab === "withdrawals" ? S.accent : "transparent"}`,
              color: activeTab === "withdrawals" ? S.accent : S.dim,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: -2,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ArrowUpRight size={18} />
            Withdrawals & Payouts
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "wallet" ? (
            <WalletTabContent />
          ) : (
            <WithdrawalsTabContent />
          )}
        </div>
      </div>
    </CreatorLayout>
  );
}

// Wrapper components that render without the layout (since CreatorLayout already wraps)
function WalletTabContent() {
  // The shared CreatorWallet component includes DashboardLayout,
  // but we only want the content since we're already in CreatorLayout
  // So we'll render the content directly by importing the shared component
  // and stripping the outer layout
  return (
    <div style={{ 
      // Override any layout-specific styles from the shared component
      marginLeft: 0,
      marginRight: 0,
    }}>
      <CreatorWallet />
    </div>
  );
}

function WithdrawalsTabContent() {
  return (
    <div style={{
      marginLeft: 0,
      marginRight: 0,
    }}>
      <CreatorWithdrawals />
    </div>
  );
}
