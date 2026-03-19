import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

// Verify Cashfree webhook signature
function verifyCashfreeSignature(body: string, signature: string): boolean {
  const secret = process.env.CASHFREE_SECRET_KEY || "";
  const computed = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  return computed === signature;
}

async function sendOrderReceipt(params: {
  customerEmail: string;
  studentName: string;
  orderToken: string;
  outletName: string;
  amount: number;
  orderId: string;
}) {
  const response = await fetch("https://api.courier.com/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.COURIER_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        to: { email: params.customerEmail },
        template: "KL_ONE_ORDER_RECEIPT",
        data: {
          userName:   params.studentName,
          // ── This is the exact line where token is sent to Courier ──
          token:      params.orderToken,
          outletName: params.outletName,
          amount:     params.amount,
          orderId:    params.orderId,
        },
      },
    }),
  });
  const result = await response.json() as { requestId?: string };
  console.log("Courier Status:", result.requestId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Signature verification — reject before any processing ──
  const signature = req.headers["x-webhook-signature"] as string || "";
  const rawBody   = JSON.stringify(req.body);

  if (signature && !verifyCashfreeSignature(rawBody, signature)) {
    console.warn("Cashfree signature mismatch");
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const event         = req.body;
    const orderId       = event?.data?.order?.order_id         || "";
    const paymentStatus = event?.data?.payment?.payment_status  || "";
    const amount        = event?.data?.order?.order_amount      || 0;
    const customerEmail = event?.data?.customer_details?.customer_email || "";
    const studentName   = event?.data?.customer_details?.customer_name  || "Student";
    const orderToken    = event?.data?.order?.order_tags?.token          || orderId;
    const outletName    = event?.data?.order?.order_tags?.outletName     || "KL One Outlet";

    if (paymentStatus === "SUCCESS" && orderId && customerEmail) {
      try {
        await sendOrderReceipt({ customerEmail, studentName, orderToken, outletName, amount, orderId });
      } catch (err) {
        console.warn("Courier receipt failed:", err);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
