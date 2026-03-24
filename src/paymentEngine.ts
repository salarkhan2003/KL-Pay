/**
 * PaymentEngine — client-side payment orchestrator
 * Platform fee: Rs.2.50 per transaction → credited to admin Cashfree account
 * K-Coins: 5 per successful payment
 */

import { db } from './firebase';
import { doc, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { supabase } from './supabase';
import { Transaction } from './types';

export const PLATFORM_FEE = 2.5;
export const KCOINS_PER_ORDER = 5;

declare global {
  interface Window { Cashfree: any; }
}

function getCashfree() {
  if (!window.Cashfree) throw new Error('Cashfree SDK not loaded');
  return new window.Cashfree({ mode: 'production' });
}

async function openCheckout(paymentSessionId: string): Promise<void> {
  const cashfree = getCashfree();
  await cashfree.checkout({ paymentSessionId, redirectTarget: '_self' });
}

// ── ORDER_FLOW ────────────────────────────────────────────────────────────────
export async function initiateOrderPayment(params: {
  orderId: string;
  cartTotal: number;
  outletId: string;
  outletName: string;
  merchantVpa: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  token: string;
  items: any[];
}) {
  const totalAmount = Math.round((params.cartTotal + PLATFORM_FEE) * 100) / 100;
  const vendorAmount = params.cartTotal;

  const res = await fetch('/api/payments/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: totalAmount,
      customerId: params.studentId,
      orderId: params.orderId,
      customerEmail: params.studentEmail,
      customerName: params.studentName,
      customerPhone: params.studentPhone || '9999999999',
      merchantVpa: params.merchantVpa,
      token: params.token,
      outletName: params.outletName,
    }),
  });

  const sessionData = await res.json();
  if (!sessionData.payment_session_id) throw new Error(sessionData.error || 'Session creation failed');

  // Write pending transaction to Firestore
  const tx: Omit<Transaction, 'id'> = {
    flow: 'Food_Order',
    studentId: params.studentId,
    studentName: params.studentName,
    studentPhone: params.studentPhone,
    outletId: params.outletId,
    outletName: params.outletName,
    merchantVpa: params.merchantVpa,
    totalAmount,
    platformFee: PLATFORM_FEE,
    vendorAmount,
    paymentStatus: 'pending',
    cashfreeOrderId: params.orderId,
    kCoinsAwarded: 0,
    orderId: params.orderId,
    token: params.token,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'transactions', params.orderId), tx);

  await openCheckout(sessionData.payment_session_id);
}

// ── DIRECT_PAY_FLOW ───────────────────────────────────────────────────────────
export async function initiateDirectPayment(params: {
  amount: number;
  outletId: string;
  outletName: string;
  merchantVpa: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  note?: string;
}): Promise<string> {
  if (params.amount < 2) throw new Error('Minimum amount is Rs.2');

  const res = await fetch('/api/payments/direct-pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amount,
      customerId: params.studentId,
      customerName: params.studentName,
      customerEmail: params.studentEmail,
      customerPhone: params.studentPhone || '9999999999',
      merchantVpa: params.merchantVpa,
      outletId: params.outletId,
      outletName: params.outletName,
      note: params.note || '',
    }),
  });

  const data = await res.json();
  if (!data.payment_session_id) throw new Error(data.error || 'Session creation failed');

  const orderId: string = data.orderId;
  const vendorAmount = Math.round((params.amount - PLATFORM_FEE) * 100) / 100;

  const tx: Omit<Transaction, 'id'> = {
    flow: 'Peer_to_Merchant_Pay',
    studentId: params.studentId,
    studentName: params.studentName,
    studentPhone: params.studentPhone,
    outletId: params.outletId,
    outletName: params.outletName,
    merchantVpa: params.merchantVpa,
    totalAmount: params.amount,
    platformFee: PLATFORM_FEE,
    vendorAmount,
    paymentStatus: 'pending',
    cashfreeOrderId: orderId,
    kCoinsAwarded: 0,
    note: params.note,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'transactions', orderId), tx);

  await openCheckout(data.payment_session_id);
  return orderId;
}

// ── Confirm payment + award K-Coins ──────────────────────────────────────────
export async function confirmPayment(orderId: string, cashfreePaymentId: string): Promise<number> {
  await updateDoc(doc(db, 'transactions', orderId), {
    paymentStatus: 'paid',
    cashfreePaymentId,
    kCoinsAwarded: KCOINS_PER_ORDER,
  });
  return KCOINS_PER_ORDER;
}

// ── Award K-Coins (Firestore + Supabase) ─────────────────────────────────────
export async function awardKCoins(studentId: string, coins: number): Promise<void> {
  // Firestore
  await updateDoc(doc(db, 'users', studentId), { kCoins: increment(coins) }).catch(console.warn);
  // Supabase
  const { data: profile } = await supabase.from('profiles').select('k_coins').eq('id', studentId).single();
  const current = (profile as any)?.k_coins || 0;
  await supabase.from('profiles').update({ k_coins: current + coins, updated_at: new Date().toISOString() }).eq('id', studentId);
}
