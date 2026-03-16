import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MerchantAlert } from '../types';

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

export function useMerchantSocket({ outletId, onAlert }: UseMerchantSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  useEffect(() => {
    if (!outletId) return;

    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_outlet', outletId);
    });

    socket.on('payment_alert', (data: PaymentAlertPayload) => {
      onAlertRef.current(data);
    });

    socket.on('payment_confirmed', (data: PaymentAlertPayload) => {
      onAlertRef.current({ ...data, status: 'confirmed' });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [outletId]);
}

// Voice announcement using Web Speech API
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

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
