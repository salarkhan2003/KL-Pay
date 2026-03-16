import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import dotenv from "dotenv";

dotenv.config();

// ── Cashfree setup — v5 uses instance, not static ─────────────────────────────
const cf = new Cashfree();
(Cashfree as any).XClientId     = process.env.CASHFREE_APP_ID;
(Cashfree as any).XClientSecret = process.env.CASHFREE_SECRET_KEY;
(Cashfree as any).XEnvironment  =
  process.env.CASHFREE_ENV === "sandbox" ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;

// ── Admin VPA (receives ₹1 platform fee on every transaction) ─────────────────
const ADMIN_VPA = process.env.ADMIN_VPA || "salarkhan@okaxis";
const PLATFORM_FEE = 1; // ₹1 flat

// ── PaymentEngine ─────────────────────────────────────────────────────────────
// Builds a Cashfree order with split: ₹1 → admin, remainder → merchant_vpa
async function createSplitOrder(params: {
  orderId: string;
  totalAmount: number;
  merchantVpa: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  flow: "Food_Order" | "Peer_to_Merchant_Pay";
  note?: string;
}) {
  const vendorAmount = params.totalAmount - PLATFORM_FEE;

  const request: any = {
    order_amount: params.totalAmount,
    order_currency: "INR",
    order_id: params.orderId,
    customer_details: {
      customer_id: params.customerId,
      customer_phone: params.customerPhone || "9999999999",
      customer_email: params.customerEmail,
      customer_name: params.customerName || "KLU Student",
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: `${process.env.APP_URL || "http://localhost:3000"}/api/payments/webhook`,
    },
    order_tags: {
      flow: params.flow,
      note: params.note || "",
    },
    // Cashfree Split — vendor gets remainder, admin gets ₹1
    order_splits: [
      {
        vendor_id: params.merchantVpa,
        amount: vendorAmount,
        percentage: null,
      },
      {
        vendor_id: ADMIN_VPA,
        amount: PLATFORM_FEE,
        percentage: null,
      },
    ],
  };

  const response = await cf.PGCreateOrder("2023-08-01", request);
  return response.data;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // ── Socket.io ─────────────────────────────────────────────────────────────
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Merchants join a room named after their outletId
  io.on("connection", (socket) => {
    socket.on("join_outlet", (outletId: string) => {
      socket.join(`outlet:${outletId}`);
    });
    socket.on("disconnect", () => {});
  });

  // Expose io so routes can emit
  (app as any).io = io;

  app.use(express.json());

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", platform_fee: PLATFORM_FEE, admin_vpa: ADMIN_VPA });
  });

  // ── Food Order payment session ────────────────────────────────────────────
  app.post("/api/payments/create-session", async (req, res) => {
    try {
      const {
        amount, customerId, orderId,
        customerPhone, customerEmail, customerName,
        merchantVpa,
      } = req.body;

      const data = await createSplitOrder({
        orderId,
        totalAmount: amount,
        merchantVpa: merchantVpa || ADMIN_VPA,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        returnUrl: `${process.env.APP_URL || "http://localhost:3000"}/?order_id={order_id}`,
        flow: "Food_Order",
      });

      res.json(data);
    } catch (error: any) {
      console.error("Cashfree Food Order Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || error.message });
    }
  });

  // ── Direct Pay (counter scan) session ────────────────────────────────────
  app.post("/api/payments/direct-pay", async (req, res) => {
    try {
      const {
        amount, customerId, customerName, customerEmail, customerPhone,
        merchantVpa, outletId, outletName, note,
      } = req.body;

      if (!amount || amount < 2) {
        return res.status(400).json({ error: "Minimum amount is ₹2 (₹1 platform fee applies)" });
      }

      const orderId = `KLP_DP_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const data = await createSplitOrder({
        orderId,
        totalAmount: amount,
        merchantVpa,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        returnUrl: `${process.env.APP_URL || "http://localhost:3000"}/?dp_order_id={order_id}`,
        flow: "Peer_to_Merchant_Pay",
        note,
      });

      // Emit real-time alert to merchant room immediately (pending state)
      const ioInstance: SocketServer = (app as any).io;
      ioInstance.to(`outlet:${outletId}`).emit("payment_alert", {
        type: "Direct_Pay",
        status: "pending",
        amount,
        fromName: customerName,
        outletId,
        outletName,
        note,
        orderId,
        timestamp: Date.now(),
      });

      res.json({ ...data, orderId });
    } catch (error: any) {
      console.error("Cashfree Direct Pay Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || error.message });
    }
  });

  // ── Cashfree Webhook (payment confirmed) ─────────────────────────────────
  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const event = req.body;
      const orderId: string = event?.data?.order?.order_id || "";
      const paymentStatus: string = event?.data?.payment?.payment_status || "";
      const amount: number = event?.data?.order?.order_amount || 0;
      const fromName: string = event?.data?.customer_details?.customer_name || "Student";

      if (paymentStatus === "SUCCESS") {
        const isDirectPay = orderId.startsWith("KLP_DP_");
        const ioInstance: SocketServer = (app as any).io;

        // Broadcast to all outlets (Firestore will scope it properly)
        ioInstance.emit("payment_confirmed", {
          orderId,
          flow: isDirectPay ? "Peer_to_Merchant_Pay" : "Food_Order",
          amount,
          fromName,
          timestamp: Date.now(),
        });
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ── Vite / Static ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
    console.log(`Payment split: ₹${PLATFORM_FEE} → admin (${ADMIN_VPA}), remainder → merchant`);
  });
}

startServer();
