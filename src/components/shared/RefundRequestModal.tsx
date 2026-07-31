import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { buildBackendUrl } from "@/lib/backendApi";
import { toast } from "sonner";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";

interface Props {
  paymentId: string;
  userId: string;
  amount: number;
  paymentType: string;
  onSuccess: () => void;
  onClose: () => void;
}

const REFUND_RULES: Record<string, string> = {
  booking:      "Sessions can be refunded if cancelled at least 24 hours before the scheduled time.",
  course:       "Courses can be refunded within 7 days if less than 30% of content has been accessed.",
  video:        "Video purchases are refundable within 7 days if the content was inaccessible due to a platform issue.",
  subscription: "Subscription fees are non-refundable except in exceptional circumstances.",
};

export const RefundRequestModal = ({ paymentId, userId, amount, paymentType, onSuccess, onClose }: Props) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const rule = REFUND_RULES[paymentType] || "Refunds are subject to our refund policy.";

  const submit = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Please provide a detailed reason (at least 10 characters).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(buildBackendUrl("/api/refunds/request-payment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, user_id: userId, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message || "Refund request submitted.");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Could not submit refund request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <RotateCcw size={18} className="text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Request a Refund</h2>
            <p className="text-sm text-muted-foreground">Amount: <span className="font-semibold text-foreground">${Number(amount).toFixed(2)}</span></p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{rule}</p>
        </div>

        <div>
          <Label htmlFor="reason">Reason for refund <span className="text-destructive">*</span></Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe clearly why you are requesting a refund..."
            rows={4}
            className="resize-none mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">{reason.length} / 500 characters</p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button className="flex-1" onClick={submit} disabled={loading}>
            {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Submitting…</> : "Submit Request"}
          </Button>
        </div>
      </div>
    </div>
  );
};
