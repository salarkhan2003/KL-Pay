import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  
  // Create Order (Cashfree Simulation)
  app.post("/api/payments/create-order", async (req, res) => {
    const { amount, customerId, orderId, outletId } = req.body;
    
    // In a real app, you'd call Cashfree API here
    // const cashfreeResponse = await axios.post('https://api.cashfree.com/pg/orders', ...)
    
    // Split Settlement Logic:
    const convenienceFee = 1;
    const vendorAmount = amount - convenienceFee;
    
    console.log(`Order ${orderId} created. Total: ₹${amount}`);
    console.log(`Split: Platform (SalarKhan Patan) gets ₹${convenienceFee}, Vendor gets ₹${vendorAmount}`);

    // Return a mock payment session/link
    res.json({
      paymentSessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
      orderId: orderId,
      paymentUrl: `https://mock.cashfree.com/pay/${orderId}`
    });
  });

  // Cashfree Webhook Simulation
  app.post("/api/payments/webhook", (req, res) => {
    const { orderId, status } = req.body;
    console.log(`Webhook received for order ${orderId}: ${status}`);
    // Here you would update Firestore order status to 'paid'
    res.sendStatus(200);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KL Pay Server running on http://localhost:${PORT}`);
  });
}

startServer();
