import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight, ShoppingBag, ScanLine, CheckCircle2, Clock, XCircle,
  ArrowLeft, ChevronDown, ChevronUp, Receipt, IndianRupee, Hash, Store, Calendar,
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Transaction } from '../types';
import { cn } from '../utils';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  onBack?: () => void;
}

function ReceiptModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-sm glass-frosted rounded-[32px] border border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Receipt header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center',
              tx.flow === 'Food_Order' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
            )}>
              {tx.flow === 'Food_Order'
                ? <ShoppingBag className="w-5 h-5 text-blue-400" />
                : <ScanLine className="w-5 h-5 text-emerald-400" />}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Payment Receipt</p>
          <p className="text-2xl font-black">₹{tx.totalAmount.toFixed(2)}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {tx.paymentStatus === 'paid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            {tx.paymentStatus === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
            {tx.paymentStatus === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
            <span className={cn(
              'text-xs font-black uppercase',
              tx.paymentStatus === 'paid' && 'text-emerald-400',
              tx.paymentStatus === 'pending' && 'text-amber-400',
              tx.paymentStatus === 'failed' && 'text-red-400',
            )}>{tx.paymentStatus}</span>
          </div>
        </div>

        {/* Receipt body */}
        <div className="p-6 space-y-4">
          {/* Outlet */}
          <div className="flex items-center gap-3">
            <Store className="w-4 h-4 text-white/20 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-white/30 font-black uppercase">Outlet</p>
              <p className="text-sm font-black">{tx.outletName || 'KL One Outlet'}</p>
            </div>
          </div>

          {/* Token (food orders only) */}
          {tx.flow === 'Food_Order' && tx.token && (
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-white/20 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-white/30 font-black uppercase">Order Token</p>
                <p className="text-sm font-black">#{tx.token}</p>
              </div>
            </div>
          )}

          {/* Note (direct pay) */}
          {tx.flow === 'Peer_to_Merchant_Pay' && tx.note && (
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4 text-white/20 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-white/30 font-black uppercase">Note</p>
                <p className="text-sm font-black">{tx.note}</p>
              </div>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-white/20 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-white/30 font-black uppercase">Date & Time</p>
              <p className="text-sm font-black">
                {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Amount breakdown */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Breakdown</p>
            <div className="flex justify-between text-xs font-bold text-white/50">
              <span>Subtotal</span>
              <span>₹{(tx.vendorAmount || tx.totalAmount - (tx.platformFee || 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-white/50">
              <span>Platform fee</span>
              <span>₹{(tx.platformFee || 0).toFixed(2)}</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between text-sm font-black">
              <span>Total Paid</span>
              <span className="text-klu-red">₹{tx.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* K-Coins */}
          {tx.kCoinsAwarded > 0 && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <span className="text-sm font-black text-amber-400">K-Coins Earned</span>
              <span className="text-lg font-black text-amber-400">+{tx.kCoinsAwarded} 🪙</span>
            </div>
          )}

          {/* Transaction ID */}
          <div>
            <p className="text-[10px] text-white/20 font-black uppercase">Transaction ID</p>
            <p className="text-[10px] text-white/30 font-mono mt-0.5 break-all">{tx.cashfreeOrderId || tx.id}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({ transactions, onBack }) => {
  const [filter, setFilter] = useState<'all' | 'Food_Order' | 'Peer_to_Merchant_Pay'>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filtered = transactions.filter(t => filter === 'all' || t.flow === filter);
  // Count paid + pending (pending = payment initiated, webhook may not have confirmed yet)
  const totalSpent = transactions.filter(t => t.paymentStatus === 'paid' || t.paymentStatus === 'pending').reduce((a, t) => a + t.totalAmount, 0);
  const totalCoins = transactions.reduce((a, t) => a + (t.kCoinsAwarded || 0), 0);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-10 h-10 rounded-2xl glass-frosted flex items-center justify-center text-white/40 hover:text-white transition-all flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-display text-4xl font-black">Transactions</h2>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <p className="text-[10px] text-white/30 font-black uppercase">Total Spent</p>
            <p className="text-2xl font-black">₹{totalSpent.toFixed(2)}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[10px] text-white/30 font-black uppercase">Coins Earned</p>
            <p className="text-2xl font-black text-amber-400">{totalCoins} 🪙</p>
          </GlassCard>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'Food_Order', label: 'Food Orders' },
            { key: 'Peer_to_Merchant_Pay', label: 'Direct Pay' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-black border transition-all whitespace-nowrap',
                filter === f.key ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 glass-frosted rounded-[32px] border border-white/10">
              <ArrowUpRight className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 font-medium">No transactions yet</p>
            </div>
          ) : (
            filtered.map((tx, idx) => (
              <motion.button
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setSelectedTx(tx)}
                className="w-full glass-frosted rounded-[24px] border border-white/10 p-4 flex items-center gap-4 hover:border-white/20 active:scale-[0.98] transition-all text-left"
              >
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                  tx.flow === 'Food_Order' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
                )}>
                  {tx.flow === 'Food_Order'
                    ? <ShoppingBag className="w-5 h-5 text-blue-400" />
                    : <ScanLine className="w-5 h-5 text-emerald-400" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm truncate">{tx.outletName || 'KL One Outlet'}</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    {tx.flow === 'Food_Order'
                      ? tx.token ? `Token #${tx.token}` : 'Food Order'
                      : tx.note || 'Direct Pay'}
                  </p>
                  {tx.kCoinsAwarded > 0 && (
                    <p className="text-amber-400 text-[10px] font-black mt-0.5">+{tx.kCoinsAwarded} K-Coins</p>
                  )}
                </div>

                {/* Amount + status */}
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-sm">₹{tx.totalAmount.toFixed(2)}</p>
                  <div className="flex items-center gap-1 justify-end mt-1">
                    {tx.paymentStatus === 'paid' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {tx.paymentStatus === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
                    {tx.paymentStatus === 'failed' && <XCircle className="w-3 h-3 text-red-400" />}
                    <span className={cn(
                      'text-[10px] font-black uppercase',
                      tx.paymentStatus === 'paid' && 'text-emerald-400',
                      tx.paymentStatus === 'pending' && 'text-amber-400',
                      tx.paymentStatus === 'failed' && 'text-red-400',
                    )}>{tx.paymentStatus}</span>
                  </div>
                  <Receipt className="w-3 h-3 text-white/20 ml-auto mt-1" />
                </div>
              </motion.button>
            ))
          )}
        </div>
      </motion.div>

      {/* Receipt modal */}
      <AnimatePresence>
        {selectedTx && (
          <ReceiptModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
        )}
      </AnimatePresence>
    </>
  );
};
