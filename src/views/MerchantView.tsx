import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, ScanLine, Bell, Volume2, BarChart2, TrendingUp, Package, Clock,
  Plus, Trash2, Loader2, Store, UtensilsCrossed, MapPin, Edit2, Wallet,
  CheckCheck, RefreshCw, ChevronDown, IndianRupee, XCircle, Search, Filter,
  Activity, ArrowUpRight, Calendar, Zap, Eye, EyeOff, Check, X, Link, Tag, CreditCard,
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { Order, Outlet, MenuItem, Transaction } from '../types';
import { announcePayment, PaymentAlertPayload } from '../hooks/useMerchantSocket';
import { supabase, rowToOrder, rowToTransaction } from '../supabase';

interface MerchantViewProps {
  orders: Order[];
  outlets: Outlet[];
  merchantOutlet: Outlet | null;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onSwitchView: (view: any) => void;
  menu?: MenuItem[];
  onSaveItem?: (item: Partial<MenuItem> & { name: string; price: number; category: string }, outletId?: string) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onToggleAvailability?: (itemId: string, isAvailable: boolean) => void;
  onSaveOutlet?: (data: Partial<Outlet> & { name: string }) => Promise<void>;
  onAssignOutlet?: (outletId: string) => Promise<void>;
  allMerchantOutlets?: Outlet[];
}

type DashTab = 'orders' | 'payments' | 'analytics' | 'menu' | 'outlet';
const ITEM_CATS = ['Main', 'Snack', 'Breakfast', 'Beverage', 'Juice', 'Dessert'];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, string> = {
    pending:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
    preparing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ready:     'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    picked_up: 'bg-white/10 text-white/40 border-white/10',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    paid:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    unpaid:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    failed:    'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const labels: Record<string, string> = { picked_up: 'Picked Up' };
  return <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', cfg[status] || cfg.pending)}>{labels[status] || status}</span>;
};

// ── Mini sparkline ────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: number[]; color?: string; height?: number }> = ({ data, color = '#c8102e', height = 40 }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 100, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity="0.1" stroke="none" />
    </svg>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const MStatCard: React.FC<{ label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; sparkData?: number[] }> = ({ label, value, sub, icon, color, sparkData }) => (
  <GlassCard className="p-4 overflow-hidden relative">
    <div className="flex items-start justify-between mb-2">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>{icon}</div>
    </div>
    <p className="text-2xl font-black text-white">{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>}
    {sparkData && sparkData.length > 1 && (
      <div className="absolute bottom-0 left-0 right-0 opacity-40">
        <Sparkline data={sparkData} />
      </div>
    )}
  </GlassCard>
);

