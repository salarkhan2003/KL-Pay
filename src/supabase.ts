import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     || 'https://hnezkwnefmjvbdwlyubj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-vmOek-tuP3rVG1-liLJAw_HRbAx0Bi';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export function extractStudentId(email: string): string | null {
  const match = email.match(/^(\d{10})@kluniversity\.in$/i);
  return match ? match[1] : null;
}

// ── profiles ──────────────────────────────────────────────────────────────────
export async function upsertProfile(p: {
  id: string; email: string; display_name: string; role: string;
  phone?: string | null; student_id?: string | null; gender?: string | null;
  hostel?: string | null; k_coins?: number; streak?: number; block?: string;
  merchant_outlet_id?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) console.warn('upsertProfile:', error.message);
}

export async function getProfile(id: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
  return data;
}

export async function updateProfileFields(id: string, fields: Record<string, any>) {
  await supabase.from('profiles').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function awardKCoinsSupabase(userId: string, coins: number): Promise<number> {
  const { data: profile } = await supabase.from('profiles').select('k_coins').eq('id', userId).single();
  const current = (profile as any)?.k_coins || 0;
  const next = current + coins;
  await supabase.from('profiles').update({ k_coins: next, updated_at: new Date().toISOString() }).eq('id', userId);
  return next;
}

// ── outlets ───────────────────────────────────────────────────────────────────
export async function upsertOutlet(outlet: any) {
  const { error } = await supabase.from('outlets').upsert(outlet, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteOutletDb(id: string) {
  await supabase.from('outlets').delete().eq('id', id);
}

// ── menu_items ────────────────────────────────────────────────────────────────
export async function upsertMenuItem(item: any) {
  const { error } = await supabase.from('menu_items').upsert(item, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteMenuItemDb(id: string) {
  await supabase.from('menu_items').delete().eq('id', id);
}

// ── orders ────────────────────────────────────────────────────────────────────
export async function insertOrder(order: any) {
  const { error } = await supabase.from('orders').upsert(order, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateOrderStatusDb(id: string, status: string) {
  await supabase.from('orders').update({ status }).eq('id', id);
}

export async function deleteOrderDb(id: string) {
  await supabase.from('orders').delete().eq('id', id);
}

// ── transactions ──────────────────────────────────────────────────────────────
export async function upsertTransaction(tx: any) {
  const { error } = await supabase.from('transactions').upsert(tx, { onConflict: 'id' });
  if (error) throw error;
}

// ── support_tickets ───────────────────────────────────────────────────────────
export async function insertSupportTicket(ticket: any) {
  const { error } = await supabase.from('support_tickets').insert(ticket);
  if (error) throw error;
}

// ── row mappers ───────────────────────────────────────────────────────────────
export function rowToOutlet(r: any) {
  return { id: r.id, name: r.name, description: r.description || '', imageUrl: r.image_url || '', isOpen: r.is_open ?? true, merchantId: r.merchant_id || '', blockName: r.block_name || '', category: r.category || '', upiId: r.upi_id || '', timings: r.timings, rating: r.rating };
}

export function rowToMenuItem(r: any) {
  return { id: r.id, outletId: r.outlet_id, name: r.name, description: r.description || '', price: r.price, imageUrl: r.image_url || '', category: r.category, isAvailable: r.is_available ?? true, prepTime: r.prep_time };
}

export function rowToOrder(r: any) {
  return { id: r.id, studentId: r.student_id, outletId: r.outlet_id, userName: r.user_name, userPhone: r.user_phone, items: r.items || [], totalAmount: r.total_amount, convenienceFee: r.convenience_fee, vendorAmount: r.vendor_amount, status: r.status, paymentStatus: r.payment_status, token: r.token, createdAt: r.created_at };
}

export function rowToTransaction(r: any) {
  return { id: r.id, flow: r.flow, studentId: r.student_id, studentName: r.student_name, studentPhone: r.student_phone, outletId: r.outlet_id, outletName: r.outlet_name, merchantVpa: r.merchant_vpa, totalAmount: r.total_amount, platformFee: r.platform_fee, vendorAmount: r.vendor_amount, paymentStatus: r.payment_status, cashfreeOrderId: r.cashfree_order_id, cashfreePaymentId: r.cashfree_payment_id, kCoinsAwarded: r.k_coins_awarded, createdAt: r.created_at, orderId: r.order_id, token: r.token, note: r.note };
}

export function rowToSupportTicket(r: any) {
  return { id: r.id, userId: r.user_id, subject: r.subject, message: r.message, status: r.status, createdAt: r.created_at };
}
