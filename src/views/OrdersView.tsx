import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle2, XCircle, ArrowLeft, ShoppingBag, RotateCcw, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { Order, Outlet } from '../types';

interface OrdersViewProps {
  orders: Order[];
  outlets: Outlet[];
  onReorder: (order: Order) => void;
  onBack?: () => void;
}

const STATUS_CONFIG = {
  pending:    { color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',   label: 'Pending' },
  preparing:  { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',     label: 'Preparing' },
  ready:      { color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20',label: 'Ready!' },
  picked_up:  { color: 'text-white/30',   bg: 'bg-white/5 border-white/10',            label: 'Picked Up' },
  cancelled:  { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',       label: 'Cancelled' },
};

export const OrdersView: React.FC<OrdersViewProps> = ({ orders, outlets, onReorder, onBack }) => {
  const [filter, setFilter] = useState<'active' | 'history'>('active');
  const [expanded, setExpanded] = useState<string | null>(null);

  const active  = orders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled');
  const history = orders.filter(o => o.status === 'picked_up' || o.status === 'cancelled');
  const shown   = filter === 'active' ? active : history;

  const getOutletName = (outletId: string) =>
    outlets.find(o => o.id === outletId)?.name || outletId;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="w-10 h-10 rounded-2xl glass-frosted flex items-center justify-center text-white/40 hover:text-white transition-all flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-display text-4xl font-black">My Orders</h2>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-[24px] border border-white/10">
        {[
          { key: 'active',  label: `Active (${active.length})` },
          { key: 'history', label: `History (${history.length})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className={cn('flex-1 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all',
              filter === f.key ? 'clay-red shadow-lg' : 'text-white/30')}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {shown.length === 0 ? (
          <div className="text-center py-16 glass-frosted rounded-3xl border border-white/10">
            <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 font-medium">No {filter} orders</p>
          </div>
        ) : shown.map(order => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const outletName = getOutletName(order.outletId);
          const isExpanded = expanded === order.id;

          return (
            <GlassCard key={order.id} className="overflow-hidden">
              {/* Header row */}
              <button className="w-full p-5 text-left" onClick={() => setExpanded(isExpanded ? null : order.id)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt className="w-4 h-4 text-white/30 flex-shrink-0" />
                      <p className="font-black text-sm truncate">{outletName}</p>
                    </div>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">
                      Token #{order.token} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <p className="font-black text-sm">₹{order.totalAmount}</p>
                      <span className={cn('text-[10px] font-black uppercase', cfg.color)}>{cfg.label}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </div>
                </div>
              </button>

              {/* Expanded receipt */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 overflow-hidden">
                    <div className="p-5 space-y-4">

                      {/* Status badge */}
                      <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black', cfg.bg, cfg.color)}>
                        {order.status === 'picked_up' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {order.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                        {(order.status === 'pending' || order.status === 'preparing') && <Clock className="w-3.5 h-3.5" />}
                        {cfg.label}
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Items</p>
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm font-bold">
                            <span className="text-white/70">{item.quantity}× {item.name}</span>
                            <span className="text-white/50">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                        <div className="border-t border-white/5 pt-2 space-y-1">
                          <div className="flex justify-between text-xs text-white/30 font-bold">
                            <span>Subtotal</span><span>₹{order.vendorAmount}</span>
                          </div>
                          <div className="flex justify-between text-xs text-white/30 font-bold">
                            <span>Convenience fee</span><span>₹{order.convenienceFee}</span>
                          </div>
                          <div className="flex justify-between text-sm font-black pt-1">
                            <span>Total Paid</span><span className="text-klu-red">₹{order.totalAmount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment status */}
                      <div className="flex items-center gap-2">
                        {order.paymentStatus === 'paid'
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          : <Clock className="w-4 h-4 text-amber-400" />}
                        <span className={cn('text-xs font-black uppercase', order.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400')}>
                          Payment {order.paymentStatus}
                        </span>
                      </div>

                      {/* QR for ready orders */}
                      {order.status === 'ready' && (
                        <div className="p-4 bg-white rounded-2xl flex flex-col items-center gap-2">
                          <QRCodeSVG value={order.id} size={120} />
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Show to collect order</p>
                        </div>
                      )}

                      {/* Reorder button */}
                      {order.status === 'picked_up' && (
                        <ClayButton variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={() => onReorder(order)}>
                          <RotateCcw className="w-4 h-4" /> Reorder
                        </ClayButton>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
};
