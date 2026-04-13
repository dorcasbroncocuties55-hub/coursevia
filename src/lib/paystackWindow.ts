/**
 * @deprecated Use checkoutWindow.ts instead.
 * This file is a compatibility shim — all exports delegate to checkoutWindow.ts.
 */
export {
  COURSEVIA_CHECKOUT_MESSAGE_TYPE as COURSEVIA_PAYSTACK_MESSAGE_TYPE,
  openSecureCheckoutWindow,
  type CheckoutWindowConfig,
} from "@/lib/checkoutWindow";
