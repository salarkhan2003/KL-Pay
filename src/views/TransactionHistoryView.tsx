import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ShoppingBag, ScanLine, CheckCircle2, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Transaction } from '../types';
import { cn } from '../utils';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  onBack?: () => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({ transactions, onBack }) => {
  const [filter, setFilter] = useState<'all' | 'Food_Order' | 'Peer_to_Merchant_Pay'>('all');

  const filtered = transactions.filter(t => filter === 'all' || t.flow === filter);
  const totalSpent = transactions.filter(t => t.paymentStatus === 'paid').reduce((a, t) => a + t.totalAmount, 0);
  const totalCoins = transactions.reduce((a, t) => a + (t.kCoinsAwarded || 0), 0);

  return (
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
          <p className="text-2xl font-black">Rs.{totalSpent}</p>
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
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 glass-frosted rounded-[32px] border border-white/10">
            <ArrowUpRight className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 font-medium">No transactions yet</p>
          </div>
        ) : (
          filtered.map((tx, idx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="glass-frosted rounded-[24px] border border-white/10 p-4 flex items-center gap-4"
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
                <p className="font-black text-sm truncate">{tx.outletName}</p>
                <p className="text-white/30 text-xs mt-0.5">
                  {tx.flow === 'Food_Order' ? `Token #${tx.token}` : tx.note || 'Direct Pay'}
                </p>
                {tx.kCoinsAwarded > 0 && (
                  <p className="text-amber-400 text-[10px] font-black mt-0.5">+{tx.kCoinsAwarded} K-Coins</p>
                )}
              </div>

              {/* Amount + status */}
              <div className="text-right flex-shrink-0">
                <p className="font-black text-sm">Rs.{tx.totalAmount}</p>
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
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};
