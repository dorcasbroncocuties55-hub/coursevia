// Didit KYC Routes
// Add these routes to your backend/server.js file

// ── KYC / Didit ─────────────────────────────────────────────────────────────

const DIDIT_API_KEY = process.env.DIDIT_API_KEY || "";
const DIDIT_CLIENT_ID = process.env.DIDIT_CLIENT_ID || "";
const DIDIT_BASE_URL = process.env.DIDIT_BASE_URL || "https://api.didit.me";

const diditHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${DIDIT_API_KEY}`,
  "X-Client-Id": DIDIT_CLIENT_ID,
});

const normalizeDiditStatus = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "verified" || s === "completed") return "approved";
  if (s === "rejected" || s === "declined" || s === "failed") return "rejected";
  if (s === "pending" || s === "in_progress" || s === "processing") return "pending";
  return "pending";
};

app.post("/api/kyc/didit/session", async (req, res) => {
  try {
    if (!DIDIT_API_KEY || !DIDIT_CLIENT_ID) {
      return res.status(500).json({ message: "Didit KYC is not configured." });
    }

    const { userId, email, fullName, country, phone, role } = req.body || {};
    if (!userId || !role) {
      return res.status(400).json({ message: "userId and role are required." });
    }

    // Create Didit verification session
    const payload = {
      user_id: userId,
      email: email || undefined,
      full_name: fullName || undefined,
      country: country || undefined,
      phone: phone || undefined,
      metadata: {
        role,
        platform: "coursevia",
      },
      callback_url: `${APP_URL}/api/kyc/didit/webhook`,
      redirect_url: `${APP_URL}/dashboard`,
    };

    const response = await fetch(`${DIDIT_BASE_URL}/v1/verifications`, {
      method: "POST",
      headers: diditHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error("Didit API error:", json);
      return res.status(response.status).json({
        message: json?.message || "Could not create Didit verification session.",
        details: json,
      });
    }

    const verificationId = json?.id || json?.verification_id;
    const verificationUrl = json?.url || json?.verification_url;

    // Store verification request in database
    if (supabaseAdmin && verificationId) {
      await supabaseAdmin.from("verification_requests").insert({
        user_id: userId,
        verification_type: "provider_identity",
        provider: "didit",
        inquiry_id: verificationId,
        status: "pending",
        verification_method: "api",
        decision_payload: json,
      });
    }

    return res.json({
      provider: "didit",
      verificationId,
      verificationUrl,
      clientId: DIDIT_CLIENT_ID,
    });
  } catch (error) {
    console.error("Didit session error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Unknown KYC error.",
    });
  }
});

app.post("/api/kyc/didit/webhook", async (req, res) => {
  try {
    const payload = req.body || {};
    const eventType = payload?.event || payload?.type || "unknown";
    const verification = payload?.verification || payload?.data || {};
    const verificationId = verification?.id || payload?.verification_id;
    const userId = verification?.user_id || payload?.user_id;
    const rawStatus = verification?.status || payload?.status || "pending";
    const status = normalizeDiditStatus(rawStatus);

    console.log("Didit webhook received:", {
      eventType,
      verificationId,
      userId,
      status,
    });

    if (supabaseAdmin && userId && verificationId) {
      // Update profile KYC status
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          kyc_status: status,
          kyc_provider: "didit",
          kyc_inquiry_id: verificationId,
          is_verified: status === "approved",
          verified_at: status === "approved" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (profileError) {
        console.error("Didit webhook profile update error:", profileError);
      }

      // Update verification request
      const { error: requestError } = await supabaseAdmin
        .from("verification_requests")
        .update({
          status,
          decision_payload: payload,
          reviewed_at: new Date().toISOString(),
        })
        .eq("inquiry_id", verificationId)
        .eq("user_id", userId);

      if (requestError) {
        console.error("Didit webhook request update error:", requestError);
      }

      // Log verification event
      await supabaseAdmin.from("provider_verification_events").insert({
        user_id: userId,
        provider: "didit",
        inquiry_id: verificationId,
        event_type: eventType,
        payload,
      });
    }

    return res.json({
      received: true,
      provider: "didit",
      eventType,
      verificationId,
      userId,
      status,
    });
  } catch (error) {
    console.error("Didit webhook error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Webhook processing failed.",
    });
  }
});

// Get Didit verification status
app.get("/api/kyc/didit/status/:verificationId", async (req, res) => {
  try {
    if (!DIDIT_API_KEY || !DIDIT_CLIENT_ID) {
      return res.status(500).json({ message: "Didit KYC is not configured." });
    }

    const { verificationId } = req.params;

    const response = await fetch(`${DIDIT_BASE_URL}/v1/verifications/${verificationId}`, {
      method: "GET",
      headers: diditHeaders(),
    });

    const json = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Could not fetch verification status.",
        details: json,
      });
    }

    const status = normalizeDiditStatus(json?.status);

    return res.json({
      verificationId,
      status,
      data: json,
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Status check failed.",
    });
  }
});
