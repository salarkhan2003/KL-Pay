// Shared Cashfree setup for all API routes
import { Cashfree } from "cashfree-pg";

// Cashfree SDK v3+ uses static config — set before any call
(Cashfree as any).XClientId     = process.env.CASHFREE_APP_ID     || "";
(Cashfree as any).XClientSecret = process.env.CASHFREE_SECRET_KEY || "";
(Cashfree as any).XEnvironment  = process.env.CASHFREE_ENV === "sandbox" ? "SANDBOX" : "PRODUCTION";

export const ADMIN_VPA    = process.env.ADMIN_VPA || "salarkhan@okaxis";
export const PLATFORM_FEE = 1;
export const APP_URL      = process.env.APP_URL   || "https://kl-pay.vercel.app";

export async function createSplitOrder(params: {
  orderId: string;
  totalAmount: number;
  merchantVpa: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  flow: "Food_Order" | "Peer_to_Merchant_Pay";
  note?: string;
}) {
  const vendorAmount = params.totalAmount - PLATFORM_FEE;
  const request: any = {
    order_amount:   params.totalAmount,
    order_currency: "INR",
    order_id:       params.orderId,
    customer_details: {
      customer_id:    params.customerId,
      customer_phone: params.customerPhone || "9999999999",
      customer_email: params.customerEmail,
      customer_name:  params.customerName  || "KLU Student",
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: `${APP_URL}/api/payments/webhook`,
    },
    order_tags: { flow: params.flow, note: params.note || "" },
    order_splits: [
      { vendor_id: params.merchantVpa, amount: vendorAmount, percentage: null },
      { vendor_id: ADMIN_VPA,          amount: PLATFORM_FEE, percentage: null },
    ],
  };

  const response = await (Cashfree as any).PGCreateOrder("2023-08-01", request);
  return response.data;
}
