import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const ANON_KEY = "sb_publishable_-vmOek-tuP3rVG1-liLJAw_HRbAx0Bi";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://hnezkwnefmjvbdwlyubj.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const results: Record<string, any> = {
    env: {
      has_cashfree_app_id: !!process.env.CASHFREE_APP_ID,
      has_cashfree_secret: !!process.env.CASHFREE_SECRET_KEY,
      has_supabase_url: !!process.env.SUPABASE_URL,
      has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      service_role_key_length: serviceRoleKey.length,
      service_role_key_prefix: serviceRoleKey.substring(0, 20),
      has_anon_key_env: !!process.env.SUPABASE_ANON_KEY,
      using_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : process.env.SUPABASE_ANON_KEY ? "anon_env" : "anon_hardcoded",
      app_url: process.env.APP_URL || "https://kl-one-rho.vercel.app",
    },
  };

  for (const table of ["profiles", "outlets", "orders", "transactions", "menu_items"]) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    results[table] = error ? `ERROR: ${error.message} (code: ${error.code}, details: ${error.details})` : `${count} rows`;
  }

  const { data: orders } = await supabase.from("orders").select("id,student_id,outlet_id,total_amount,payment_status,status,created_at").order("created_at", { ascending: false }).limit(5);
  results.recent_orders = orders || [];

  const { data: txs } = await supabase.from("transactions").select("id,student_id,outlet_name,total_amount,payment_status,created_at").order("created_at", { ascending: false }).limit(5);
  results.recent_transactions = txs || [];

  res.json(results);
}
