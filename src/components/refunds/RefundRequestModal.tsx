/**
 * RefundRequestModal
 * 
 * Used by learners to request a refund for a booking or payment.
 * On submit → POST /api/refunds/request (booking) or /api/refunds/request-payment
 * Backend automatically escalates to Court Room and BANS the provider portal.
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Loader2, X, Scale } from "lucide-react";
import { toast } from "sonner";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "";

interface Props {
  bookingId?: string;
  paymentId?: string;
  providerName: string;
  serviceName: string;
  amount: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const REASONS = [
  "Service was not delivered as described",
  "Session was cancelled by provider",
  "Technical issues prevented session",
  "Provider was unprofessional or inappropriate",
  "Duplicate charge",
  "Unauthorized charge",
  "Other",
];

export default function RefundRequestModal({
  bookingId,
  paymentId,
  providerName,
  serviceName,
  amount,
  onClose,
  onSuccess,
}: Props) {
  const { user, session } = useAuth();
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  const finalReason = reason === "Other" ? customReason.trim() : reason;

  const handleSubmit = async () => {
    if (!finalReason) { toast.error("Please select a reason"); return; }
    if (!user?.id) { toast.error("You must be logged in"); return; }

    setSubmitting(true);
    try {
      const endpoint = bookingId
        ? `${BACKEND}/api/refunds/request`
        : `${BACKEND}/api/refunds/request-payment`;

      const body = bookingId
        ? { booking_id: bookingId, user_id: user.id, reason: finalReason }
        : { payment_id: paymentId, user_id: user.id, reason: finalReason };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Refund request failed");

      // Extract court case number if escalated
      if (json.refund?.court_case_id || json.case_number) {
        setCaseNumber(json.case_number || null);
      }

      setSubmitted(true);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || "Could not submit refund request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer" }}>
          <X size={18} color="#6B7280" />
        </button>

        {!submitted ? (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={20} color="#DC2626" />
              </div>
              <div>
                <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 18, color: "#111827", margin: 0 }}>Request Refund</h2>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#6B7280", margin: 0 }}>This will open a dispute and restrict the provider's account</p>
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#6B7280" }}>Service</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: "#111827" }}>{serviceName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#6B7280" }}>Provider</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: "#111827" }}>{providerName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#6B7280" }}>Amount</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 13, color: "#DC2626" }}>${amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Reason select */}
            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: "#6B7280", textTransform: "uppercase", margin: "0 0 8px" }}>Reason for refund *</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {REASONS.map(r => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: `1px solid ${reason === r ? "#2D9E6B" : "#E5E7EB"}`, background: reason === r ? "#F0FDF6" : "#fff", cursor: "pointer" }}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} style={{ accentColor: "#2D9E6B" }} />
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#111827" }}>{r}</span>
                </label>
              ))}
            </div>

            {reason === "Other" && (
              <textarea
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Please describe your reason…"
                rows={3}
                style={{ width: "100%", padding: "10px 12px", background: "#F9F8F6", border: "1px solid #E5E7EB", borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, color: "#111827", outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 14 }}
              />
            )}

            {/* Warning */}
            <div style={{ background: "#FEF3C7", border: "1px solid #D97706", borderRadius: 8, padding: "10px 12px", marginBottom: 18, display: "flex", gap: 8 }}>
              <Scale size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.5 }}>
                Submitting this request will automatically open a court case and <strong>restrict the provider's portal access</strong> until the dispute is resolved by a judge.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: "#6B7280", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!finalReason || submitting}
                style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 8, border: "none", background: !finalReason ? "#D1D5DB" : "#DC2626", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: "#fff", cursor: !finalReason ? "default" : "pointer" }}>
                {submitting ? <><Loader2 size={13} className="animate-spin" /> Submitting…</> : "Submit Refund Request"}
              </button>
            </div>
          </>
        ) : (
          /* ── Success state ── */
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Scale size={26} color="#2D9E6B" />
            </div>
            <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 20, color: "#111827", margin: "0 0 8px" }}>Dispute Filed</h2>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.6 }}>
              Your refund request has been submitted and escalated to our dispute resolution system.
              <br /><br />
              The provider's portal has been <strong style={{ color: "#DC2626" }}>restricted</strong> pending judge review. You will receive email updates on your case.
            </p>
            {caseNumber && (
              <div style={{ background: "#F0FDF6", border: "1px solid #2D9E6B", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#6B7280", margin: "0 0 4px" }}>Case Number</p>
                <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 16, color: "#0F3D2E", margin: 0, fontFamily: "monospace" }}>{caseNumber}</p>
              </div>
            )}
            <button onClick={onClose} style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "none", background: "#2D9E6B", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
