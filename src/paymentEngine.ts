/**
 * PaymentEngine — Supabase only, no Firebase
 * Platform fee: Rs.2.50 per transaction
 * K-Coins: 5 per successful payment
 */

import { supabase, insertTransaction, updateTransactionStatus, awardKCoinsSupabase } from './supabase';
import { Transaction } from './types';

export const PLATFORM_FEE = 2.5;
export const KCOINS_PER_ORDER = 5;

declare global { interface Window { Cashfree: any; } }

function getCashfree() {
  if (!window.Cashfree) throw new Error('Cashfree SDK not loaded');
  return new window.Cashfree({ mode: 'production' });
}

async function openCheckout(paymentSessionId: string): Promise<void> {
  const cashfree = getCashfree();
  await cashfree.checkout({ paymentSessionId, redirectTarget: '_self' });
}

// ── Food order payment ────────────────────────────────────────────────────────

export async function initiateOrderPayment(params: {
  orderId: string; cartTotal: number; outletId: string; outletName: string;
  merchantVpa: string; studentId: string; studentName: string;
  studentEmail: string; studentPhone: string; token: string; items: any[];
}) {
  const totalAmount = Math.round((params.cartTotal + PLATFORM_FEE) * 100) / 100;

  const res = await fetch('/api/payments/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: totalAmount, customerId: params.studentId, orderId: params.orderId,
      customerEmail: params.studentEmail, customerName: params.studentName,
      customerPhone: params.studentPhone || '9999999999',
      merchantVpa: params.merchantVpa, token: params.token, outletName: params.outletName,
    }),
  });
  const sessionData = await res.json();
  if (!sessionData.payment_session_id) throw new Error(sessionData.error || 'Session creation failed');

  await insertTransaction({
    id: params.orderId, flow: 'Food_Order',
    studentId: params.studentId, studentName: params.studentName,
    studentPhone: params.studentPhone, outletId: params.outletId,
    outletName: params.outletName, merchantVpa: params.merchantVpa,
    totalAmount, platformFee: PLATFORM_FEE, vendorAmount: params.cartTotal,
    paymentStatus: 'pending', cashfreeOrderId: params.orderId,
    kCoinsAwarded: 0, orderId: params.orderId, token: params.token,
    createdAt: new Date().toISOString(),
  });

  await openCheckout(sessionData.payment_session_id);
}

// ── Direct pay ────────────────────────────────────────────────────────────────

export async function initiateDirectPayment(params: {
  amount: number; outletId: string; outletName: string; merchantVpa: string;
  studentId: string; studentName: string; studentEmail: string;
  studentPhone: string; note?: string;
}): Promise<string> {
  if (params.amount < 2) throw new Error('Minimum amount is Rs.2');

  const res = await fetch('/api/payments/direct-pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amount, customerId: params.studentId,
      customerName: params.studentName, customerEmail: params.studentEmail,
      customerPhone: params.studentPhone || '9999999999',
      merchantVpa: params.merchantVpa, outletId: params.outletId,
      outletName: params.outletName, note: params.note || '',
    }),
  });
  const data = await res.json();
  if (!data.payment_session_id) throw new Error(data.error || 'Session creation failed');

  const orderId: string = data.orderId;
  const vendorAmount = Math.round((params.amount - PLATFORM_FEE) * 100) / 100;

  await insertTransaction({
    id: orderId, flow: 'Peer_to_Merchant_Pay',
    studentId: params.studentId, studentName: params.studentName,
    studentPhone: params.studentPhone, outletId: params.outletId,
    outletName: params.outletName, merchantVpa: params.merchantVpa,
    totalAmount: params.amount, platformFee: PLATFORM_FEE, vendorAmount,
    paymentStatus: 'pending', cashfreeOrderId: orderId,
    kCoinsAwarded: 0, note: params.note, createdAt: new Date().toISOString(),
  });

  await openCheckout(data.payment_session_id);
  return orderId;
}

// ── Confirm payment + award K-Coins ──────────────────────────────────────────

export async function confirmPayment(orderId: string, cashfreePaymentId: string): Promise<number> {
  await updateTransactionStatus(orderId, 'paid', cashfreePaymentId);
  return KCOINS_PER_ORDER;
}

export async function awardKCoins(studentId: string, coins: number): Promise<void> {
  await awardKCoinsSupabase(studentId, coins);
}
