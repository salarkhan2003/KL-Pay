import { createClient } from '@supabase/supabase-js';
import { UserProfile, Outlet, MenuItem, Order, OrderItem, SupportTicket, Transaction } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hnezkwnefmjvbdwlyubj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-vmOek-tuP3rVG1-liLJAw_HRbAx0Bi';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});

export function extractStudentId(email: string): string | null {
  const match = email.match(/^(\d{10})@kluniversity\.in$/i);
  return match ? match[1] : null;
}

// ── Row mappers ───────────────────────────────────────────────────────────────

export function rowToProfile(r: any): UserProfile {
  return {
    uid: r.id,
    email: r.email,
    displayName: r.display_name,
    role: r.role,
    phone: r.phone || undefined,
    studentId: r.student_id || undefined,
    gender: r.gender || undefined,
    hostel: r.hostel || undefined,
    kCoins: r.k_coins ?? 0,
    streak: r.streak ?? 0,
    block: r.block || 'CSE',
    merchantOutletId: r.merchant_outlet_id || undefined,
    createdAt: r.created_at,
  };
}

export function rowToOutlet(r: any): Outlet {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    imageUrl: r.image_url || '',
    isOpen: r.is_open ?? true,
    merchantId: r.merchant_id || '',
    blockName: r.block_name || '',
    category: r.category || '',
    upiId: r.upi_id || '',
    timings: r.timings || undefined,
    rating: r.rating || undefined,
    totalOrders: r.total_orders || undefined,
  };
}

export function rowToMenuItem(r: any): MenuItem {
  return {
    id: r.id,
    outletId: r.outlet_id,
    name: r.name,
    description: r.description || '',
    price: r.price,
    imageUrl: r.image_url || '',
    category: r.category || '',
    isAvailable: r.is_available ?? true,
    prepTime: r.prep_time || undefined,
  };
}

export function rowToOrder(r: any): Order {
  return {
    id: r.id,
    studentId: r.student_id,
    outletId: r.outlet_id,
    userName: r.user_name || undefined,
    userPhone: r.user_phone || undefined,
    items: r.items || [],
    totalAmount: r.total_amount,
    convenienceFee: r.convenience_fee,
    vendorAmount: r.vendor_amount,
    status: r.status,
    paymentStatus: r.payment_status,
    token: r.token,
    createdAt: r.created_at,
    rating: r.rating || undefined,
    review: r.review || undefined,
  };
}

export function rowToTransaction(r: any): Transaction {
  return {
    id: r.id,
    flow: r.flow,
    studentId: r.student_id,
    studentName: r.student_name,
    studentPhone: r.student_phone || undefined,
    outletId: r.outlet_id,
    outletName: r.outlet_name,
    merchantVpa: r.merchant_vpa,
    totalAmount: r.total_amount,
    platformFee: r.platform_fee,
    vendorAmount: r.vendor_amount,
    paymentStatus: r.payment_status,
    cashfreeOrderId: r.cashfree_order_id,
    cashfreePaymentId: r.cashfree_payment_id || undefined,
    kCoinsAwarded: r.k_coins_awarded ?? 0,
    createdAt: r.created_at,
    orderId: r.order_id || undefined,
    token: r.token || undefined,
    note: r.note || undefined,
  };
}

