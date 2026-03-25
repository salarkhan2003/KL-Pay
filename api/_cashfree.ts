// Shared Cashfree setup for all Vercel API routes

const appId     = process.env.CASHFREE_APP_ID     || "";
const secretKey = process.env.CASHFREE_SECRET_KEY || "";

export const ADMIN_VPA    = process.env.ADMIN_VPA || "7993547438@kotak811";
export const PLATFORM_FEE = 2.5;
export const APP_URL      = (process.env.APP_URL || "https://kl-one-rho.vercel.app").replace(/\/$/, "");

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
  orderTags?: Record<string, string>;
}) {
  if (!appId || !secretKey) {
    throw new Error("Cashfree credentials not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Vercel environment variables.");
  }

  const response = await fetch(
    `https://api.cashfree.com/pg/orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify({
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
        order_tags: { flow: params.flow, note: params.note || "", ...params.orderTags },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }

  return response.json();
}
