import { FileText, RefreshCw, Download, Lock } from "lucide-react";
import TherapistLayout from "@/components/layouts/TherapistLayout";

const accent   = "#2D9E6B";
const dark     = "#0F3D2E";
const border   = "#EAE6E2";
const textMain = "#1A1A1A";
const textSub  = "#6B7280";

const transactions = [
  { date: "Oct 24", patient: "Amara Okafor",    service: "Anxiety Management (In-Person)",      amount: "+$150.00", amountColor: "#166534", balance: "Bal: $3,240.50" },
  { date: "Oct 23", patient: "Liam Henderson",  service: "Cognitive Behavioral Therapy (CBT)",  amount: "+$155.00", amountColor: "#166534", balance: "Bal: $3,090.50" },
  { date: "Oct 22", patient: "Platform Fee",    service: "Monthly Medical SaaS License",        amount: "-$120.00", amountColor: textMain,  balance: "Bal: $2,935.50" },
  { date: "Oct 22", patient: "Siddharth Mehta", service: "Trauma-Informed Therapy (Virtual)",   amount: "+$175.00", amountColor: "#166534", balance: "Bal: $3,055.50" },
  { date: "Oct 20", patient: "Clara Dubois",    service: "Mindfulness Integration Session",     amount: "+$140.00", amountColor: "#166534", balance: "Bal: $2,880.50" },
  { date: "Oct 19", patient: "Medical Merchant Payout", service: "Transfer to Chase Checking",  amount: "-$1,850.00",amountColor: textMain, balance: "Bal: $2,740.50" },
  { date: "Oct 18", patient: "Oliver Green",    service: "General CBT Session Intake",          amount: "+$190.00", amountColor: "#166534", balance: "Bal: $4,590.50" },
  { date: "Oct 17", patient: "Sarah Mercer Adv.", service: "Clinical Supervision Credit",       amount: "+$350.00", amountColor: "#166534", balance: "Bal: $4,400.50" },
];

const balanceRows = [
  { label: "Available Balance", icon: <span>💰</span>, value: "$3,240.50", valueColor: "#166534", iconBg: "#F0FDF4" },
  { label: "In Escrow",         icon: <Lock size={13} color={textSub} />, value: "$1,875.00", valueColor: textSub, iconBg: "#F9F8F6" },
  { label: "8 Days Pending",    icon: <span>⏱</span>, value: "$2,340.00", valueColor: "#C2410C", iconBg: "#FFEDD5" },
];

const quickActions = [
  { icon: <FileText size={14} color={accent} />, label: "Send Patient Invoice" },
  { icon: <RefreshCw size={14} color={accent} />, label: "Configure Auto-Pay" },
  { icon: <Download size={14} color={accent} />, label: "Download CSV Statement" },
];

export default function TherapistWallet() {
  return (
    <TherapistLayout activePage="wallet">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 28, color: dark, margin: 0 }}>Practice Wallet</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: textSub, marginTop: 4 }}>Track direct-to-patient charges, session fees, and active operational balances.</p>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, border: "1px solid #166534", background: "#F0FDF4" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#166534" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: "#166534" }}>Wallet Online</span>
        </span>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left — balance card + transactions */}
        <div style={{ flex: "1 1 380px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Balance card */}
          <div style={{ background: dark, borderRadius: 14, padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11, color: "#D1FAE5", textTransform: "uppercase" }}>Available Balance</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 42, color: "#fff", lineHeight: 1.1 }}>$3,240.50</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#D1FAE5" }}>Last updated: 5 minutes ago • Autopay active</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: accent, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}>Withdraw</button>
              <button style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}>Add Funds</button>
            </div>
          </div>

          {/* Transaction history */}
          <div style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 18, color: dark, margin: 0 }}>Transaction History</h3>
              <button style={{ background: "none", border: "none", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: accent, cursor: "pointer" }}>Export Statement</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {transactions.map((tx, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: textMain, width: 54, flexShrink: 0 }}>{tx.date}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: textMain, margin: 0 }}>{tx.patient}</p>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: textSub, margin: 0 }}>{tx.service}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: tx.amountColor, margin: 0 }}>{tx.amount}</p>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: textSub, margin: 0 }}>{tx.balance}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Balance breakdown */}
          <div style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 16, padding: 22 }}>
            <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 17, color: dark, margin: "0 0 14px" }}>Wallet Balance</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {balanceRows.map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: row.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>{row.icon}</div>
                    <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: textSub }}>{row.label}</span>
                  </div>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, color: row.valueColor }}>{row.value}</span>
                </div>
              ))}
              <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "4px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: textSub }}>Total Funds</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, color: dark }}>$7,455.50</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 16, padding: 22 }}>
            <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 17, color: dark, margin: "0 0 14px" }}>Quick Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {quickActions.map((a) => (
                <button key={a.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10, background: "#F9F8F6", border: `1px solid ${border}`, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: "#F0FDF6", display: "flex", alignItems: "center", justifyContent: "center" }}>{a.icon}</div>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: textMain }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment methods */}
          <div style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 16, padding: 22 }}>
            <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 17, color: dark, margin: "0 0 14px" }}>Payment Methods</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Visa ending in 4521",  sub: "Primary Card • Exp 08/26", tag: "VISA", tagBg: "#1E40AF" },
                { label: "Chase checking",        sub: "Payout Account",           tag: "BANK", tagBg: textSub   },
              ].map((m) => (
                <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${border}`, borderRadius: 10 }}>
                  <div style={{ width: 36, height: 24, borderRadius: 4, background: m.tagBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 9, color: "#fff" }}>{m.tag}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: textMain, margin: 0 }}>{m.label}</p>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: textSub, margin: 0 }}>{m.sub}</p>
                  </div>
                </div>
              ))}
              <button style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${accent}`, background: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: accent, cursor: "pointer" }}>+ Add New Payment Method</button>
            </div>
          </div>
        </div>
      </div>
    </TherapistLayout>
  );
}
