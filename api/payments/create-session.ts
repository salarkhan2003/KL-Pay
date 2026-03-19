import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSplitOrder, ADMIN_VPA, APP_URL } from "../_cashfree";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { amount, customerId, orderId, customerPhone, customerEmail, customerName, merchantVpa, token, outletName } = req.body;
    const data = await createSplitOrder({
      orderId,
      totalAmount: amount,
      merchantVpa: merchantVpa || ADMIN_VPA,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl: `${APP_URL}/?order_id={order_id}`,
      flow: "Food_Order",
      note: token ? `token:${token}` : "",
      orderTags: { token: token || orderId, outletName: outletName || "" },
    });
    res.json(data);
  } catch (error: any) {
    console.error("create-session error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
}
