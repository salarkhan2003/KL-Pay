import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createSplitOrder, APP_URL } from "../_cashfree";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://hnezkwnefmjvbdwlyubj.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_-vmOek-tuP3rVG1-liLJAw_HRbAx0Bi";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const {
      amount, customerId, customerName, customerEmail, customerPhone,
      merchantVpa, outletId, outletName, note,
    } = req.body;

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

    // Insert a pending transaction into Supabase — merchant gets the alert
    // via their Supabase Realtime subscription on the transactions table.
    // (Socket.io is not available on Vercel serverless)
    await supabase.from("transactions").upsert({
      id: orderId,
      flow: "Peer_to_Merchant_Pay",
      student_id: customerId,
      student_name: customerName,
      student_phone: customerPhone || "",
      outlet_id: outletId || "",
      outlet_name: outletName || "",
      merchant_vpa: merchantVpa || "",
      total_amount: amount,
      platform_fee: 2.5,
      vendor_amount: amount - 2.5,
      payment_status: "pending",
      cashfree_order_id: orderId,
      k_coins_awarded: 0,
      note: note || "",
      created_at: new Date().toISOString(),
    }, { onConflict: "id" });

    res.json({ ...(data as object), orderId });
  } catch (error: any) {
    console.error("direct-pay error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
}
