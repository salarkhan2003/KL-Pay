import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PLATFORM_FEE, ADMIN_VPA } from "./_cashfree";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ status: "ok", platform_fee: PLATFORM_FEE, admin_vpa: ADMIN_VPA });
}
