/**
 * PaymentEngine — client-side payment orchestrator
 * Handles ORDER_FLOW and DIRECT_PAY_FLOW via Cashfree JS SDK
 */

import { db } from "./firebase";
import { doc, setDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { Transaction, PaymentFlow } from "./types";

const PLATFORM_FEE = 1;

declare global {
  interface Window { Cashfree: any; }
}

function getCashfree() {
  if (!window.Cashfree) throw new Error("Cashfree SDK not loaded");
  return new window.Cashfree({ mode: "production" });
}

// ── Shared: open Cashfree checkout ────────────────────────────────────────────
async function openCheckout(paymentSessionId: string): Promise<void> {
  const cashfree = getCashfree();
  await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
}

// ── ORDER_FLOW: pre-book food ─────────────────────────────────────────────────
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
  const totalAmount = params.cartTotal + PLATFORM_FEE;
  const vendorAmount = params.cartTotal;

  // 1. Create Cashfree session via backend
  const res = await fetch("/api/payments/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: totalAmount,
      customerId: params.studentId,
      orderId: params.orderId,
      customerEmail: params.studentEmail,
      customerName: params.studentName,
      customerPhone: params.studentPhone || "9999999999",
      merchantVpa: params.merchantVpa,
    }),
  });

  const sessionData = await res.json();
  if (!sessionData.payment_session_id) throw new Error(sessionData.error || "Session creation failed");

  // 2. Write pending transaction to Firestore
  const tx: Omit<Transaction, "id"> = {
    flow: "Food_Order",
    studentId: params.studentId,
    studentName: params.studentName,
    studentPhone: params.studentPhone,
    outletId: params.outletId,
    outletName: params.outletName,
    merchantVpa: params.merchantVpa,
    totalAmount,
    platformFee: PLATFORM_FEE,
    vendorAmount,
    paymentStatus: "pending",
    cashfreeOrderId: params.orderId,
    kCoinsAwarded: 0,
    orderId: params.orderId,
    token: params.token,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, "transactions", params.orderId), tx);

  // 3. Open Cashfree checkout
  await openCheckout(sessionData.payment_session_id);
}

// ── DIRECT_PAY_FLOW: counter scan ─────────────────────────────────────────────
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
  if (params.amount < 2) throw new Error("Minimum amount is ₹2");

  const res = await fetch("/api/payments/direct-pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: params.amount,
      customerId: params.studentId,
      customerName: params.studentName,
      customerEmail: params.studentEmail,
      customerPhone: params.studentPhone || "9999999999",
      merchantVpa: params.merchantVpa,
      outletId: params.outletId,
      outletName: params.outletName,
      note: params.note || "",
    }),
  });

  const data = await res.json();
  if (!data.payment_session_id) throw new Error(data.error || "Session creation failed");

  const orderId: string = data.orderId;
  const vendorAmount = params.amount - PLATFORM_FEE;

  // Write pending transaction
  const tx: Omit<Transaction, "id"> = {
    flow: "Peer_to_Merchant_Pay",
    studentId: params.studentId,
    studentName: params.studentName,
    studentPhone: params.studentPhone,
    outletId: params.outletId,
    outletName: params.outletName,
    merchantVpa: params.merchantVpa,
    totalAmount: params.amount,
    platformFee: PLATFORM_FEE,
    vendorAmount,
    paymentStatus: "pending",
    cashfreeOrderId: orderId,
    kCoinsAwarded: 0,
    note: params.note,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, "transactions", orderId), tx);

  await openCheckout(data.payment_session_id);
  return orderId;
}

// ── Called after payment success (return URL handler) ─────────────────────────
export async function confirmPayment(orderId: string, cashfreePaymentId: string) {
  const kCoins = 5; // award 5 K-Coins per transaction
  await updateDoc(doc(db, "transactions", orderId), {
    paymentStatus: "paid",
    cashfreePaymentId,
    kCoinsAwarded: kCoins,
  });
  return kCoins;
}

// ── Award K-Coins to student profile ─────────────────────────────────────────
export async function awardKCoins(studentId: string, coins: number) {
  await updateDoc(doc(db, "users", studentId), {
    kCoins: increment(coins),
  });
}
