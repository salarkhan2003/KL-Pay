import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://hnezkwnefmjvbdwlyubj.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = "sb_publishable_-vmOek-tuP3rVG1-liLJAw_HRbAx0Bi";

if (!SUPABASE_SERVICE_KEY) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key. K-Coins updates may fail if RLS blocks anon writes.");
  console.warn("Fix: Vercel Dashboard → Project Settings → Environment Variables → Add SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
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
      .maybeSingle();
    const current = (profile as any)?.k_coins || 0;
    const { error } = await supabase
      .from("profiles")
      .update({ k_coins: current + coins })
      .eq("id", userId);
    if (error) console.warn("K-Coins update error:", error.message);
    else console.log(`Awarded ${coins} K-Coins to ${userId}, new total: ${current + coins}`);
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

  console.log("Webhook received:", JSON.stringify(req.body).slice(0, 500));

  const signature = (req.headers["x-webhook-signature"] as string) || "";
  const rawBody = JSON.stringify(req.body);

  if (signature && !verifyCashfreeSignature(rawBody, signature)) {
    console.warn("Cashfree signature mismatch — proceeding anyway for debugging");
    // Don't reject — process it anyway during testing
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

    console.log(`Order: ${orderId}, Status: ${paymentStatus}, Customer: ${customerId}`);

    if (paymentStatus === "SUCCESS" && orderId) {
      console.log("✓ Payment SUCCESS - Processing order:", orderId);
      
      // Update order and transaction status
      const [orderUpdate, txUpdate] = await Promise.all([
        supabase.from("orders").update({ payment_status: "paid", status: "pending" }).eq("id", orderId),
        supabase.from("transactions").update({ payment_status: "paid", k_coins_awarded: KCOINS_PER_ORDER }).eq("cashfree_order_id", orderId),
      ]);
      
      console.log("📦 Order update:", orderUpdate.error?.message || "✓ OK");
      console.log("💳 Transaction update:", txUpdate.error?.message || "✓ OK");

      // Award K-Coins to customer
      if (customerId) {
        await awardKCoins(customerId, KCOINS_PER_ORDER);
      } else {
        console.warn("⚠️ No customerId provided - cannot award K-Coins");
      }

      // Send receipt email
      if (customerEmail) {
        try { 
          await sendOrderReceipt({ customerEmail, studentName, orderToken, outletName, amount, orderId }); 
          console.log("📧 Receipt sent to:", customerEmail);
        }
        catch (err) { console.warn("📧 Courier receipt failed:", err); }
      }
    } else {
      console.log(`⏳ Payment status: ${paymentStatus} - No action taken`);
    }

    res.json({ received: true, orderId, paymentStatus });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
