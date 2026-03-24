import { supabase, upsertTransaction, awardKCoinsSupabase } from './supabase';

export const PLATFORM_FEE    = 2.5;
export const KCOINS_PER_ORDER = 5;

declare global { interface Window { Cashfree: any; } }

function getCashfree() {
  if (!window.Cashfree) throw new Error('Cashfree SDK not loaded');
  return new window.Cashfree({ mode: 'production' });
}

// ── Order payment ─────────────────────────────────────────────────────────────
export async function initiateOrderPayment(params: {
  orderId: string; cartTotal: number; outletId: string; outletName: string;
  merchantVpa: string; studentId: string; studentName: string;
  studentEmail: string; studentPhone: string; token: string; items: any[];
}) {
  const totalAmount = Math.round((params.cartTotal + PLATFORM_FEE) * 100) / 100;

  const res = await fetch('/api/payments/create-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: totalAmount, customerId: params.studentId, orderId: params.orderId,
      customerEmail: params.studentEmail, customerName: params.studentName,
      customerPhone: params.studentPhone || '9999999999',
      merchantVpa: params.merchantVpa, outletName: params.outletName,
    }),
  });
  const sessionData = await res.json();
  if (!sessionData.payment_session_id) throw new Error(sessionData.error || 'Session creation failed');

  await upsertTransaction({
    id: params.orderId, flow: 'Food_Order', student_id: params.studentId,
    student_name: params.studentName, student_phone: params.studentPhone,
    outlet_id: params.outletId, outlet_name: params.outletName,
    merchant_vpa: params.merchantVpa, total_amount: totalAmount,
    platform_fee: PLATFORM_FEE, vendor_amount: params.cartTotal,
    payment_status: 'pending', cashfree_order_id: params.orderId,
    k_coins_awarded: 0, order_id: params.orderId, token: params.token,
    created_at: new Date().toISOString(),
  });

  await getCashfree().checkout({ paymentSessionId: sessionData.payment_session_id, redirectTarget: '_self' });
}

// ── Direct pay ────────────────────────────────────────────────────────────────
export async function initiateDirectPayment(params: {
  amount: number; outletId: string; outletName: string; merchantVpa: string;
  studentId: string; studentName: string; studentEmail: string; studentPhone: string; note?: string;
}): Promise<string> {
  if (params.amount < 2) throw new Error('Minimum amount is Rs.2');

  const res = await fetch('/api/payments/direct-pay', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amount, customerId: params.studentId, customerName: params.studentName,
      customerEmail: params.studentEmail, customerPhone: params.studentPhone || '9999999999',
      merchantVpa: params.merchantVpa, outletId: params.outletId,
      outletName: params.outletName, note: params.note || '',
    }),
  });
  const data = await res.json();
  if (!data.payment_session_id) throw new Error(data.error || 'Session creation failed');

  const orderId: string = data.orderId;
  const vendorAmount = Math.round((params.amount - PLATFORM_FEE) * 100) / 100;

  await upsertTransaction({
    id: orderId, flow: 'Peer_to_Merchant_Pay', student_id: params.studentId,
    student_name: params.studentName, student_phone: params.studentPhone,
    outlet_id: params.outletId, outlet_name: params.outletName,
    merchant_vpa: params.merchantVpa, total_amount: params.amount,
    platform_fee: PLATFORM_FEE, vendor_amount: vendorAmount,
    payment_status: 'pending', cashfree_order_id: orderId,
    k_coins_awarded: 0, note: params.note, created_at: new Date().toISOString(),
  });

  await getCashfree().checkout({ paymentSessionId: data.payment_session_id, redirectTarget: '_self' });
  return orderId;
}

// ── Confirm payment + award K-Coins ──────────────────────────────────────────
export async function confirmPayment(orderId: string, cashfreePaymentId: string): Promise<number> {
  await supabase.from('transactions').update({ payment_status: 'paid', cashfree_payment_id: cashfreePaymentId, k_coins_awarded: KCOINS_PER_ORDER }).eq('id', orderId);
  return KCOINS_PER_ORDER;
}

export async function awardKCoins(studentId: string, coins: number): Promise<void> {
  await awardKCoinsSupabase(studentId, coins);
}
