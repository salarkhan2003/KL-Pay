import type { VercelRequest, VercelResponse } from "@vercel/node";

// Called after a successful Cashfree payment to send order receipt via Courier
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { customerEmail, studentName, orderToken, outletName, amount, orderId } = req.body;

    if (!customerEmail) return res.status(400).json({ error: "No email provided" });

    const response = await fetch("https://api.courier.com/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.COURIER_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          to: { email: customerEmail },
          template: "KL_ONE_ORDER_RECEIPT",
          data: {
            userName:   studentName,
            token:      orderToken,
            outletName: outletName,
            amount:     amount,
            orderId:    orderId,
          },
        },
      }),
    });

    const result = await response.json() as { requestId?: string };
    console.log("Courier Order Receipt requestId:", result.requestId);
    res.json({ success: true, requestId: result.requestId });
  } catch (err: any) {
    console.error("Order webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
