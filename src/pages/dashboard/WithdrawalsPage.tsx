/**
 * WithdrawalsPage (Payouts) — shared by therapist, coach, creator.
 * Figma UI + Stripe Connect + Coursevia brand.
 *
 * Flow:
 *  1. Check Stripe Connect status
 *  2. If not connected → show onboarding CTA
 *  3. If connected but not verified → show pending state
 *  4. If verified → show payout summary + history + withdraw form
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import TherapistLayout from "@/components/layouts/TherapistLayout";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  useWallet,
  useStripeConnectStatus,
  useWithdrawalHistory,
  requestStripeWithdrawal,
  setupStripeConnect,
  getStripeDashboardLink,
  fmt,
  fmtDate,
} from "@/lib/portalEngine";
import { Loader2, ExternalLink, CheckCircle2, Clock, XCircle, AlertTriangle, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

const A = "#2D9E6B", D = "#0F3D2E", B = "#EAE6E2", TM = "#1A1A1A", TS = "#6B7280";

function statusIcon(s: string) {
  if (s === "completed") return <CheckCircle2 size={13} style={{ color:"#166534" }} />;
  if (s === "failed")    return <XCircle size={13} style={{ color:"#991B1B" }} />;
  return <Clock size={13} style={{ color:"#D97706" }} />;
}
function statusBadge(s: string) {
  if (s === "completed") return { bg:"#F0FDF4", text:"#166534" };
  if (s === "failed")    return { bg:"#FEF2F2", text:"#991B1B" };
  return { bg:"#FEF3C7", text:"#92400E" };
}

interface Props {
  role: "therapist" | "coach" | "creator";
  bankPath?: string;
}

function WithdrawalsContent({ role, bankPath }: Props) {
  const { user, profile, session } = useAuth();
  const accessToken = session?.access_token;

  const { data: wallet, loading: loadingWallet, refetch: refetchWallet } = useWallet(user?.id);
  const { data: connectStatus, loading: loadingConnect, refetch: refetchConnect } = useStripeConnectStatus(user?.id, accessToken);
  const { data: history, loading: loadingHistory, refetch: refetchHistory } = useWithdrawalHistory(user?.id, accessToken);

  const [amount, setAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [onboarding, setOnboarding] = useState(false);

  const available = wallet?.available_balance ?? wallet?.balance ?? 0;
  const pending   = wallet?.pending_balance ?? 0;
  const MIN = 20;
  const amt = parseFloat(amount) || 0;

  // ── Stripe Connect onboarding ─────────────────────────────────────────────
  const handleSetupStripe = async () => {
    if (!user?.id || !profile?.email || !accessToken) return;
    setOnboarding(true);
    try {
      const result = await setupStripeConnect(user.id, profile.email, role, accessToken);
      if (result.onboardingUrl) {
        window.location.href = result.onboardingUrl;
      } else {
        toast.success("Stripe account ready");
        refetchConnect();
      }
    } catch (e: any) { toast.error(e.message || "Setup failed"); }
    finally { setOnboarding(false); }
  };

  // ── Withdraw ──────────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!user?.id || !accessToken) return;
    if (amt < MIN) { toast.error(`Minimum withdrawal is ${fmt(MIN)}`); return; }
    if (amt > available) { toast.error(`Max available: ${fmt(available)}`); return; }
    setWithdrawing(true);
    try {
      await requestStripeWithdrawal(user.id, amt, role, accessToken);
      toast.success("Withdrawal submitted — arrives in 2–7 business days");
      setAmount("");
      refetchWallet(); refetchHistory();
    } catch (e: any) { toast.error(e.message || "Withdrawal failed"); }
    finally { setWithdrawing(false); }
  };

  // ── Stripe dashboard link ─────────────────────────────────────────────────
  const handleDashboard = async () => {
    if (!user?.id || !accessToken) return;
    const url = await getStripeDashboardLink(user.id, accessToken);
    if (url) window.open(url, "_blank");
    else toast.error("Dashboard not available yet");
  };

  if (loadingWallet || loadingConnect) {
    return <div style={{ display:"flex", justifyContent:"center", padding:80 }}><Loader2 size={32} className="animate-spin" style={{ color:A }} /></div>;
  }

  // ── Not connected state ───────────────────────────────────────────────────
  if (!connectStatus?.connected) {
    return (
      <div>
        <h1 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:28, color:D, margin:"0 0 8px" }}>Payouts & Earnings</h1>
        <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:TS, marginBottom:32 }}>Connect your Stripe account to receive payouts directly to your bank.</p>

        <div style={{ maxWidth:480, background:"#fff", border:`1px solid ${B}`, borderRadius:16, padding:32, display:"flex", flexDirection:"column", alignItems:"center", gap:16, textAlign:"center" }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"#F0FDF6", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowUpRight size={24} color={A} />
          </div>
          <h2 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:20, color:D, margin:0 }}>Set Up Payouts</h2>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:TS, margin:0 }}>
            Connect via Stripe Express to receive earnings directly to your bank account. This takes 2–3 minutes.
          </p>
          <button onClick={handleSetupStripe} disabled={onboarding}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 24px", borderRadius:8, border:"none", background:A, fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:14, color:"#fff", cursor:"pointer", width:"100%" }}>
            {onboarding ? <><Loader2 size={14} className="animate-spin"/> Connecting…</> : <><ExternalLink size={14}/> Connect with Stripe</>}
          </button>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:TS, margin:0 }}>Secured by Stripe · PCI-DSS compliant</p>
        </div>
      </div>
    );
  }

  // ── Connected but not verified ────────────────────────────────────────────
  if (connectStatus.connected && !connectStatus.payouts_enabled) {
    return (
      <div>
        <h1 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:28, color:D, margin:"0 0 8px" }}>Payouts & Earnings</h1>
        <div style={{ maxWidth:480, background:"#fff", border:`1px solid ${B}`, borderRadius:16, padding:28 }}>
          <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:16 }}>
            <AlertTriangle size={20} color="#D97706" style={{ flexShrink:0 }} />
            <div>
              <h3 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:16, color:D, margin:"0 0 4px" }}>Verification Pending</h3>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:TS, margin:0 }}>
                Your Stripe account is connected but payouts are not yet enabled. Complete your Stripe onboarding to start receiving payments.
              </p>
            </div>
          </div>
          {connectStatus.requirements?.currently_due && connectStatus.requirements.currently_due.length > 0 && (
            <div style={{ background:"#FEF3C7", borderRadius:8, padding:12, marginBottom:16 }}>
              <p style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:"#92400E", margin:"0 0 6px" }}>Required to complete:</p>
              {connectStatus.requirements.currently_due.map(r => (
                <p key={r} style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:"#92400E", margin:"2px 0", textTransform:"capitalize" }}>• {r.replace(/_/g," ")}</p>
              ))}
            </div>
          )}
          <button onClick={handleSetupStripe} disabled={onboarding}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:8, border:"none", background:A, fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:13, color:"#fff", cursor:"pointer", width:"100%" }}>
            {onboarding ? <><Loader2 size={13} className="animate-spin"/> Loading…</> : <><ExternalLink size={13}/> Continue Stripe Onboarding</>}
          </button>
        </div>
      </div>
    );
  }

  // ── Fully connected ───────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:28, color:D, margin:0 }}>Payouts & Earnings</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:TS, marginTop:4 }}>Manage billing accounts, view pay cycles, and request bank deposits.</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={handleDashboard}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, border:`1px solid ${B}`, background:"#fff", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:TS, cursor:"pointer" }}>
            <ExternalLink size={13}/> Stripe Dashboard
          </button>
          <span style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:999, border:"1px solid #166534", background:"#F0FDF4" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#166534" }}/>
            <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:"#166534" }}>Active Deposits</span>
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { label:"Available",       value:fmt(available),                    note:"Ready to withdraw",           color:A    },
          { label:"Pending (8-day)", value:fmt(pending),                      note:"Clears after 8 days",         color:"#D97706" },
          { label:"Total Earned",    value:fmt((history||[]).filter(h=>h.status==="completed").reduce((s,h)=>s+h.amount,0)), note:"Lifetime withdrawals", color:D    },
          { label:"Last Payout",     value:history?.[0] ? fmt(history[0].amount) : "—",                           note:history?.[0] ? fmtDate(history[0].processed_at||history[0].requested_at) : "No payouts yet", color:D },
        ].map(c => (
          <div key={c.label} style={{ flex:"1 1 140px", background:"#fff", border:`1px solid ${B}`, borderRadius:12, padding:"18px 20px" }}>
            <p style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:11, color:TS, textTransform:"uppercase", margin:"0 0 8px" }}>{c.label}</p>
            <p style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:22, color:c.color, margin:"0 0 4px" }}>{c.value}</p>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:TS, margin:0 }}>{c.note}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:20, alignItems:"flex-start", flexWrap:"wrap" }}>

        {/* Payout history */}
        <div style={{ flex:"1 1 380px", background:"#fff", border:`1px solid ${B}`, borderRadius:16, padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:18, color:D, margin:0 }}>Payout History</h3>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:TS }}>{(history||[]).length} records</span>
          </div>

          {/* Table header */}
          <div style={{ display:"flex", gap:8, padding:"8px 10px", background:"#F9F8F6", borderRadius:8, marginBottom:4 }}>
            {[["Date",2],["Amount",1.5],["Status",1.5],["Transfer ID",2]].map(([h,f])=>(
              <span key={h as string} style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:11, color:TS, flex:f as number, textTransform:"uppercase" }}>{h}</span>
            ))}
          </div>

          {loadingHistory
            ? <div style={{ display:"flex", justifyContent:"center", padding:32 }}><Loader2 size={24} className="animate-spin" style={{ color:A }}/></div>
            : !(history||[]).length
              ? <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:TS, textAlign:"center", padding:24 }}>No payouts yet</p>
              : (history||[]).map(row => {
                  const badge = statusBadge(row.status);
                  return (
                    <div key={row.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 10px", borderBottom:`1px solid ${B}` }}>
                      <div style={{ flex:2 }}>
                        <p style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:TM, margin:0 }}>{fmtDate(row.requested_at || row.processed_at || "")}</p>
                      </div>
                      <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:TM, flex:1.5, textAlign:"right" }}>{fmt(row.amount)}</span>
                      <div style={{ flex:1.5, display:"flex", alignItems:"center", gap:5 }}>
                        {statusIcon(row.status)}
                        <span style={{ padding:"2px 7px", borderRadius:6, background:badge.bg, fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:10, color:badge.text, textTransform:"uppercase" }}>{row.status}</span>
                      </div>
                      <span style={{ fontFamily:"Inter,sans-serif", fontSize:10, color:TS, flex:2, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {row.stripe_transfer_id ? row.stripe_transfer_id.slice(0,18)+"…" : "—"}
                      </span>
                    </div>
                  );
                })}
        </div>

        {/* Withdraw + settings */}
        <div style={{ width:300, flexShrink:0, display:"flex", flexDirection:"column", gap:20 }}>

          {/* Withdraw form */}
          <div style={{ background:"#fff", border:`1px solid ${B}`, borderRadius:16, padding:22 }}>
            <h3 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:16, color:D, margin:"0 0 16px" }}>Request Payout</h3>

            <div style={{ marginBottom:12 }}>
              <p style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:11, color:TS, textTransform:"uppercase", margin:"0 0 6px" }}>Amount</p>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontFamily:"Inter,sans-serif", fontWeight:600, color:TS }}>$</span>
                <input type="number" min={MIN} max={available} step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width:"100%", padding:"10px 12px 10px 24px", background:"#F9F8F6", border:`1px solid ${B}`, borderRadius:8, fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:600, color:TM, outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                <span style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:TS }}>Available: {fmt(available)}</span>
                <button onClick={() => setAmount(available.toFixed(2))} style={{ background:"none", border:"none", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:11, color:A, cursor:"pointer" }}>Max</button>
              </div>
            </div>

            <button onClick={handleWithdraw} disabled={withdrawing || amt < MIN || amt > available}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"11px 16px", borderRadius:8, border:"none",
                background: (withdrawing || amt < MIN || amt > available) ? "#D1D5DB" : A,
                fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:13, color:"#fff", cursor: (withdrawing||amt<MIN||amt>available)?"default":"pointer" }}>
              {withdrawing ? <><Loader2 size={13} className="animate-spin"/>Processing…</> : <><ArrowUpRight size={13}/>Withdraw to Bank</>}
            </button>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:TS, textAlign:"center", margin:"8px 0 0" }}>Min {fmt(MIN)} · Arrives in 2–7 business days via Stripe</p>
          </div>

          {/* Payout settings info */}
          <div style={{ background:"#fff", border:`1px solid ${B}`, borderRadius:16, padding:22 }}>
            <h3 style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:16, color:D, margin:"0 0 14px" }}>Payout Settings</h3>
            {[
              { label:"Provider",    value:"Stripe Connect" },
              { label:"Schedule",    value:"On demand" },
              { label:"Currency",    value:(wallet?.currency||"USD").toUpperCase() },
              { label:"Payouts",     value:connectStatus?.payouts_enabled ? "Enabled" : "Disabled" },
            ].map(r => (
              <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${B}` }}>
                <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:TS }}>{r.label}</span>
                <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:TM }}>{r.value}</span>
              </div>
            ))}
            {bankPath && (
              <Link to={bankPath} style={{ display:"block", marginTop:14, padding:"9px 14px", borderRadius:8, border:`1px solid ${A}`, fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12, color:A, textDecoration:"none", textAlign:"center" }}>
                Manage Bank Accounts
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Role-specific exports ─────────────────────────────────────────────────────

export function TherapistWithdrawals() {
  return (
    <TherapistLayout>
      <WithdrawalsContent role="therapist" bankPath="/therapist/bank-accounts" />
    </TherapistLayout>
  );
}

export function CoachWithdrawals() {
  return (
    <DashboardLayout role="coach">
      <WithdrawalsContent role="coach" bankPath="/coach/bank-accounts" />
    </DashboardLayout>
  );
}

export function CreatorWithdrawals() {
  return (
    <DashboardLayout role="creator">
      <WithdrawalsContent role="creator" bankPath="/creator/bank-accounts" />
    </DashboardLayout>
  );
}
