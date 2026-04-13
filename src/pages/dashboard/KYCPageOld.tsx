import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldX, Clock, Upload, User, FileText, Camera, CheckCircle2, AlertCircle
} from "lucide-react";

type KYCStatus = "not_started" | "pending" | "approved" | "rejected";

type KYCRequest = {
  id: string;
  status: KYCStatus;
  full_name?: string;
  document_type?: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
};

const DOC_TYPES = [
  { value: "national_id",      label: "National ID" },
  { value: "passport",         label: "Passport" },
  { value: "drivers_license",  label: "Driver's License" },
];

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

const KYCPage = ({ role = "learner" }: Props) => {
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState<KYCStatus>("not_started");
  const [request, setRequest] = useState<KYCRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [fullName, setFullName]       = useState("");
  const [dob, setDob]                 = useState("");
  const [nationality, setNationality] = useState("");
  const [idNumber, setIdNumber]       = useState("");
  const [docType, setDocType]         = useState("national_id");
  const [idFront, setIdFront]         = useState("");
  const [idBack, setIdBack]           = useState("");
  const [selfie, setSelfie]           = useState("");

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles").select("kyc_status, full_name").eq("user_id", user.id).maybeSingle();
    
    // Normalize kyc_status: treat 'pending_setup', null, or empty as 'not_started'
    const rawStatus = profile?.kyc_status;
    let normalizedStatus: KYCStatus = "not_started";
    
    if (rawStatus === "pending") normalizedStatus = "pending";
    else if (rawStatus === "approved") normalizedStatus = "approved";
    else if (rawStatus === "rejected") normalizedStatus = "rejected";
    // else defaults to "not_started"
    
    setKycStatus(normalizedStatus);
    
    if (profile?.full_name) setFullName(profile.full_name);

    const { data: req } = await supabase
      .from("verification_requests" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("verification_type", "identity")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRequest(req || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const submit = async () => {
    if (!user?.id) return;
    if (!fullName.trim() || !docType) {
      toast.error("Full name and document type are required.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_kyc_request" as any, {
        p_role:          role,
        p_full_name:     fullName.trim(),
        p_date_of_birth: dob || null,
        p_nationality:   nationality || null,
        p_id_number:     idNumber || null,
        p_document_type: docType,
        p_id_front_url:  idFront || null,
        p_id_back_url:   idBack || null,
        p_selfie_url:    selfie || null,
      });
      if (error) throw error;
      toast.success("KYC submitted. We'll review it within 1–2 business days.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const dashRole = role === "coach" ? "coach" : role === "therapist" ? "therapist" : role === "creator" ? "creator" : "learner";

  return (
    <DashboardLayout role={dashRole as any}>
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Identity Verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify your identity to unlock full platform features and build trust with others.
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
              <p className="mt-2 text-xs">You can resubmit with corrected information below.</p>
            </div>
          )}

          {kycStatus === "pending" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Clock size={16} className="shrink-0" />
              Your submission is under review. This usually takes 1–2 business days.
            </div>
          )}
        </div>

        {/* Form — show if not approved or pending */}
        {kycStatus !== "approved" && kycStatus !== "pending" && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <p className="font-semibold text-foreground">Submit verification</p>

            {/* Personal info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <User size={12} /> Personal Information
              </div>
              <div>
                <Label>Full legal name *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As it appears on your ID" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date of birth</Label>
                  <Input type="date" value={dob} onChange={e => setDob(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Nationality</Label>
                  <Input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g. Nigerian" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Document */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <FileText size={12} /> Identity Document
              </div>
              <div>
                <Label>Document type *</Label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <Label>ID number</Label>
                <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Document number" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1"><Upload size={12} /> Front of ID (URL)</Label>
                  <Input value={idFront} onChange={e => setIdFront(e.target.value)} placeholder="https://..." className="mt-1" />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Upload size={12} /> Back of ID (URL)</Label>
                  <Input value={idBack} onChange={e => setIdBack(e.target.value)} placeholder="https://..." className="mt-1" />
                </div>
              </div>
            </div>

            {/* Selfie */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Camera size={12} /> Selfie
              </div>
              <div>
                <Label>Selfie with ID (URL)</Label>
                <Input value={selfie} onChange={e => setSelfie(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
              <p className="text-xs text-muted-foreground">
                Hold your ID next to your face. Make sure both are clearly visible.
              </p>
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? "Submitting…" : "Submit for verification"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your data is encrypted and only used for identity verification.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export const LearnerKYC    = () => <KYCPage role="learner" />;
export const CoachKYC      = () => <KYCPage role="coach" />;
export const TherapistKYC  = () => <KYCPage role="therapist" />;
export const CreatorKYC    = () => <KYCPage role="creator" />;

export default KYCPage;
