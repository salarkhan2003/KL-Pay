import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

const KCOINS_PER_ORDER = 5;

function verifyCashfreeSignature(body: string, signature: string): boolean {
  const secret = process.env.CASHFREE_SECRET_KEY || "";
  const computed = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return computed === signature;
}

async function awardKCoins(userId: string, coins: number): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("k_coins")
      .eq("id", userId)
      .single();
    const current = (profile as any)?.k_coins || 0;
    await supabase
      .from("profiles")
      .update({ k_coins: current + coins, updated_at: new Date().toISOString() })
      .eq("id", userId);
    console.log(`Awarded ${coins} K-Coins to ${userId}`);
  } catch (err) {
    console.warn("K-Coins award failed:", err);
  }
}

async function sendOrderReceipt(params: {
  customerEmail: string;
  studentName: string;
  orderToken: string;
  outletName: string;
  amount: number;
  orderId: string;
}) {
  if (!process.env.COURIER_AUTH_TOKEN) return;
  const response = await fetch("https://api.courier.com/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.COURIER_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        to: { email: params.customerEmail },
        template: "KL_ONE_ORDER_RECEIPT",
        data: {
          userName: params.studentName,
          token: params.orderToken,
          outletName: params.outletName,
          amount: params.amount,
          orderId: params.orderId,
        },
      },
    }),
  });
  const result = await response.json() as { requestId?: string };
  console.log("Courier Status:", result.requestId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const signature = (req.headers["x-webhook-signature"] as string) || "";
  const rawBody = JSON.stringify(req.body);

  if (signature && !verifyCashfreeSignature(rawBody, signature)) {
    console.warn("Cashfree signature mismatch");
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const event = req.body;
    const orderId       = event?.data?.order?.order_id || "";
    const paymentStatus = event?.data?.payment?.payment_status || "";
    const amount        = event?.data?.order?.order_amount || 0;
    const customerEmail = event?.data?.customer_details?.customer_email || "";
    const studentName   = event?.data?.customer_details?.customer_name || "Student";
    const customerId    = event?.data?.customer_details?.customer_id || "";
    const orderToken    = event?.data?.order?.order_tags?.token || orderId;
    const outletName    = event?.data?.order?.order_tags?.outletName || "KL One Outlet";

    if (paymentStatus === "SUCCESS" && orderId) {
      // Award K-Coins via Supabase
      if (customerId) {
        await awardKCoins(customerId, KCOINS_PER_ORDER);
      }

      // Send receipt email
      if (customerEmail) {
        try {
          await sendOrderReceipt({ customerEmail, studentName, orderToken, outletName, amount, orderId });
        } catch (err) {
          console.warn("Courier receipt failed:", err);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
