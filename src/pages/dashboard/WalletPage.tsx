/**
 * WalletPage — shared by therapist, coach, creator.
 * Figma UI + Coursevia brand + real Supabase/backend data.
 * Usage:
 *   <WalletPage role="therapist" withdrawPath="/therapist/withdrawals" bankPath="/therapist/bank-accounts" />
 */
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import TherapistLayout from "@/components/layouts/TherapistLayout";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useWallet, useTransactions, fmt, fmtDate, fmtTime } from "@/lib/portalEngine";
import { Loader2, FileText, RefreshCw, Download, Lock, Wallet, ArrowUpRight } from "lucide-react";

// ── brand ──────────────────────────────────────────────────────────────────────
const A = "#2D9E6B";
const D = "#0F3D2E";
const B = "#EAE6E2";
const TM = "#1A1A1A";
const TS = "#6B7280";

interface Props {
  role: "therapist" | "coach" | "creator";
  withdrawPath?: string;
  bankPath?: string;
}

function WalletContent({ role, withdrawPath, bankPath }: Props) {
  const { user } = useAuth();
  const { data: wallet, loading: loadingWallet, refetch } = useWallet(user?.id);
  const { data: txns, loading: loadingTxns } = useTransactions(user?.id);

  const available = wallet?.available_balance ?? wallet?.balance ?? 0;
  const pending   = wallet?.pending_balance ?? 0;
  const escrow    = Math.max(0, (wallet?.balance ?? 0) - available - pending);
  const total     = available + pending + escrow;

  const quickActions = [
    { icon: <FileText size={14} color={A} />,    label: "Send Patient Invoice",      onClick: () => {} },
    { icon: <RefreshCw size={14} color={A} />,   label: "Configure Auto-Pay",        onClick: () => {} },
    { icon: <Download size={14} color={A} />,    label: "Download CSV Statement",    onClick: () => {
        const rows = [["Date","Description","Amount","Type"],...(txns||[]).map(t=>[fmtDate(t.created_at),t.description||t.type,t.amount,t.type])];
        const csv = rows.map(r=>r.join(",")).join("\n");
        const a = document.createElement("a"); a.href="data:text/csv,"+encodeURIComponent(csv); a.download="statement.csv"; a.click();
    }},
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:28, color:D, margin:0 }}>Practice Wallet</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:TS, marginTop:4 }}>Track session fees, charges, and active operational balances.</p>
        </div>
        <span style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:999, border:"1px solid #166534", background:"#F0FDF4" }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#166534" }} />
          <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:"#166534" }}>Wallet Online</span>
        </span>
      </div>

      <div style={{ display:"flex", gap:20, alignItems:"flex-start", flexWrap:"wrap" }}>

        {/* ── Left column ── */}
        <div style={{ flex:"1 1 380px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* Balance card — dark green Figma card */}
          <div style={{ background:D, borderRadius:14, padding:28, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:11, color:"#D1FAE5", textTransform:"uppercase" }}>Available Balance</span>
              {loadingWallet
                ? <Loader2 size={28} className="animate-spin" style={{ color:"#D1FAE5" }} />
                : <span style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:42, color:"#fff", lineHeight:1.1 }}>{fmt(available)}</span>}
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:"#D1FAE5" }}>Last updated just now · Auto-pay active</span>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              {withdrawPath && (
                <Link to={withdrawPath} style={{ padding:"10px 18px", borderRadius:8, background:A, fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:13, color:"#fff", textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>
                  <ArrowUpRight size={14} /> Withdraw
                </Link>
              )}
              {bankPath && (
                <Link to={bankPath} style={{ padding:"10px 18px", borderRadius:8, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.1)", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:13, color:"#fff", textDecoration:"none" }}>
                  Add Funds
                </Link>
              )}
            </div>
          </div>

          {/* Transaction history */}
          <div style={{ background:"#fff", border:`1px solid ${B}`, borderRadius:16, padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h3 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:18, color:D, margin:0 }}>Transaction History</h3>
              <button onClick={() => { const rows=[["Date","Description","Amount","Type"],...(txns||[]).map(t=>[fmtDate(t.created_at),t.description||t.type,t.amount,t.type])]; const csv=rows.map(r=>r.join(",")).join("\n"); const a=document.createElement("a");a.href="data:text/csv,"+encodeURIComponent(csv);a.download="statement.csv";a.click(); }}
                style={{ background:"none", border:"none", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:A, cursor:"pointer" }}>
                Export Statement
              </button>
            </div>
            {loadingTxns
              ? <div style={{ display:"flex", justifyContent:"center", padding:32 }}><Loader2 size={24} className="animate-spin" style={{ color:A }} /></div>
              : !txns?.length
                ? <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:TS, textAlign:"center", padding:24 }}>No transactions yet</p>
                : txns.map(tx => {
                    const isCredit = tx.type === "credit" || tx.amount > 0 && tx.type !== "debit";
                    return (
                      <div key={tx.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 0", borderBottom:`1px solid ${B}` }}>
                        <div style={{ width:42, flexShrink:0 }}>
                          <p style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:11, color:TM, margin:0 }}>{fmtDate(tx.created_at).split(",")[0]}</p>
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:13, color:TM, margin:0 }}>{tx.description || tx.type}</p>
                          <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:TS, margin:0, textTransform:"capitalize" }}>{tx.type}</p>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <p style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:13, color: isCredit?"#166534":TM, margin:0 }}>
                            {isCredit ? "+" : "-"}{fmt(Math.abs(tx.amount))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ width:300, flexShrink:0, display:"flex", flexDirection:"column", gap:20 }}>

          {/* Balance breakdown — Figma */}
          <div style={{ background:"#fff", border:`1px solid ${B}`, borderRadius:16, padding:22 }}>
            <h3 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:17, color:D, margin:"0 0 16px" }}>Wallet Balance</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { label:"Available Balance", icon:<Wallet size={13} color="#166534"/>, iconBg:"#F0FDF4", value:fmt(available),  valueColor:"#166534" },
                { label:"In Escrow",         icon:<Lock size={13} color={TS}/>,       iconBg:"#F9F8F6", value:fmt(escrow),    valueColor:TS },
                { label:"Pending (8-day)",   icon:<RefreshCw size={13} color="#C2410C"/>,iconBg:"#FFEDD5",value:fmt(pending), valueColor:"#C2410C" },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:row.iconBg, display:"flex", alignItems:"center", justifyContent:"center" }}>{row.icon}</div>
                    <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:TS }}>{row.label}</span>
                  </div>
                  <span style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:13, color:row.valueColor }}>{row.value}</span>
                </div>
              ))}
              <hr style={{ border:"none", borderTop:`1px solid ${B}`, margin:"4px 0" }} />
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:TS }}>Total Funds</span>
                <span style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:13, color:D }}>{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ background:"#fff", border:`1px solid ${B}`, borderRadius:16, padding:22 }}>
            <h3 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:17, color:D, margin:"0 0 14px" }}>Quick Actions</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {quickActions.map(qa => (
                <button key={qa.label} onClick={qa.onClick}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px", borderRadius:10, background:"#F9F8F6", border:`1px solid ${B}`, cursor:"pointer", textAlign:"left" }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:"#F0FDF6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{qa.icon}</div>
                  <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:TM }}>{qa.label}</span>
                </button>
              ))}
              {withdrawPath && (
                <Link to={withdrawPath} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px", borderRadius:10, background:"#F9F8F6", border:`1px solid ${B}`, textDecoration:"none" }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:"#F0FDF6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <ArrowUpRight size={14} color={A} />
                  </div>
                  <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:TM }}>Request Payout</span>
                </Link>
              )}
            </div>
          </div>

          {/* Payment methods — link to bank accounts */}
          {bankPath && (
            <div style={{ background:"#fff", border:`1px solid ${B}`, borderRadius:16, padding:22 }}>
              <h3 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:17, color:D, margin:"0 0 14px" }}>Payment Methods</h3>
              <Link to={bankPath} style={{ display:"block", padding:"9px 14px", borderRadius:8, border:`1px solid ${A}`, background:"#fff", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:A, textDecoration:"none", textAlign:"center" }}>
                Manage Bank Accounts
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Role-specific exports ─────────────────────────────────────────────────────

export function TherapistWallet() {
  return (
    <TherapistLayout>
      <WalletContent role="therapist" withdrawPath="/therapist/withdrawals" bankPath="/therapist/bank-accounts" />
    </TherapistLayout>
  );
}

export function CoachWallet() {
  return (
    <DashboardLayout role="coach">
      <WalletContent role="coach" withdrawPath="/coach/withdrawals" bankPath="/coach/bank-accounts" />
    </DashboardLayout>
  );
}

export function CreatorWallet() {
  return (
    <DashboardLayout role="creator">
      <WalletContent role="creator" withdrawPath="/creator/withdrawals" bankPath="/creator/bank-accounts" />
    </DashboardLayout>
  );
}

export function LearnerWallet() {
  return (
    <DashboardLayout role="learner">
      <WalletContent role="therapist" />
    </DashboardLayout>
  );
}
