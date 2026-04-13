/**
 * Checkout.com Frames v2 inline card payment component.
 * Waits for both the SDK and the DOM container before initialising.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildBackendUrl } from "@/lib/backendApi";
import { Lock, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

declare global { interface Window { Frames: any } }

const PUBLIC_KEY = import.meta.env.VITE_CHECKOUT_PUBLIC_KEY || "";

type Props = {
  reference: string;
  amount: number;
  currency?: string;
  email: string;
  userId: string;
  type: string;
  contentId?: string | null;
  plan?: string | null;
  onSuccess: (result: any) => void;
  onError: (msg: string) => void;
};

const CheckoutFrames = ({ reference, amount, currency = "USD", email, userId, type, contentId, plan, onSuccess, onError }: Props) => {
  const [ready, setReady]         = useState(false);
  const [cardValid, setCardValid] = useState(false);
  const [paying, setPaying]       = useState(false);
  const [frameError, setFrameError] = useState("");
  const [sdkMissing, setSdkMissing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized  = useRef(false);

  useEffect(() => {
    let attempts = 0;
    // Poll until both SDK and container are ready (max 5s)
    const poll = setInterval(() => {
      attempts++;
      const container = containerRef.current;
      const sdk = window.Frames;

      if (sdk && container && !initialized.current) {
        clearInterval(poll);
        initialized.current = true;
        initFrames(sdk, container);
        return;
      }
      if (attempts > 50) {
        clearInterval(poll);
        setSdkMissing(true);
      }
    }, 100);

    return () => {
      clearInterval(poll);
      try { window.Frames?.removeAllEventHandlers?.(); } catch { /* ignore */ }
    };
  }, []);

  const initFrames = (sdk: any, container: HTMLElement) => {
    try {
      sdk.init({
        publicKey: PUBLIC_KEY,
        containerSelector: "#cko-frames-container",
        style: {
          base: { fontSize: "15px", color: "#1e293b", fontFamily: "inherit", lineHeight: "1.5" },
          invalid: { color: "#ef4444" },
          placeholder: { base: { color: "#94a3b8" } },
        },
      });

      sdk.addEventHandler(sdk.Events.READY, () => setReady(true));

      sdk.addEventHandler(sdk.Events.FRAME_VALIDATION_CHANGED, () => {
        const valid = sdk.isCardValid();
        setCardValid(valid);
        setFrameError(valid ? "" : "");
      });

      sdk.addEventHandler(sdk.Events.CARD_VALIDATION_CHANGED, () => {
        setCardValid(sdk.isCardValid());
      });

      sdk.addEventHandler(sdk.Events.CARD_TOKENIZED, async (e: any) => {
        const token = e?.token;
        if (!token) { onError("Card tokenization failed."); setPaying(false); return; }

        try {
          const res = await fetch(buildBackendUrl("/api/checkout/charge"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, email, user_id: userId, type, amount, currency, content_id: contentId, plan }),
          });
          const json = await res.json().catch(() => ({}));

          // 3DS redirect
          if (json?.requires_action && json?.redirect_url) {
            window.location.assign(json.redirect_url);
            return;
          }

          if (!res.ok || !json.success) {
            onError(json?.message || "Payment failed. Please try again.");
            setPaying(false);
            try { sdk.enableSubmitForm(); } catch { /* ignore */ }
            return;
          }
          onSuccess(json);
        } catch (err: any) {
          onError(err?.message || "Payment failed.");
          setPaying(false);
          try { sdk.enableSubmitForm(); } catch { /* ignore */ }
        }
      });

      sdk.addEventHandler(sdk.Events.CARD_TOKENIZATION_FAILED, () => {
        onError("Card tokenization failed. Check your card details.");
        setPaying(false);
      });

    } catch (err: any) {
      setSdkMissing(true);
    }
  };

  const handlePay = () => {
    if (!cardValid || paying || !window.Frames) return;
    setPaying(true);
    setFrameError("");
    try { window.Frames.submitCard(); }
    catch { onError("Could not submit card. Please refresh and try again."); setPaying(false); }
  };

  if (sdkMissing) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-700">Secure card form failed to load</p>
          <p className="text-xs text-red-600 mt-0.5">Check your internet connection and refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SDK injects card fields into this div */}
      <div
        id="cko-frames-container"
        ref={containerRef}
        className={`rounded-xl border bg-white px-4 py-3.5 min-h-[52px] transition-all ${
          !ready ? "animate-pulse bg-slate-50 border-slate-100" : "border-slate-200 shadow-sm"
        }`}
      />

      {frameError && <p className="text-xs text-red-500">{frameError}</p>}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock size={11} /> 256-bit TLS · PCI DSS compliant via Checkout.com
      </div>

      <Button
        onClick={handlePay}
        disabled={!ready || !cardValid || paying}
        className="w-full bg-[#0b7e84] hover:bg-[#096a70] text-white"
      >
        {paying
          ? <><Loader2 size={15} className="animate-spin mr-2" /> Processing…</>
          : <><ShieldCheck size={15} className="mr-2" /> Pay ${Number(amount).toFixed(2)}</>
        }
      </Button>

      {!ready && <p className="text-xs text-center text-muted-foreground">Loading secure card form…</p>}
    </div>
  );
};

export default CheckoutFrames;
