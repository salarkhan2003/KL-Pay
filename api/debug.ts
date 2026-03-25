import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://hnezkwnefmjvbdwlyubj.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_KEY || "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const results: Record<string, any> = {
    status: SUPABASE_SERVICE_KEY ? "✅ Service key configured" : "❌ CRITICAL: Service key missing!",
    env: {
      CASHFREE_APP_ID: process.env.CASHFREE_APP_ID ? "✓ Set" : "✗ Missing",
      CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY ? "✓ Set" : "✗ Missing",
      SUPABASE_URL: SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY ? `✓ Set (${SUPABASE_SERVICE_KEY.substring(0, 20)}...)` : "❌ MISSING - WEBHOOKS WILL FAIL!",
      ADMIN_VPA: process.env.ADMIN_VPA || "✗ Missing",
      APP_URL: process.env.APP_URL || "https://kl-one-rho.vercel.app",
      COURIER_AUTH_TOKEN: process.env.COURIER_AUTH_TOKEN ? "✓ Set" : "✗ Missing (optional)",
    },
  };

  if (!SUPABASE_SERVICE_KEY) {
    results.error = "SUPABASE_SERVICE_ROLE_KEY not set in Vercel environment variables!";
    results.fix = "Go to Vercel Dashboard → Settings → Environment Variables → Add SUPABASE_SERVICE_ROLE_KEY";
    return res.json(results);
  }

  // Test database access
  for (const table of ["profiles", "outlets", "orders", "transactions", "menu_items"]) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    results[table] = error ? `❌ ERROR: ${error.message}` : `✓ ${count} rows`;
  }

  const { data: orders } = await supabase.from("orders").select("id,student_id,outlet_id,total_amount,payment_status,status,created_at").order("created_at", { ascending: false }).limit(5);
  results.recent_orders = orders || [];

  const { data: txs } = await supabase.from("transactions").select("id,student_id,outlet_name,total_amount,payment_status,k_coins_awarded,created_at").order("created_at", { ascending: false }).limit(5);
  results.recent_transactions = txs || [];

  res.json(results);
}
