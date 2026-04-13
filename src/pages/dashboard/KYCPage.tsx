import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldX, Clock, CheckCircle2, AlertCircle, ExternalLink
} from "lucide-react";

type KYCStatus = "not_started" | "pending" | "approved" | "rejected";

type KYCRequest = {
  id: string;
  status: KYCStatus;
  inquiry_id?: string;
  provider?: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
};

const StatusBadge = ({ status }: { status: KYCStatus }) => {
  const map: Record<KYCStatus, { icon: React.ReactNode; label: string; cls: string }> = {
    not_started: { icon: <AlertCircle size={14} />, label: "Not started",  cls: "bg-slate-100 text-slate-600" },
    pending:     { icon: <Clock size={14} />,        label: "Under review", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
    approved:    { icon: <ShieldCheck size={14} />,  label: "Verified",     cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    rejected:    { icon: <ShieldX size={14} />,      label: "Rejected",     cls: "bg-red-50 text-red-700 border border-red-200" },
  };
  const { icon, label, cls } = map[status] ?? map.not_started;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {icon} {label}
    </span>
  );
};

type Props = { role?: string };

const KYCPageDidit = ({ role = "learner" }: Props) => {
  const { user, profile } = useAuth();
  const [kycStatus, setKycStatus] = useState<KYCStatus>("not_started");
  const [request, setRequest] = useState<KYCRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("kyc_status, is_verified")
      .eq("user_id", user.id)
      .maybeSingle();
    
    // Normalize kyc_status
    const rawStatus = profileData?.kyc_status;
    let normalizedStatus: KYCStatus = "not_started";
    
    if (rawStatus === "pending") normalizedStatus = "pending";
    else if (rawStatus === "approved") normalizedStatus = "approved";
    else if (rawStatus === "rejected") normalizedStatus = "rejected";
    
    setKycStatus(normalizedStatus);

    const { data: req } = await supabase
      .from("verification_requests" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "didit")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    setRequest(req || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const startVerification = async () => {
    if (!user?.id) return;
    
    setStarting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/kyc/didit/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: profile?.full_name || user.email?.split("@")[0],
          role: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to start verification");
      }

      if (data.verificationUrl) {
        // Open Didit verification in new window
        window.open(data.verificationUrl, "_blank");
        toast.success("Verification window opened. Complete the process and return here.");
        
        // Update status to pending
        await supabase
          .from("profiles")
          .update({ kyc_status: "pending" })
          .eq("user_id", user.id);
        
        await load();
      } else {
        throw new Error("No verification URL received");
      }
    } catch (error: any) {
      console.error("Start verification error:", error);
      toast.error(error.message || "Failed to start verification");
    } finally {
      setStarting(false);
    }
  };

  const dashRole = role === "coach" ? "coach" : role === "therapist" ? "therapist" : role === "creator" ? "creator" : "learner";

  return (
    <DashboardLayout role={dashRole as any}>
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Identity Verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify your identity with Didit to unlock full platform features and build trust with others.
          </p>
        </div>

        {/* Status card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Verification status</p>
              {request?.reviewed_at && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Reviewed {new Date(request.reviewed_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {!loading && <StatusBadge status={kycStatus} />}
          </div>

          {kycStatus === "approved" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={16} className="shrink-0" />
              Your identity has been verified. Your profile shows a verified badge.
            </div>
          )}

          {kycStatus === "rejected" && request?.rejection_reason && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Reason for rejection:</p>
              <p className="mt-1">{request.rejection_reason}</p>
              <p className="mt-2 text-xs">You can resubmit by starting a new verification below.</p>
            </div>
          )}

          {kycStatus === "pending" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Clock size={16} className="shrink-0" />
              Your submission is under review. This usually takes 1–2 business days.
            </div>
          )}
        </div>

        {/* Start Verification */}
        {(kycStatus === "not_started" || kycStatus === "rejected") && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Start Identity Verification</h3>
              <p className="text-sm text-muted-foreground">
                Click the button below to start the verification process with Didit. You'll need:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>A valid government-issued ID (passport, driver's license, or national ID)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>A device with a camera for selfie verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>5-10 minutes to complete the process</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={startVerification} 
              disabled={starting || loading}
              className="w-full"
              size="lg"
            >
              {starting ? (
                <>
                  <Clock size={16} className="mr-2 animate-spin" />
                  Starting verification...
                </>
              ) : (
                <>
                  <ExternalLink size={16} className="mr-2" />
                  Start Verification with Didit
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your data is encrypted and securely processed by Didit. We never store your ID documents.
            </p>
          </div>
        )}

        {/* Info card */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Why verify your identity?</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
              <span>Get a verified badge on your profile</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
              <span>Build trust with clients and increase bookings</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
              <span>Unlock withdrawal capabilities</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
              <span>Access premium platform features</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const LearnerKYC    = () => <KYCPageDidit role="learner" />;
export const CoachKYC      = () => <KYCPageDidit role="coach" />;
export const TherapistKYC  = () => <KYCPageDidit role="therapist" />;
export const CreatorKYC    = () => <KYCPageDidit role="creator" />;

export default KYCPageDidit;
