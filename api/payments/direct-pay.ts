import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSplitOrder, APP_URL } from "../_cashfree";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { amount, customerId, customerName, customerEmail, customerPhone, merchantVpa, outletId, outletName, note } = req.body;
    if (!amount || amount < 2) return res.status(400).json({ error: "Minimum amount is ₹2" });

    const orderId = `KLP_DP_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const data = await createSplitOrder({
      orderId,
      totalAmount: amount,
      merchantVpa,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl: `${APP_URL}/?dp_order_id={order_id}`,
      flow: "Peer_to_Merchant_Pay",
      note,
    });
    res.json({ ...(data as object), orderId });
  } catch (error: any) {
    console.error("direct-pay error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
}
