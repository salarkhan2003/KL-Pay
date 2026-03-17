import type { VercelRequest, VercelResponse } from "@vercel/node";

// Webhook: Cashfree calls this after payment.
// We update Firestore via REST API — no firebase-admin package needed.
async function updateFirestore(orderId: string, paymentId: string) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const dbId      = process.env.VITE_FIREBASE_DATABASE_ID || "(default)";
  if (!projectId) return; // env vars not set — skip silently

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/transactions/${orderId}?updateMask.fieldPaths=paymentStatus&updateMask.fieldPaths=cashfreePaymentId&updateMask.fieldPaths=kCoinsAwarded`;

  await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        paymentStatus:      { stringValue: "paid" },
        cashfreePaymentId:  { stringValue: paymentId },
        kCoinsAwarded:      { integerValue: "5" },
      },
    }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const event         = req.body;
    const orderId       = event?.data?.order?.order_id       || "";
    const paymentStatus = event?.data?.payment?.payment_status || "";
    const paymentId     = event?.data?.payment?.cf_payment_id  || "";

    if (paymentStatus === "SUCCESS" && orderId) {
      try {
        await updateFirestore(orderId, paymentId);
      } catch (err) {
        console.warn("Webhook Firestore update failed:", err);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
