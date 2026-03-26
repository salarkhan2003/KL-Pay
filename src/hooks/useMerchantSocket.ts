// Socket.io is NOT supported on Vercel (serverless — no persistent process).
// Payment alerts are delivered via Supabase Realtime instead.
// This file is kept as a no-op so existing imports don't break.

export interface PaymentAlertPayload {
  type: 'Food_Order' | 'Direct_Pay';
  status: 'pending' | 'confirmed';
  amount: number;
  fromName: string;
  outletId: string;
  outletName?: string;
  token?: string;
  note?: string;
  orderId: string;
  timestamp: number;
}

interface UseMerchantSocketOptions {
  outletId: string | null;
  onAlert: (alert: PaymentAlertPayload) => void;
}

// No-op — alerts come through Supabase Realtime channels in MerchantView
export function useMerchantSocket(_options: UseMerchantSocketOptions) {}

export function announcePayment(amount: number, flow: 'Food_Order' | 'Direct_Pay', fromName?: string) {
  if (!('speechSynthesis' in window)) return;
  const msg = flow === 'Direct_Pay'
    ? `Received rupees ${amount} on KL One from ${fromName || 'a student'}`
    : `New food order received on KL One`;
  const utterance = new SpeechSynthesisUtterance(msg);
  utterance.lang = 'en-IN';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
