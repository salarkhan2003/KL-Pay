import type { VercelRequest, VercelResponse } from "@vercel/node";
// Webhook: Cashfree calls this after payment — we update Firestore directly
// Socket.io is not available on Vercel; Firestore onSnapshot handles real-time on client
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const event = req.body;
    const orderId: string      = event?.data?.order?.order_id || "";
    const paymentStatus: string = event?.data?.payment?.payment_status || "";

    if (paymentStatus === "SUCCESS" && orderId) {
      try {
        const db = getAdminDb();
        await db.collection("transactions").doc(orderId).update({
          paymentStatus: "paid",
          cashfreePaymentId: event?.data?.payment?.cf_payment_id || "",
          kCoinsAwarded: 5,
        });
      } catch (fbErr) {
        // Firebase Admin not configured — client-side confirmPayment handles this
        console.warn("Webhook Firestore update skipped:", fbErr);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
