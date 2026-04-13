import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { verifyCheckout } from "@/lib/paymentGateway";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const getFallbackPath = (type?: string) => {
  switch (type) {
    case "booking":      return "/dashboard/bookings";
    case "course":       return "/dashboard/courses";
    case "video":        return "/dashboard/videos";
    case "subscription": return "/dashboard/subscription";
    default:             return "/dashboard";
  }
};

const SubscriptionCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus]         = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage]       = useState("Verifying your payment…");
  const [redirectTo, setRedirectTo] = useState("/dashboard");
  const [debugParams, setDebugParams] = useState<string>("");

  useEffect(() => {
    // Log ALL params Checkout.com sends back — helps debug
    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => { allParams[key] = value; });
    const paramStr = JSON.stringify(allParams, null, 2);
    setDebugParams(paramStr);
    console.log("[SubscriptionCallback] URL params:", allParams);

    // Try every possible param Checkout.com might send
    const reference =
      searchParams.get("reference") ||
      searchParams.get("cko-session-id") ||
      searchParams.get("payment_id") ||
      searchParams.get("session_id") ||
      searchParams.get("id") ||
      "";

    const failed =
      searchParams.get("failed") === "1" ||
      searchParams.get("status") === "failure" ||
      searchParams.get("cko-payment-status") === "Declined";

    if (failed) {
      setStatus("error");
      setMessage("Payment was not completed. Please try again.");
      return;
    }

    if (!reference) {
      setStatus("error");
      setMessage(`No payment reference found in callback URL. Params received: ${paramStr}`);
      return;
    }

    verifyCheckout(reference)
      .then((result) => {
        if (!result.success) {
          setStatus("error");
          setMessage(result.message || "Payment could not be verified.");
          return;
        }
        const dest = result.redirectTo || getFallbackPath((result.payment as any)?.type);
        setRedirectTo(dest);
        setMessage(result.message || "Payment verified successfully.");
        setStatus("success");
        navigate(dest, { replace: true });
      })
      .catch((err: any) => {
        setStatus("error");
        setMessage(err?.message || "Verification failed. Please contact support.");
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-8 shadow-sm text-center">

          {status === "loading" && (
            <>
              <Loader2 size={40} className="mx-auto animate-spin text-primary" />
              <p className="text-lg font-semibold text-foreground">Verifying payment…</p>
              <p className="text-sm text-muted-foreground">Please wait, do not close this page.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <p className="text-lg font-semibold text-foreground">Payment confirmed</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <p className="text-xs text-muted-foreground">Redirecting you now…</p>
              <Button className="w-full" onClick={() => navigate(redirectTo, { replace: true })}>
                Continue
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle size={40} className="mx-auto text-destructive" />
              <p className="text-lg font-semibold text-foreground">Payment not verified</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              {debugParams && (
                <pre className="mt-2 rounded-xl bg-slate-100 p-3 text-left text-xs text-slate-600 overflow-auto max-h-40">
                  {debugParams}
                </pre>
              )}
              <div className="flex gap-3 mt-2">
                <Button className="flex-1" onClick={() => navigate("/pricing")}>Try again</Button>
                <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              </div>
            </>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SubscriptionCallback;
