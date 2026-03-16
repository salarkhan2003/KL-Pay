import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Cashfree } from "cashfree-pg";
import dotenv from 'dotenv';

dotenv.config();

const cashfree: any = Cashfree;
cashfree.XClientId = process.env.CASHFREE_APP_ID;
cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
// Use string directly if Environment enum is not available on the object
cashfree.XEnvironment = "PRODUCTION"; 

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/payments/create-session", async (req, res) => {
    try {
      const { amount, customerId, orderId, customerPhone, customerEmail, customerName } = req.body;

      const request = {
        order_amount: amount,
        order_currency: "INR",
        order_id: orderId,
        customer_details: {
          customer_id: customerId,
          customer_phone: customerPhone || "9999999999",
          customer_email: customerEmail,
          customer_name: customerName || "Customer"
        },
        order_meta: {
          return_url: `${process.env.APP_URL || 'http://localhost:3000'}/?order_id={order_id}`
        }
      };

      const response = await (Cashfree as any).PGCreateOrder("2023-08-01", request);
      res.json(response.data);
    } catch (error: any) {
      console.error('Cashfree Error:', error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
