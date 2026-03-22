import type { VercelRequest, VercelResponse } from "@vercel/node";

// Supabase calls this webhook when a new user signs up
// Sends a welcome email via Courier (no email confirmation needed)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const record = req.body?.record;
    const email  = record?.email || req.body?.email;
    const userId = record?.id    || req.body?.id;

    if (!email) return res.status(400).json({ error: "No email in payload" });

    const response = await fetch("https://api.courier.com/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.COURIER_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          to: { email },
          template: "KL_ONE_WELCOME",
          data: { userId },
        },
      }),
    });

    const result = await response.json();
    console.log("Courier Welcome requestId:", result.requestId);
    res.json({ success: true, requestId: result.requestId });
  } catch (err: any) {
    console.error("Welcome webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