export function rowToSupportTicket(r: any): SupportTicket {
  return {
    id: r.id,
    userId: r.user_id,
    orderId: r.order_id || undefined,
    subject: r.subject,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  };
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function upsertProfile(profile: {
  id: string; email: string; display_name: string; role: string;
  phone?: string | null; student_id?: string | null; gender?: string | null;
  hostel?: string | null; k_coins?: number; streak?: number; block?: string;
  merchant_outlet_id?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    { ...profile, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (error) console.warn('upsertProfile:', error.message);
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
  return data ? rowToProfile(data) : null;
}

export async function updateProfileFields(uid: string, fields: Partial<UserProfile>): Promise<void> {
  const row: any = { updated_at: new Date().toISOString() };
  if (fields.displayName !== undefined) row.display_name = fields.displayName;
  if (fields.phone !== undefined) row.phone = fields.phone;
  if (fields.role !== undefined) row.role = fields.role;
  if (fields.kCoins !== undefined) row.k_coins = fields.kCoins;
  if (fields.streak !== undefined) row.streak = fields.streak;
  if (fields.block !== undefined) row.block = fields.block;
  if (fields.merchantOutletId !== undefined) row.merchant_outlet_id = fields.merchantOutletId;
  if (fields.gender !== undefined) row.gender = fields.gender;
  if (fields.hostel !== undefined) row.hostel = fields.hostel;
  await supabase.from('profiles').update(row).eq('id', uid);
}

export async function awardKCoinsSupabase(userId: string, coins: number): Promise<number> {
  const { data, error } = await supabase.rpc('increment_kcoins', { user_id: userId, amount: coins });
  if (error) {
    const { data: p } = await supabase.from('profiles').select('k_coins').eq('id', userId).single();
    const current = (p as any)?.k_coins || 0;
    await supabase.from('profiles').update({ k_coins: current + coins, updated_at: new Date().toISOString() }).eq('id', userId);
    return current + coins;
  }
  return data as number;
}

// ── Outlets ───────────────────────────────────────────────────────────────────

export async function upsertOutlet(outlet: Outlet): Promise<void> {
  const { error } = await supabase.from('outlets').upsert({
    id: outlet.id, name: outlet.name, description: outlet.description,
    image_url: outlet.imageUrl, is_open: outlet.isOpen, merchant_id: outlet.merchantId,
    block_name: outlet.blockName, category: outlet.category, upi_id: outlet.upiId,
    timings: outlet.timings || null, rating: outlet.rating || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function deleteOutletDb(outletId: string): Promise<void> {
  await supabase.from('outlets').delete().eq('id', outletId);
}

// ── Menu Items ────────────────────────────────────────────────────────────────

export async function upsertMenuItem(item: MenuItem): Promise<void> {
  const { error } = await supabase.from('menu_items').upsert({
    id: item.id, outlet_id: item.outletId, name: item.name,
    description: item.description, price: item.price, image_url: item.imageUrl,
    category: item.category, is_available: item.isAvailable, prep_time: item.prepTime || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function deleteMenuItemDb(itemId: string): Promise<void> {
  await supabase.from('menu_items').delete().eq('id', itemId);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function insertOrder(order: Omit<Order, 'id'> & { id: string }): Promise<void> {
  const { error } = await supabase.from('orders').upsert({
    id: order.id, student_id: order.studentId, outlet_id: order.outletId,
    user_name: order.userName || null, user_phone: order.userPhone || null,
    items: order.items, total_amount: order.totalAmount,
    convenience_fee: order.convenienceFee, vendor_amount: order.vendorAmount,
    status: order.status, payment_status: order.paymentStatus,
    token: order.token, created_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function updateOrderStatusDb(orderId: string, status: Order['status']): Promise<void> {
  await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
}

export async function deleteOrderDb(orderId: string): Promise<void> {
  await supabase.from('orders').delete().eq('id', orderId);
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function insertTransaction(tx: Omit<Transaction, 'id'> & { id: string }): Promise<void> {
  const { error } = await supabase.from('transactions').upsert({
    id: tx.id, flow: tx.flow, student_id: tx.studentId, student_name: tx.studentName,
    student_phone: tx.studentPhone || null, outlet_id: tx.outletId, outlet_name: tx.outletName,
    merchant_vpa: tx.merchantVpa, total_amount: tx.totalAmount, platform_fee: tx.platformFee,
    vendor_amount: tx.vendorAmount, payment_status: tx.paymentStatus,
    cashfree_order_id: tx.cashfreeOrderId, cashfree_payment_id: tx.cashfreePaymentId || null,
    k_coins_awarded: tx.kCoinsAwarded, order_id: tx.orderId || null,
    token: tx.token || null, note: tx.note || null, created_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) console.warn('insertTransaction:', error.message);
}

export async function updateTransactionStatus(id: string, status: string, paymentId?: string): Promise<void> {
  await supabase.from('transactions').update({
    payment_status: status,
    cashfree_payment_id: paymentId || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

// ── Support Tickets ───────────────────────────────────────────────────────────

export async function insertSupportTicket(ticket: SupportTicket): Promise<void> {
  const { error } = await supabase.from('support_tickets').insert({
    id: ticket.id, user_id: ticket.userId, order_id: ticket.orderId || null,
    subject: ticket.subject, message: ticket.message, status: ticket.status,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

// ── Image upload ──────────────────────────────────────────────────────────────

export async function uploadImage(file: File, folder = 'food'): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}
