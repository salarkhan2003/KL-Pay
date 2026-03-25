import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://hnezkwnefmjvbdwlyubj.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-vmOek-tuP3rVG1-liLJAw_HRbAx0Bi"
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const results: Record<string, any> = {
    env: {
      has_cashfree_app_id: !!process.env.CASHFREE_APP_ID,
      has_cashfree_secret: !!process.env.CASHFREE_SECRET_KEY,
      has_supabase_url: !!process.env.SUPABASE_URL,
      has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      app_url: process.env.APP_URL || "https://kl-one-rho.vercel.app",
    },
  };

  // Check tables exist and count rows
  for (const table of ["profiles", "outlets", "orders", "transactions", "menu_items"]) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    results[table] = error ? `ERROR: ${error.message}` : `${count} rows`;
  }

  // Last 3 orders
  const { data: orders } = await supabase.from("orders").select("id,student_id,outlet_id,total_amount,payment_status,status,created_at").order("created_at", { ascending: false }).limit(3);
  results.recent_orders = orders || [];

  // Last 3 transactions
  const { data: txs } = await supabase.from("transactions").select("id,student_id,outlet_name,total_amount,payment_status,created_at").order("created_at", { ascending: false }).limit(3);
  results.recent_transactions = txs || [];

  res.json(results);
}
