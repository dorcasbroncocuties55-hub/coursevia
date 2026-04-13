/**
 * Checkout.com secure popup window utility.
 * Opens a hosted payment page in a centred popup, listens for the
 * postMessage callback from the return URL, and calls onComplete.
 */

export const COURSEVIA_CHECKOUT_MESSAGE_TYPE = "COURSEVIA_CHECKOUT_SUCCESS";

export type CheckoutWindowConfig = {
  url: string;
  reference?: string;
  onOpened?: () => void;
  onBlocked?: () => void;
  onComplete?: (payload?: any) => void | Promise<void>;
  onCloseWithoutCallback?: () => void;
};

const isConfigObject = (
  value: string | CheckoutWindowConfig,
): value is CheckoutWindowConfig =>
  typeof value === "object" && value !== null && "url" in value;

export const openSecureCheckoutWindow = (
  input: string | CheckoutWindowConfig,
  legacyOnSuccess?: () => void,
): boolean => {
  const config: CheckoutWindowConfig = isConfigObject(input)
    ? input
    : { url: input, onComplete: legacyOnSuccess };

  const width = 620;
  const height = 760;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    config.url,
    "CourseviaCheckoutPopup",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`,
  );

  if (!popup) {
    config.onBlocked?.();
    return false;
  }

  config.onOpened?.();

  let completed = false;

  const finish = async (payload?: any) => {
    if (completed) return;
    completed = true;
    window.removeEventListener("message", messageHandler);
    try { popup.close(); } catch { /* ignore */ }
    await config.onComplete?.(payload);
  };

  const messageHandler = (event: MessageEvent) => {
    if (!event?.data) return;
    // Only accept messages from our own origin (the callback page is same-origin)
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    const type = typeof data === "object" ? data.type : null;
    if (
      type === COURSEVIA_CHECKOUT_MESSAGE_TYPE ||
      type === "COURSEVIA_PAYSTACK_SUCCESS"
    ) {
      void finish(data);
    }
  };

  window.addEventListener("message", messageHandler);

  const timer = window.setInterval(() => {
    if (!popup.closed) return;
    clearInterval(timer);
    window.removeEventListener("message", messageHandler);
    if (completed) return;

    // Popup closed without a postMessage callback.
    // Do NOT auto-complete — the user may have closed the window before paying.
    // Only call onCloseWithoutCallback so the caller can reset its loading state.
    config.onCloseWithoutCallback?.();
  }, 1000);

  return true;
};
