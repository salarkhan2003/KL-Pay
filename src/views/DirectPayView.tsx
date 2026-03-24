import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, ScanLine, IndianRupee, ArrowRight, AlertCircle, Loader2, Store, X, ArrowLeft } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { Outlet, UserProfile } from '../types';
import { initiateDirectPayment } from '../paymentEngine';

interface DirectPayViewProps {
  outlets: Outlet[];
  profile: UserProfile | null;
  user: UserProfile | null;
  onSuccess: (amount: number, outletName: string) => void;
  onBack?: () => void;
}

type Step = 'scan' | 'amount' | 'paying';

export const DirectPayView: React.FC<DirectPayViewProps> = ({ outlets, profile, user, onSuccess, onBack }) => {
  const [step, setStep] = useState<Step>('scan');
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const PRESETS = [20, 30, 50, 80, 100, 150];

  const handleSelectOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setStep('amount');
    setError(null);
  };

  const handlePay = async () => {
    if (!selectedOutlet || !profile) return;
    const amt = parseFloat(amount);
    if (!amt || amt < 2) { setError('Minimum amount is Rs.2'); return; }
    if (!selectedOutlet.upiId) { setError('This outlet has no UPI ID configured'); return; }

    setLoading(true);
    setError(null);
    setStep('paying');
    try {
      await initiateDirectPayment({
        amount: amt,
        outletId: selectedOutlet.id,
        outletName: selectedOutlet.name,
        merchantVpa: selectedOutlet.upiId,
        studentId: profile.uid,
        studentName: profile.displayName,
        studentEmail: profile.email,
        studentPhone: profile.phone || '9999999999',
        note,
      });
      onSuccess(amt, selectedOutlet.name);
    } catch (err: any) {
      setError(err.message || 'Payment failed. Try again.');
      setStep('amount');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-10 h-10 rounded-2xl glass-frosted flex items-center justify-center text-white/40 hover:text-white transition-all flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-display text-4xl font-black">Pay</h2>
            <p className="text-white/30 text-xs font-bold mt-1">Scan & pay at any KL One outlet</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-klu-red/10 border border-klu-red/20 rounded-2xl flex items-center justify-center">
          <ScanLine className="w-6 h-6 text-klu-red" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'scan' && (
          <motion.div key="scan" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <div className="glass-frosted rounded-[28px] border border-white/10 p-6 flex flex-col items-center gap-4">
              <div className="w-20 h-20 border-2 border-dashed border-klu-red/40 rounded-2xl flex items-center justify-center">
                <QrCode className="w-10 h-10 text-klu-red/60" />
              </div>
              <p className="text-white/40 text-xs font-bold text-center">Point camera at outlet QR<br />or select below</p>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Select Outlet</p>
            <div className="space-y-3">
              {outlets.filter(o => o.isOpen).map(outlet => (
                <button
                  key={outlet.id}
                  onClick={() => handleSelectOutlet(outlet)}
                  className="w-full flex items-center gap-4 glass-frosted rounded-[24px] border border-white/10 p-4 hover:border-klu-red/30 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                    <img src={outlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={outlet.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm">{outlet.name}</p>
                    <p className="text-white/30 text-xs">{outlet.blockName} Block · {outlet.category}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'amount' && selectedOutlet && (
          <motion.div key="amount" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                <img src={selectedOutlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={selectedOutlet.name} />
              </div>
              <div className="flex-1">
                <p className="font-black">{selectedOutlet.name}</p>
                <p className="text-white/30 text-xs">{selectedOutlet.upiId}</p>
              </div>
              <button onClick={() => { setStep('scan'); setAmount(''); setNote(''); }} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <GlassCard className="p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Enter Amount</p>
              <div className="flex items-center gap-2 mb-4">
                <IndianRupee className="w-8 h-8 text-white/20 flex-shrink-0" />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  className="flex-1 bg-transparent text-5xl font-black focus:outline-none text-white placeholder:text-white/10 w-full"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => setAmount(String(p))}
                    className={`px-3 py-1.5 rounded-full text-xs font-black border transition-all ${amount === String(p) ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                  >
                    Rs.{p}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Add a note (optional)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-klu-red/30 text-white placeholder:text-white/20"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </GlassCard>

            {amount && parseFloat(amount) >= 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-frosted rounded-[20px] border border-white/10 p-4 space-y-2">
                <div className="flex justify-between text-xs font-bold text-white/40">
                  <span>You pay</span><span>Rs.{parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-white/40">
                  <span>Platform fee</span><span>Rs.2.50</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between text-sm font-black">
                  <span>{selectedOutlet.name} receives</span>
                  <span className="text-emerald-400">Rs.{(parseFloat(amount) - 2.5).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-amber-400">
                  <span>K-Coins earned</span><span>+5</span>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <ClayButton
              onClick={handlePay}
              className="w-full h-14 text-base"
              disabled={loading || !amount || parseFloat(amount) < 2}
            >
              Pay Rs.{amount || '0'}
            </ClayButton>
          </motion.div>
        )}

        {step === 'paying' && (
          <motion.div key="paying" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6 py-16">
            <div className="w-20 h-20 bg-klu-red/10 border border-klu-red/20 rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-klu-red animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-black text-lg">Opening payment...</p>
              <p className="text-white/40 text-sm mt-1">Redirecting to Cashfree</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