// ── Orders Tab ────────────────────────────────────────────────────────────────
const OrdersTab: React.FC<{ orders: Order[]; onUpdateStatus: (id: string, s: Order['status']) => void }> = ({ orders, onUpdateStatus }) => {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const NEXT: Record<Order['status'], Order['status'] | null> = {
    pending: 'preparing', preparing: 'ready', ready: 'picked_up', picked_up: null, cancelled: null,
  };
  const NEXT_LABEL: Record<Order['status'], string> = {
    pending: 'Start Preparing', preparing: 'Mark Ready', ready: 'Mark Picked Up', picked_up: '', cancelled: '',
  };

  const shown = useMemo(() => orders.filter(o => {
    const matchFilter = filter === 'all' || (o.status !== 'picked_up' && o.status !== 'cancelled');
    const matchSearch = !search || o.userName?.toLowerCase().includes(search.toLowerCase()) || o.token?.includes(search);
    return matchFilter && matchSearch;
  }), [orders, filter, search]);

  const activeCount = orders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-klu-red/40"
            placeholder="Search by name or token..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[{ k: 'active', l: `Active (${activeCount})` }, { k: 'all', l: `All (${orders.length})` }].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k as any)}
              className={cn('px-4 h-10 rounded-xl text-xs font-black border transition-all',
                filter === f.k ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white')}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block glass-frosted rounded-2xl border border-white/10 overflow-hidden">
        {shown.length === 0 ? (
          <div className="text-center py-16"><ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-3" /><p className="text-white/30">No {filter} orders</p></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Token', 'Customer', 'Items', 'Amount', 'Status', 'Payment', 'Time', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((order, i) => (
                <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm font-black text-klu-red">#{order.token}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-black">{order.userName || 'Student'}</p>
                    <p className="text-[10px] text-white/30">{order.userPhone || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">{order.items?.length || 0} items</td>
                  <td className="px-4 py-3 text-xs font-black">₹{order.totalAmount?.toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={order.paymentStatus} /></td>
                  <td className="px-4 py-3 text-[10px] text-white/30">
                    {new Date(order.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {NEXT[order.status] && (
                        <button onClick={() => onUpdateStatus(order.id, NEXT[order.status]!)}
                          className="px-3 py-1.5 bg-klu-red rounded-lg text-white text-[10px] font-black hover:bg-klu-red/80 transition-colors">
                          {NEXT_LABEL[order.status]}
                        </button>
                      )}
                      {order.status !== 'cancelled' && order.status !== 'picked_up' && (
                        <button onClick={() => onUpdateStatus(order.id, 'cancelled')}
                          className="px-2 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] font-black">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {shown.length === 0 && (
          <div className="text-center py-16 glass-frosted rounded-3xl border border-white/10">
            <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">No {filter} orders</p>
          </div>
        )}
        {shown.map(order => {
          const isExp = expanded === order.id;
          return (
            <GlassCard key={order.id} className="overflow-hidden">
              <button className="w-full p-4 text-left" onClick={() => setExpanded(isExp ? null : order.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-white/40">Token</span>
                      <span className="text-sm font-black text-klu-red">#{order.token}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-white/40 truncate">{order.userName || 'Student'} · {order.userPhone || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-sm">₹{order.totalAmount?.toFixed(2)}</p>
                    <StatusBadge status={order.paymentStatus} />
                  </div>
                </div>
              </button>
              <AnimatePresence>
                {isExp && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 overflow-hidden">
                    <div className="p-4 space-y-3">
                      {(order.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-white/60">
                          <span>{item.quantity}× {item.name}</span><span>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="h-px bg-white/5" />
                      <p className="text-[10px] text-white/20">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
                      <div className="flex gap-2">
                        {NEXT[order.status] && (
                          <ClayButton onClick={() => onUpdateStatus(order.id, NEXT[order.status]!)} className="flex-1 text-xs py-2">
                            {NEXT_LABEL[order.status]}
                          </ClayButton>
                        )}
                        {order.status !== 'cancelled' && order.status !== 'picked_up' && (
                          <button onClick={() => onUpdateStatus(order.id, 'cancelled')}
                            className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black">
                            Cancel
                          </button>
                        )}
                      </div>
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

// ── Payments Tab ──────────────────────────────────────────────────────────────
const PaymentsTab: React.FC<{ transactions: Transaction[]; loading: boolean }> = ({ transactions, loading }) => {
  const paid = transactions.filter(t => t.paymentStatus === 'paid');
  const now = new Date();
  const todayPaid = paid.filter(t => new Date(t.createdAt).toDateString() === now.toDateString());
  const totalReceived = paid.reduce((s, t) => s + (t.vendorAmount || 0), 0);
  const todayTotal = todayPaid.reduce((s, t) => s + (t.vendorAmount || 0), 0);
  const foodTotal = paid.filter(t => t.flow === 'Food_Order').reduce((s, t) => s + (t.vendorAmount || 0), 0);
  const directTotal = paid.filter(t => t.flow === 'Peer_to_Merchant_Pay').reduce((s, t) => s + (t.vendorAmount || 0), 0);

  // Last 7 days revenue sparkline
  const last7Revenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return paid.filter(t => new Date(t.createdAt).toDateString() === d.toDateString()).reduce((s, t) => s + (t.vendorAmount || 0), 0);
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MStatCard label="Today's Revenue" value={`₹${todayTotal.toFixed(0)}`} sub={`${todayPaid.length} payments`} icon={<Calendar className="w-4 h-4 text-emerald-400" />} color="bg-emerald-500/10" sparkData={last7Revenue} />
        <MStatCard label="Total Revenue" value={`₹${totalReceived.toFixed(0)}`} sub={`${paid.length} payments`} icon={<IndianRupee className="w-4 h-4 text-blue-400" />} color="bg-blue-500/10" />
        <MStatCard label="Food Orders" value={`₹${foodTotal.toFixed(0)}`} icon={<ShoppingBag className="w-4 h-4 text-klu-red" />} color="bg-klu-red/10" />
        <MStatCard label="Direct Pay" value={`₹${directTotal.toFixed(0)}`} icon={<ScanLine className="w-4 h-4 text-amber-400" />} color="bg-amber-500/10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 glass-frosted rounded-3xl border border-white/10">
          <Wallet className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30">No payments yet</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block glass-frosted rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Type', 'Student', 'Total', 'You Receive', 'Status', 'Time'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/30">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-1 rounded-lg text-[10px] font-black border',
                        tx.flow === 'Food_Order' ? 'text-klu-red bg-klu-red/10 border-klu-red/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20')}>
                        {tx.flow === 'Food_Order' ? '🍱 Food' : '💸 Direct'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-black">{tx.studentName || 'Student'}</p>
                      <p className="text-[10px] text-white/30">{tx.flow === 'Food_Order' ? `Token #${tx.token || '—'}` : tx.note || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-black">₹{tx.totalAmount?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs font-black text-emerald-400">+₹{(tx.vendorAmount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={tx.paymentStatus} /></td>
                    <td className="px-4 py-3 text-[10px] text-white/30">
                      {new Date(tx.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="lg:hidden space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="glass-frosted rounded-2xl border border-white/10 p-4 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base', tx.flow === 'Food_Order' ? 'bg-klu-red/10' : 'bg-blue-500/10')}>
                  {tx.flow === 'Food_Order' ? '🍱' : '💸'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{tx.studentName || 'Student'}</p>
                  <p className="text-[10px] text-white/30">{tx.flow === 'Food_Order' ? `Token #${tx.token || '—'}` : tx.note || 'Direct Pay'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-sm text-emerald-400">+₹{(tx.vendorAmount || 0).toFixed(2)}</p>
                  <StatusBadge status={tx.paymentStatus} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

// ── Analytics Tab ─────────────────────────────────────────────────────────────
const AnalyticsTab: React.FC<{ orders: Order[]; transactions: Transaction[] }> = ({ orders, transactions }) => {
  const paid = transactions.filter(t => t.paymentStatus === 'paid');
  const now = new Date();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === now.toDateString());
  const totalRevenue = paid.reduce((s, t) => s + (t.vendorAmount || 0), 0);
  const todaySales = paid.filter(t => new Date(t.createdAt).toDateString() === now.toDateString()).reduce((s, t) => s + (t.vendorAmount || 0), 0);
  const avgOrder = orders.length ? Math.round(totalRevenue / orders.length) : 0;
  const completedCount = orders.filter(o => o.status === 'picked_up').length;
  const completionRate = orders.length ? Math.round((completedCount / orders.length) * 100) : 0;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;
  const foodCount = paid.filter(t => t.flow === 'Food_Order').length;
  const directCount = paid.filter(t => t.flow === 'Peer_to_Merchant_Pay').length;
  // K-Coins — only for this outlet's transactions
  const totalKCoins = paid.reduce((s, t) => s + (t.kCoinsAwarded || 0), 0);
  const todayKCoins = paid.filter(t => new Date(t.createdAt).toDateString() === now.toDateString()).reduce((s, t) => s + (t.kCoinsAwarded || 0), 0);

  // Last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const value = orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).length;
    const revenue = paid.filter(t => new Date(t.createdAt).toDateString() === d.toDateString()).reduce((s, t) => s + (t.vendorAmount || 0), 0);
    return { label, value, revenue };
  });
  const maxOrders = Math.max(...last7.map(d => d.value), 1);
  const maxRevenue = Math.max(...last7.map(d => d.revenue), 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MStatCard label="Total Revenue" value={`₹${totalRevenue.toFixed(0)}`} icon={<IndianRupee className="w-4 h-4 text-emerald-400" />} color="bg-emerald-500/10" />
        <MStatCard label="Today's Sales" value={`₹${todaySales.toFixed(0)}`} icon={<TrendingUp className="w-4 h-4 text-blue-400" />} color="bg-blue-500/10" />
        <MStatCard label="Avg Order" value={`₹${avgOrder}`} icon={<BarChart2 className="w-4 h-4 text-amber-400" />} color="bg-amber-500/10" />
        <MStatCard label="Completion" value={`${completionRate}%`} icon={<CheckCheck className="w-4 h-4 text-klu-red" />} color="bg-klu-red/10" />
      </div>

      {/* K-Coins earned via this outlet */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🏆</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Total K-Coins Awarded</p>
            <p className="text-xl font-black text-amber-400">{totalKCoins}</p>
            <p className="text-[10px] text-white/20">via your outlet</p>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">⭐</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Today's K-Coins</p>
            <p className="text-xl font-black text-amber-400">{todayKCoins}</p>
            <p className="text-[10px] text-white/20">{todayOrders.length} orders today</p>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders chart */}
        <GlassCard className="p-5">
          <p className="font-black text-sm mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-klu-red" /> Orders — Last 7 Days</p>
          <div className="flex items-end gap-2" style={{ height: 80 }}>
            {last7.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex items-end justify-center" style={{ height: 64 }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(d.value / maxOrders) * 100}%` }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                    className="w-full bg-klu-red/60 rounded-t-md min-h-[2px]" />
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded whitespace-nowrap z-10">{d.value}</div>
                </div>
                <p className="text-[8px] text-white/30 font-black">{d.label}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Revenue chart */}
        <GlassCard className="p-5">
          <p className="font-black text-sm mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-emerald-400" /> Revenue — Last 7 Days</p>
          <div className="flex items-end gap-2" style={{ height: 80 }}>
            {last7.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex items-end justify-center" style={{ height: 64 }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                    className="w-full bg-emerald-500/60 rounded-t-md min-h-[2px]" />
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded whitespace-nowrap z-10">₹{d.revenue.toFixed(0)}</div>
                </div>
                <p className="text-[8px] text-white/30 font-black">{d.label}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Food Orders', value: foodCount, color: 'text-klu-red', icon: ShoppingBag },
          { label: 'Direct Pays', value: directCount, color: 'text-blue-400', icon: ScanLine },
          { label: 'Cancelled', value: cancelledCount, color: 'text-red-400', icon: XCircle },
          { label: 'Total Orders', value: orders.length, color: 'text-white/60', icon: Package },
        ].map(s => (
          <GlassCard key={s.label} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <div>
              <p className="text-[10px] text-white/30 font-black uppercase">{s.label}</p>
              <p className={cn('text-lg font-black', s.color)}>{s.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
};

// ── Menu Tab ──────────────────────────────────────────────────────────────────
const MenuTab: React.FC<{
  menu: MenuItem[]; outletId: string;
  onSaveItem?: (item: Partial<MenuItem> & { name: string; price: number; category: string }) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  onToggleAvailability?: (id: string, isAvailable: boolean) => void;
}> = ({ menu, outletId, onSaveItem, onDeleteItem, onToggleAvailability }) => {
  const [itemModal, setItemModal] = useState<Partial<MenuItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const filtered = useMemo(() => menu.filter(m => {
    const matchCat = catFilter === 'All' || m.category === catFilter;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [menu, catFilter, search]);

  const cats = ['All', ...Array.from(new Set(menu.map(m => m.category)))];

  const handleSave = async () => {
    if (!itemModal?.name || !itemModal?.price) return;
    setSaving(true);
    await onSaveItem?.({ ...itemModal, name: itemModal.name!, price: itemModal.price!, category: itemModal.category || 'Main' });
    setSaving(false);
    setItemModal(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-klu-red/40"
            placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setItemModal({ category: 'Main', isAvailable: true, outletId })}
          className="flex items-center gap-1.5 px-4 h-10 bg-klu-red rounded-xl text-white text-xs font-black shadow-lg shadow-klu-red/30 active:scale-95 transition-all flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-black border transition-all whitespace-nowrap flex-shrink-0',
              catFilter === c ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white')}>
            {c}
          </button>
        ))}
      </div>

      {/* Desktop grid */}
      <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(item => (
          <motion.div key={item.id} layout className="glass-frosted rounded-2xl border border-white/10 overflow-hidden">
            <div className="h-24 relative overflow-hidden">
              <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/300/150`} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-2 right-2">
                <button onClick={() => onToggleAvailability?.(item.id, !item.isAvailable)}
                  className={cn('px-2 py-1 rounded-lg text-[10px] font-black border transition-all',
                    item.isAvailable ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/30 text-red-400')}>
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </button>
              </div>
            </div>
            <div className="p-3">
              <p className="font-black text-sm">{item.name}</p>
              <p className="text-[10px] text-white/30 mb-2">{item.category} · {item.prepTime}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-klu-red">₹{item.price}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setItemModal({ ...item })} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => setDeleteId(item.id)} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile list */}
      <div className="lg:hidden space-y-2">
        {filtered.map(item => (
          <div key={item.id} className="glass-frosted rounded-2xl border border-white/10 p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
              <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">{item.name}</p>
              <p className="text-[10px] text-white/30">₹{item.price} · {item.category}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => onToggleAvailability?.(item.id, !item.isAvailable)}
                className={cn('w-8 h-8 rounded-xl flex items-center justify-center border transition-all',
                  item.isAvailable ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400')}>
                {item.isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setItemModal({ ...item })} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 glass-frosted rounded-3xl border border-white/10">
          <UtensilsCrossed className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No items found</p>
        </div>
      )}

      {/* Item Modal */}
      <AnimatePresence>
        {itemModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={e => { if (e.target === e.currentTarget) setItemModal(null); }}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg glass-frosted rounded-[32px] border border-white/10 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="font-black text-lg">{itemModal.id ? 'Edit Item' : 'Add Menu Item'}</p>
                <button onClick={() => setItemModal(null)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30"><X className="w-4 h-4" /></button>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Item Name</p>
                <input className="input-field" placeholder="e.g. Chicken Biryani" value={itemModal.name || ''} onChange={e => setItemModal(p => ({ ...p!, name: e.target.value }))} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Price (₹)</p>
                  <input className="input-field" type="number" inputMode="numeric" placeholder="0" value={itemModal.price || ''} onChange={e => setItemModal(p => ({ ...p!, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Prep Time</p>
                  <input className="input-field" placeholder="10m" value={itemModal.prepTime || ''} onChange={e => setItemModal(p => ({ ...p!, prepTime: e.target.value }))} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {ITEM_CATS.map(cat => (
                    <button key={cat} onClick={() => setItemModal(p => ({ ...p!, category: cat }))}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-black border transition-all', itemModal.category === cat ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40')}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Image URL (optional)</p>
                <input className="input-field" placeholder="https://..." value={itemModal.imageUrl || ''} onChange={e => setItemModal(p => ({ ...p!, imageUrl: e.target.value }))} />
              </div>
              <ClayButton onClick={handleSave} className="w-full h-12" disabled={saving || !itemModal.name || !itemModal.price}>
                {saving ? 'Saving...' : itemModal.id ? 'Save Changes' : 'Add Item'}
              </ClayButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-frosted rounded-[32px] border border-white/10 p-8 max-w-xs w-full text-center shadow-2xl">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-400" /></div>
              <p className="font-black text-lg mb-1">Delete item?</p>
              <p className="text-white/30 text-sm mb-6">This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-white/5 rounded-2xl text-white/50 font-bold text-sm">Cancel</button>
                <button onClick={async () => { await onDeleteItem?.(deleteId); setDeleteId(null); }} className="flex-1 py-3 bg-red-500 rounded-2xl text-white font-black text-sm">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Outlet Tab ────────────────────────────────────────────────────────────────
const OUTLET_CATS = ['Meals', 'Cafe', 'Bakery', 'Juice', 'Snacks'];
const BLOCK_PRESETS_M: Record<string, string[]> = {
  'Tulip Hostel': ["Friend's Canteen", 'Tulip Snacks Corner'],
  'Himalaya Hostel': ['Himalaya Canteen', 'Himalaya Juice Bar'],
  'Kanchan Ganga Hostel': ['KG Canteen', 'KG Snacks'],
};

const OutletTab: React.FC<{
  outlet: Outlet | null;
  allOutlets: Outlet[];
  onSave?: (d: Partial<Outlet> & { name: string }) => Promise<void>;
  onSwitchOutlet?: (id: string) => void;
}> = ({ outlet, allOutlets, onSave, onSwitchOutlet }) => {
  const [mode, setMode] = useState<'edit' | 'create'>('edit');
  const [form, setForm] = useState<Partial<Outlet>>(outlet || {});
  const [newForm, setNewForm] = useState<Partial<Outlet>>({ name: '', description: '', blockName: 'Tulip Hostel', category: 'Meals', upiId: '', imageUrl: '', isOpen: true, timings: '8am - 9pm' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (outlet) setForm(outlet); }, [outlet?.id]);

  const handleSave = async () => {
    const f = mode === 'edit' ? form : newForm;
    if (!f.name) return;
    setSaving(true);
    await onSave?.({ ...f, name: f.name! });
    setSaving(false); setSaved(true);
    if (mode === 'create') setNewForm({ name: '', description: '', blockName: 'Tulip Hostel', category: 'Meals', upiId: '', imageUrl: '', isOpen: true, timings: '8am - 9pm' });
    setTimeout(() => setSaved(false), 2000);
  };

  const f = mode === 'edit' ? form : newForm;
  const setF = mode === 'edit' ? setForm : setNewForm;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 max-w-xs">
        <button onClick={() => setMode('edit')} className={cn('flex-1 py-2 rounded-xl text-xs font-black transition-all', mode === 'edit' ? 'bg-klu-red text-white' : 'text-white/40 hover:text-white')}>
          Edit Outlet
        </button>
        <button onClick={() => setMode('create')} className={cn('flex-1 py-2 rounded-xl text-xs font-black transition-all', mode === 'create' ? 'bg-klu-red text-white' : 'text-white/40 hover:text-white')}>
          + New Outlet
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <GlassCard className="p-5 space-y-4">
          {mode === 'edit' && outlet && (
            <div className="h-32 rounded-2xl overflow-hidden relative">
              <img src={f.imageUrl || `https://picsum.photos/seed/${outlet.id}/600/200`} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <p className="font-black text-white">{f.name}</p>
                <p className="text-[10px] text-white/60">{f.blockName}</p>
              </div>
            </div>
          )}
          {mode === 'create' && (
            <div className="p-3 bg-klu-red/10 border border-klu-red/20 rounded-2xl">
              <p className="text-xs font-black text-klu-red">Creating a new outlet</p>
              <p className="text-[10px] text-white/40 mt-0.5">It will be added to the platform and assigned to you.</p>
            </div>
          )}

          {mode === 'edit' && allOutlets.length > 1 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Switch Outlet</p>
              <select className="input-field" value={outlet?.id || ''} onChange={e => onSwitchOutlet?.(e.target.value)}>
                {allOutlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Outlet Name</p>
            <input className="input-field" placeholder="e.g. Friend's Canteen" value={f.name || ''} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
            {mode === 'create' && BLOCK_PRESETS_M[f.blockName || ''] && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {BLOCK_PRESETS_M[f.blockName!].map(preset => (
                  <button key={preset} type="button" onClick={() => setF(p => ({ ...p, name: preset }))}
                    className={cn('px-2.5 py-1 rounded-full text-[10px] font-black border transition-all', f.name === preset ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/50')}>
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Description</p>
            <input className="input-field" placeholder="Short description" value={f.description || ''} onChange={e => setF(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">UPI ID</p>
              <input className="input-field" placeholder="merchant@okaxis" value={f.upiId || ''} onChange={e => setF(p => ({ ...p, upiId: e.target.value }))} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Timings</p>
              <input className="input-field" placeholder="8am - 9pm" value={f.timings || ''} onChange={e => setF(p => ({ ...p, timings: e.target.value }))} />
            </div>
          </div>
          {mode === 'create' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Block</p>
                <select className="input-field" value={f.blockName || 'Tulip Hostel'} onChange={e => setF(p => ({ ...p, blockName: e.target.value, name: '' }))}>
                  {['Tulip Hostel', 'Himalaya Hostel', 'Kanchan Ganga Hostel', 'CSE Block', 'ECE Block', 'Main Block'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Category</p>
                <select className="input-field" value={f.category || 'Meals'} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
                  {OUTLET_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Image URL (optional)</p>
            <input className="input-field" placeholder="https://..." value={f.imageUrl || ''} onChange={e => setF(p => ({ ...p, imageUrl: e.target.value }))} />
          </div>
          <ClayButton onClick={handleSave} className="w-full h-12" disabled={saving || !f.name}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : mode === 'create' ? 'Create Outlet' : 'Save Changes'}
          </ClayButton>
        </GlassCard>

        {/* Info panel */}
        {mode === 'edit' && outlet && (
          <div className="space-y-3">
            <GlassCard className="p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Outlet Info</p>
              <div className="space-y-2">
                {[
                  { label: 'ID', value: outlet.id },
                  { label: 'Category', value: outlet.category },
                  { label: 'Block', value: outlet.blockName },
                  { label: 'Status', value: outlet.isOpen ? 'Open' : 'Closed' },
                  { label: 'UPI', value: outlet.upiId || 'Not set' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-xs">
                    <span className="text-white/30">{row.label}</span>
                    <span className="font-black text-white/70 truncate max-w-[60%] text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── No Outlet Setup ───────────────────────────────────────────────────────────
const NoOutletSetup: React.FC<{ outlets: Outlet[]; onSaveOutlet?: (d: Partial<Outlet> & { name: string }) => Promise<void>; onAssignOutlet?: (id: string) => Promise<void> }> = ({ outlets, onSaveOutlet, onAssignOutlet }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 space-y-4">
    <div className="w-20 h-20 bg-klu-red/10 border border-klu-red/20 rounded-full flex items-center justify-center mx-auto">
      <Store className="w-10 h-10 text-klu-red" />
    </div>
    <p className="font-black text-xl">No outlet assigned</p>
    <p className="text-white/40 text-sm max-w-xs mx-auto">Ask your admin to assign an outlet to your account, or select one below.</p>
    {outlets.length > 0 && (
      <div className="space-y-2 max-w-xs mx-auto">
        {outlets.map(o => (
          <button key={o.id} onClick={() => onAssignOutlet?.(o.id)}
            className="w-full p-3 glass-frosted rounded-2xl border border-white/10 text-left hover:border-klu-red/30 transition-all">
            <p className="font-black text-sm">{o.name}</p>
            <p className="text-[10px] text-white/30">{o.blockName}</p>
          </button>
        ))}
      </div>
    )}
  </motion.div>
);

// ── Main MerchantView ─────────────────────────────────────────────────────────
export const MerchantView: React.FC<MerchantViewProps> = ({
  orders: propOrders, outlets, merchantOutlet, onUpdateStatus, onSwitchView,
  menu = [], onSaveItem, onDeleteItem, onToggleAvailability, onSaveOutlet, onAssignOutlet,
  allMerchantOutlets = [],
}) => {
  const [tab, setTab] = useState<DashTab>('orders');
  const [alerts, setAlerts] = useState<PaymentAlertPayload[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [outletMenus, setOutletMenus] = useState<Record<string, MenuItem[]>>({});
  const [isOpen, setIsOpen] = useState(true);

  const myOutlets = allMerchantOutlets.length > 0 ? allMerchantOutlets : (merchantOutlet ? [merchantOutlet] : []);
  const [activeOutletId, setActiveOutletId] = useState<string>(merchantOutlet?.id || myOutlets[0]?.id || '');
  const activeOutlet = myOutlets.find(o => o.id === activeOutletId) || myOutlets[0] || null;

  useEffect(() => { if (merchantOutlet?.id && !activeOutletId) setActiveOutletId(merchantOutlet.id); }, [merchantOutlet?.id]);
  useEffect(() => { if (activeOutlet) setIsOpen(activeOutlet.isOpen); }, [activeOutlet?.id]);

  useEffect(() => {
    if (!activeOutlet?.id) return;
    const fetch = () => supabase.from('orders').select('*').eq('outlet_id', activeOutlet.id).eq('payment_status', 'paid').order('created_at', { ascending: false }).then(({ data }) => { if (data) setLiveOrders(data.map(rowToOrder)); });
    fetch();
    const ch = supabase.channel(`mv_orders_${activeOutlet.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${activeOutlet.id}` }, fetch).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeOutlet?.id]);

  useEffect(() => {
    if (!activeOutlet?.id) return;
    setLoadingTx(true);
    const fetch = () => supabase.from('transactions').select('*').eq('outlet_id', activeOutlet.id).order('created_at', { ascending: false }).then(({ data }) => { if (data) setTransactions(data.map(rowToTransaction)); setLoadingTx(false); });
    fetch();
    const ch = supabase.channel(`merchant_tx_${activeOutlet.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `outlet_id=eq.${activeOutlet.id}` }, fetch).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeOutlet?.id]);

  useEffect(() => {
    if (!activeOutlet?.id) return;
    const fetch = () => supabase.from('menu_items').select('*').eq('outlet_id', activeOutlet.id).order('name').then(({ data }) => {
      if (data) setOutletMenus(prev => ({ ...prev, [activeOutlet.id]: data.map(r => ({ id: r.id, outletId: r.outlet_id, name: r.name, description: r.description || '', price: Number(r.price), imageUrl: r.image_url || '', category: r.category, isAvailable: r.is_available ?? true, prepTime: r.prep_time })) }));
    });
    fetch();
    const ch = supabase.channel(`mv_menu_${activeOutlet.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${activeOutlet.id}` }, fetch).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeOutlet?.id]);

  useEffect(() => {
    if (!activeOutlet?.id) return;
    const ch = supabase.channel(`merchant_alerts_${activeOutlet.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `outlet_id=eq.${activeOutlet.id}` }, ({ new: row }) => {
        if (!row) return;
        const alert: PaymentAlertPayload = { type: row.flow === 'Food_Order' ? 'Food_Order' : 'Direct_Pay', status: row.payment_status === 'paid' ? 'confirmed' : 'pending', amount: Number(row.total_amount), fromName: row.student_name || 'Student', outletId: row.outlet_id, token: row.token, note: row.note, orderId: row.id, timestamp: Date.now() };
        setAlerts(prev => [alert, ...prev].slice(0, 10));
        if (voiceEnabled) announcePayment(alert.amount, alert.type, alert.fromName);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `outlet_id=eq.${activeOutlet.id}` }, ({ new: row }) => {
        if (row?.payment_status !== 'paid') return;
        const alert: PaymentAlertPayload = { type: row.flow === 'Food_Order' ? 'Food_Order' : 'Direct_Pay', status: 'confirmed', amount: Number(row.total_amount), fromName: row.student_name || 'Student', outletId: row.outlet_id, token: row.token, note: row.note, orderId: row.id, timestamp: Date.now() };
        setAlerts(prev => [alert, ...prev].slice(0, 10));
        if (voiceEnabled) announcePayment(alert.amount, alert.type, alert.fromName);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeOutlet?.id, voiceEnabled]);

  const handleUpdateStatus = useCallback(async (orderId: string, status: Order['status']) => {
    setLiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    await supabase.from('orders').update({ status }).eq('id', orderId);
    onUpdateStatus(orderId, status);
  }, [onUpdateStatus]);

  const handleRefresh = async () => {
    if (!activeOutlet?.id) return;
    setRefreshing(true);
    const [{ data: o }, { data: t }, { data: m }] = await Promise.all([
      supabase.from('orders').select('*').eq('outlet_id', activeOutlet.id).eq('payment_status', 'paid').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('outlet_id', activeOutlet.id).order('created_at', { ascending: false }),
      supabase.from('menu_items').select('*').eq('outlet_id', activeOutlet.id).order('name'),
    ]);
    if (o) setLiveOrders(o.map(rowToOrder));
    if (t) setTransactions(t.map(rowToTransaction));
    if (m) setOutletMenus(prev => ({ ...prev, [activeOutlet.id]: m.map(r => ({ id: r.id, outletId: r.outlet_id, name: r.name, description: r.description || '', price: Number(r.price), imageUrl: r.image_url || '', category: r.category, isAvailable: r.is_available ?? true, prepTime: r.prep_time })) }));
    setRefreshing(false);
  };

  const toggleOutletOpen = async () => {
    if (!activeOutlet) return;
    const next = !isOpen; setIsOpen(next);
    await supabase.from('outlets').update({ is_open: next }).eq('id', activeOutlet.id);
  };

  if (myOutlets.length === 0) return <NoOutletSetup outlets={outlets} onSaveOutlet={onSaveOutlet} onAssignOutlet={onAssignOutlet} />;

  const now = new Date();
  const todayOrders = liveOrders.filter(o => new Date(o.createdAt || '').toDateString() === now.toDateString());
  const activeOrders = liveOrders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled');
  const todaySales = todayOrders.reduce((s, o) => s + (o.vendorAmount || 0), 0);
  const activeMenu = outletMenus[activeOutlet?.id || ''] ?? menu;

  const TABS: { id: DashTab; label: string; icon: any; badge?: number }[] = [
    { id: 'orders',    label: 'Orders',    icon: ShoppingBag, badge: activeOrders.length },
    { id: 'payments',  label: 'Payments',  icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'menu',      label: 'Menu',      icon: UtensilsCrossed },
    { id: 'outlet',    label: 'Outlet',    icon: Store },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Merchant Dashboard</p>
          {myOutlets.length > 1 ? (
            <div className="relative inline-flex items-center gap-1">
              <select value={activeOutletId} onChange={e => { setActiveOutletId(e.target.value); setLiveOrders([]); setTransactions([]); }}
                className="appearance-none bg-transparent text-2xl font-black text-white pr-6 outline-none cursor-pointer max-w-[220px] truncate">
                {myOutlets.map(o => <option key={o.id} value={o.id} className="bg-gray-900 text-base font-normal">{o.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-white/40 pointer-events-none flex-shrink-0" />
            </div>
          ) : (
            <h2 className="text-display text-2xl lg:text-3xl font-black leading-tight truncate">{activeOutlet?.name}</h2>
          )}
          <p className="text-white/30 text-xs mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{activeOutlet?.blockName}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={handleRefresh} className={cn('w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all', refreshing && 'animate-spin')}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setVoiceEnabled(v => !v)}
            className={cn('w-10 h-10 rounded-xl border flex items-center justify-center transition-all', voiceEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/20')}>
            <Volume2 className="w-4 h-4" />
          </button>
          <button onClick={toggleOutletOpen}
            className={cn('flex items-center gap-1.5 px-3 h-10 rounded-xl border font-black text-xs transition-all',
              isOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400')}>
            <div className={cn('w-2 h-2 rounded-full', isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
            {isOpen ? 'Open' : 'Closed'}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MStatCard label="Active Orders" value={activeOrders.length} icon={<Activity className="w-4 h-4 text-amber-400" />} color="bg-amber-500/10" />
        <MStatCard label="Today's Orders" value={todayOrders.length} icon={<Package className="w-4 h-4 text-blue-400" />} color="bg-blue-500/10" />
        <MStatCard label="Today's Sales" value={`₹${todaySales.toFixed(0)}`} icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} color="bg-emerald-500/10" />
        <MStatCard label="Menu Items" value={`${activeMenu.filter(m => m.isAvailable).length}/${activeMenu.length}`} icon={<UtensilsCrossed className="w-4 h-4 text-klu-red" />} color="bg-klu-red/10" />
      </div>

      {/* Live alerts */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2"><Bell className="w-3 h-3 text-amber-400" /> Live Alerts</p>
              <button onClick={() => setAlerts([])} className="text-[10px] text-white/20 hover:text-white/50 font-black">Clear</button>
            </div>
            {alerts.slice(0, 3).map((alert, i) => (
              <motion.div key={`${alert.orderId}-${i}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className={cn('flex items-center gap-3 p-3 rounded-2xl border',
                  alert.status === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-blue-500/10 border-blue-500/20')}>
                {alert.type === 'Food_Order' ? <ShoppingBag className="w-5 h-5 text-blue-400 flex-shrink-0" /> : <ScanLine className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white">{alert.status === 'confirmed' ? '✓ Payment Confirmed' : `New Order — Token #${alert.token || '—'}`}</p>
                  <p className="text-white/30 text-[10px]">{alert.fromName}{alert.note ? ` · ${alert.note}` : ''}</p>
                </div>
                <span className="text-xs font-black text-white/60">₹{alert.amount}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10 gap-1 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-1.5 py-2.5 lg:py-2 px-2 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-wide transition-all relative whitespace-nowrap',
              tab === t.id ? 'bg-klu-red text-white shadow-lg shadow-klu-red/30' : 'text-white/30 hover:text-white/60')}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black rounded-full text-[8px] font-black flex items-center justify-center">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'orders'    && <OrdersTab    key="orders"    orders={liveOrders} onUpdateStatus={handleUpdateStatus} />}
        {tab === 'payments'  && <PaymentsTab  key="payments"  transactions={transactions} loading={loadingTx} />}
        {tab === 'analytics' && <AnalyticsTab key="analytics" orders={liveOrders} transactions={transactions} />}
        {tab === 'menu'      && <MenuTab      key={`menu-${activeOutlet?.id}`} menu={activeMenu} outletId={activeOutlet?.id || ''} onSaveItem={item => onSaveItem?.(item, activeOutlet?.id)} onDeleteItem={onDeleteItem} onToggleAvailability={onToggleAvailability} />}
        {tab === 'outlet'    && <OutletTab    key="outlet"    outlet={activeOutlet} allOutlets={myOutlets} onSave={onSaveOutlet} onSwitchOutlet={setActiveOutletId} />}
      </AnimatePresence>
    </motion.div>
  );
};
