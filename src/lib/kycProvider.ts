import { supabase } from "@/integrations/supabase/client";

export type KycDocumentType = "national_id" | "drivers_license" | "passport";

export type KycSessionResult = {
  provider: "persona";
  inquiryId: string;
  inquiryUrl: string;
  templateId?: string;
};

const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
export const personaTemplateId =
  import.meta.env.VITE_PERSONA_TEMPLATE_ID || "persona_sandbox_59ce022a-0305-4892-84fd-4bc3482399d5";

export const isKycBackendConfigured = () => {
  return Boolean(backendBaseUrl);
};

export const createPersonaKycSession = async (payload: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  country?: string | null;
  phone?: string | null;
  role: "coach" | "therapist";
  preferredDocument?: KycDocumentType;
}) => {
  if (!backendBaseUrl) {
    throw new Error("VITE_BACKEND_URL is not configured for KYC.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${backendBaseUrl}/api/kyc/persona/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? {
            Authorization: `Bearer ${session.access_token}`,
          }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || "Failed to start verification.");
  }

  return json as KycSessionResult;
};
