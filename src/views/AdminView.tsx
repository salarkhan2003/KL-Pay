import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, TrendingUp, Users, Plus, Trash2, Settings, X, Store, Tag, Link,
  CreditCard, Clock, ChevronDown, ChevronUp, KeyRound, Check, ShoppingBag,
  Activity, DollarSign, Package, RefreshCw, Filter, Search, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, Zap, Globe, PieChart, Calendar,
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { BlockPicker, PRESET_BLOCKS } from '../components/BlockPicker';
import { cn } from '../utils';
import { Order, Outlet, MenuItem, Transaction } from '../types';
import { supabase } from '../supabase';

interface AdminViewProps {
  allOrders: Order[];
  allTransactions: Transaction[];
  outlets: Outlet[];
  onSeedData: () => void;
  isSeeding: boolean;
  onSaveOutlet: (data: Partial<Outlet> & { name: string }) => Promise<void>;
  onDeleteOutlet: (id: string) => Promise<void>;
  onSaveMenuItem: (item: Partial<MenuItem> & { name: string; price: number; category: string }, outletId: string) => Promise<void>;
  onDeleteMenuItem: (itemId: string, outletId: string) => Promise<void>;
  initialTab?: AdminTab;
}

type AdminTab = 'overview' | 'orders' | 'transactions' | 'outlets' | 'codes' | 'tools';

const BLOCKS = PRESET_BLOCKS;
const CATEGORIES = ['Meals', 'Cafe', 'Bakery', 'Juice', 'Snacks'];
const ITEM_CATS = ['Main', 'Snack', 'Breakfast', 'Beverage', 'Juice', 'Dessert'];
const EMPTY_OUTLET: Partial<Outlet> = { name: '', description: '', blockName: 'Tulip Hostel', category: 'Meals', upiId: '', imageUrl: '', isOpen: true, timings: '8am - 9pm' };
const BLOCK_PRESETS: Record<string, string[]> = {
  'Tulip Hostel': ["Friend's Canteen", 'Tulip Snacks Corner'],
  'Himalaya Hostel': ['Himalaya Canteen', 'Himalaya Juice Bar'],
  'Kanchan Ganga Hostel': ['KG Canteen', 'KG Snacks'],
};
const EMPTY_ITEM = { name: '', price: 0, category: 'Main', prepTime: '10m', description: '', imageUrl: '', isAvailable: true };

// ── Shared UI ─────────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-full max-w-lg glass-frosted rounded-[32px] border border-white/10 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="font-black text-lg">{title}</p>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 flex items-center gap-1.5">{icon}{label}</p>
    {children}
  </div>
);

const ConfirmDelete: React.FC<{ label: string; onCancel: () => void; onConfirm: () => Promise<void> }> = ({ label, onCancel, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="glass-frosted rounded-[32px] border border-white/10 p-8 max-w-xs w-full text-center shadow-2xl">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-7 h-7 text-red-400" />
        </div>
        <p className="font-black text-lg mb-1">Delete {label}?</p>
        <p className="text-white/30 text-sm mb-6">This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-white/5 rounded-2xl text-white/50 font-bold text-sm">Cancel</button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
            disabled={loading} className="flex-1 py-3 bg-red-500 rounded-2xl text-white font-black text-sm disabled:opacity-60">
            {loading ? '...' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Mini Bar Chart (pure CSS/SVG, no extra deps) ──────────────────────────────
const MiniBarChart: React.FC<{ data: { label: string; value: number; color?: string }[]; height?: number }> = ({ data, height = 80 }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="relative w-full flex items-end justify-center" style={{ height: height - 16 }}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
              className={cn('w-full rounded-t-md min-h-[2px]', d.color || 'bg-klu-red/60')}
            />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded whitespace-nowrap z-10">
              {d.value}
            </div>
          </div>
          <p className="text-[8px] text-white/30 font-black truncate w-full text-center">{d.label}</p>
        </div>
      ))}
    </div>
  );
};

// ── Donut Chart (SVG) ─────────────────────────────────────────────────────────
const DonutChart: React.FC<{ segments: { value: number; color: string; label: string }[]; size?: number }> = ({ segments, size = 80 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = (size / 2) - 8;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circumference;
        const gap = circumference - dash;
        const el = (
          <motion.circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="10"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${dash} ${gap}` }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; trend?: number }> = ({ label, value, sub, icon, color, trend }) => (
  <GlassCard className="p-4 lg:p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', color)}>{icon}</div>
      {trend !== undefined && (
        <div className={cn('flex items-center gap-0.5 text-[10px] font-black', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="text-2xl lg:text-3xl font-black text-white">{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">{label}</p>
    {sub && <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>}
  </GlassCard>
);

// ── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab: React.FC<{ allOrders: Order[]; allTransactions: Transaction[]; outlets: Outlet[] }> = ({ allOrders, allTransactions, outlets }) => {
  const now = new Date();
  const today = allOrders.filter(o => { const d = new Date(o.createdAt); return d.toDateString() === now.toDateString(); });
  const paid = allTransactions.filter(t => t.paymentStatus === 'paid');
  const totalRevenue = paid.reduce((s, t) => s + t.totalAmount, 0);
  const platformFees = paid.reduce((s, t) => s + t.platformFee, 0);
  const todayRevenue = paid.filter(t => new Date(t.createdAt).toDateString() === now.toDateString()).reduce((s, t) => s + t.totalAmount, 0);
  const activeOrders = allOrders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled').length;
  const totalKCoins = paid.reduce((s, t) => s + (t.kCoinsAwarded || 0), 0);

  // K-Coins per outlet
  const kCoinsByOutlet = outlets.map(o => ({
    name: o.name,
    coins: paid.filter(t => t.outletId === o.id).reduce((s, t) => s + (t.kCoinsAwarded || 0), 0),
    txCount: paid.filter(t => t.outletId === o.id).length,
  })).filter(o => o.coins > 0).sort((a, b) => b.coins - a.coins);

  // Last 7 days bar chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const value = allOrders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).length;
    return { label, value };
  });

  // Revenue by outlet
  const outletRevenue = outlets.map(o => ({
    label: o.name.split(' ')[0],
    value: paid.filter(t => t.outletId === o.id).reduce((s, t) => s + t.totalAmount, 0),
    color: 'bg-klu-red/70',
  })).filter(o => o.value > 0);

  // Flow split
  const foodCount = paid.filter(t => t.flow === 'Food_Order').length;
  const directCount = paid.filter(t => t.flow === 'Peer_to_Merchant_Pay').length;

  // Status breakdown
  const statusCounts = {
    pending: allOrders.filter(o => o.status === 'pending').length,
    preparing: allOrders.filter(o => o.status === 'preparing').length,
    ready: allOrders.filter(o => o.status === 'ready').length,
    picked_up: allOrders.filter(o => o.status === 'picked_up').length,
    cancelled: allOrders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toFixed(0)}`} sub={`${paid.length} transactions`} icon={<DollarSign className="w-5 h-5 text-emerald-400" />} color="bg-emerald-500/10" trend={12} />
        <StatCard label="Platform Fees" value={`₹${platformFees.toFixed(2)}`} sub="Net earnings" icon={<TrendingUp className="w-5 h-5 text-blue-400" />} color="bg-blue-500/10" trend={8} />
        <StatCard label="Today's Orders" value={today.length} sub={`₹${todayRevenue.toFixed(0)} revenue`} icon={<ShoppingBag className="w-5 h-5 text-amber-400" />} color="bg-amber-500/10" />
        <StatCard label="Active Orders" value={activeOrders} sub="Needs attention" icon={<Activity className="w-5 h-5 text-klu-red" />} color="bg-klu-red/10" />
      </div>

      {/* K-Coins row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <span className="text-lg">🏆</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Total K-Coins Awarded</p>
              <p className="text-2xl font-black text-amber-400">{totalKCoins.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-[10px] text-white/20">Across {paid.length} paid transactions · 5 coins per order</p>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <p className="font-black text-sm flex items-center gap-2 mb-3">🏆 K-Coins by Outlet</p>
          {kCoinsByOutlet.length === 0 ? (
            <p className="text-white/20 text-xs text-center py-4">No K-Coins awarded yet</p>
          ) : (
            <div className="space-y-2.5">
              {kCoinsByOutlet.map((o, i) => {
                const max = kCoinsByOutlet[0].coins;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-white/60 truncate">{o.name}</span>
                      <span className="text-amber-400 flex-shrink-0 ml-2">{o.coins} coins · {o.txCount} orders</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(o.coins / max) * 100}%` }}
                        transition={{ delay: i * 0.1 }} className="h-full bg-amber-400/60 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Orders last 7 days */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="font-black text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-klu-red" /> Orders — Last 7 Days</p>
            <p className="text-[10px] text-white/30 font-black">{allOrders.length} total</p>
          </div>
          <MiniBarChart data={last7} height={100} />
        </GlassCard>

        {/* Payment flow donut */}
        <GlassCard className="p-5">
          <p className="font-black text-sm flex items-center gap-2 mb-4"><PieChart className="w-4 h-4 text-klu-red" /> Payment Split</p>
          <div className="flex items-center gap-4">
            <DonutChart size={80} segments={[
              { value: foodCount, color: '#c8102e', label: 'Food' },
              { value: directCount, color: '#3b82f6', label: 'Direct' },
            ]} />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-klu-red" />
                <p className="text-xs text-white/60">Food Orders <span className="font-black text-white">{foodCount}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <p className="text-xs text-white/60">Direct Pay <span className="font-black text-white">{directCount}</span></p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Revenue by outlet + Order status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <p className="font-black text-sm flex items-center gap-2 mb-4"><Store className="w-4 h-4 text-klu-red" /> Revenue by Outlet</p>
          {outletRevenue.length === 0 ? (
            <p className="text-white/20 text-xs text-center py-6">No revenue data yet</p>
          ) : (
            <div className="space-y-3">
              {outletRevenue.sort((a, b) => b.value - a.value).map((o, i) => {
                const max = outletRevenue[0].value;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-white/60 truncate">{o.label}</span>
                      <span className="text-white">₹{o.value.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(o.value / max) * 100}%` }}
                        transition={{ delay: i * 0.1 }} className="h-full bg-klu-red rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <p className="font-black text-sm flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-klu-red" /> Order Status</p>
          <div className="space-y-2.5">
            {[
              { label: 'Pending', count: statusCounts.pending, color: 'bg-amber-400', text: 'text-amber-400' },
              { label: 'Preparing', count: statusCounts.preparing, color: 'bg-blue-400', text: 'text-blue-400' },
              { label: 'Ready', count: statusCounts.ready, color: 'bg-emerald-400', text: 'text-emerald-400' },
              { label: 'Picked Up', count: statusCounts.picked_up, color: 'bg-white/30', text: 'text-white/40' },
              { label: 'Cancelled', count: statusCounts.cancelled, color: 'bg-red-400', text: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', s.color)} />
                <p className="text-xs text-white/50 flex-1">{s.label}</p>
                <p className={cn('text-xs font-black', s.text)}>{s.count}</p>
                <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / (allOrders.length || 1)) * 100}%` }}
                    className={cn('h-full rounded-full', s.color)} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Block breakdown */}
      <GlassCard className="p-5">
        <p className="font-black text-sm flex items-center gap-2 mb-4"><Globe className="w-4 h-4 text-klu-red" /> Orders by Block</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {BLOCKS.slice(0, 6).map(block => {
            const count = allOrders.filter(o => o.block === block).length;
            const pct = ((count / (allOrders.length || 1)) * 100);
            return (
              <div key={block} className="bg-white/[0.03] rounded-2xl p-3 border border-white/5">
                <p className="text-[10px] font-black text-white/40 truncate mb-1">{block}</p>
                <p className="text-lg font-black text-white">{count}</p>
                <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-klu-red rounded-full" />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </motion.div>
  );
};

// ── Orders Tab ────────────────────────────────────────────────────────────────
const OrdersTab: React.FC<{ allOrders: Order[]; outlets: Outlet[] }> = ({ allOrders, outlets }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => allOrders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch = !search || o.userName?.toLowerCase().includes(search.toLowerCase()) || o.token?.includes(search) || o.id.includes(search);
    return matchStatus && matchSearch;
  }), [allOrders, statusFilter, search]);

  const statusColor: Record<string, string> = {
    pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    preparing: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    ready: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    picked_up: 'text-white/30 bg-white/5 border-white/10',
    cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-klu-red/40"
            placeholder="Search by name, token, ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'preparing', 'ready', 'picked_up', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 h-10 rounded-xl text-xs font-black border transition-all',
                statusFilter === s ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white')}>
              {s === 'all' ? `All (${allOrders.length})` : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden lg:block glass-frosted rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {['Token', 'Student', 'Outlet', 'Items', 'Amount', 'Status', 'Payment', 'Time'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((order, i) => {
              const outlet = outlets.find(o => o.id === order.outletId);
              return (
                <motion.tr key={order.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm font-black text-klu-red">#{order.token || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-black text-white">{order.userName || 'Student'}</p>
                    <p className="text-[10px] text-white/30">{order.userPhone || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">{outlet?.name || order.outletId}</td>
                  <td className="px-4 py-3 text-xs text-white/60">{order.items?.length || 0} items</td>
                  <td className="px-4 py-3 text-xs font-black text-white">₹{order.totalAmount?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-1 rounded-lg text-[10px] font-black border', statusColor[order.status] || 'text-white/30 bg-white/5 border-white/10')}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-1 rounded-lg text-[10px] font-black border',
                      order.paymentStatus === 'paid' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20')}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-white/30">
                    {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-white/20 text-sm py-12">No orders found</p>}
      </div>

      {/* Cards — mobile */}
      <div className="lg:hidden space-y-2">
        {filtered.slice(0, 30).map(order => {
          const outlet = outlets.find(o => o.id === order.outletId);
          const isExp = expanded === order.id;
          return (
            <div key={order.id} className="glass-frosted rounded-2xl border border-white/10 overflow-hidden">
              <button className="w-full p-4 text-left flex items-center gap-3" onClick={() => setExpanded(isExp ? null : order.id)}>
                <div className="w-10 h-10 rounded-xl bg-klu-red/10 flex items-center justify-center flex-shrink-0 text-xs font-black text-klu-red">#{order.token}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black">{order.userName || 'Student'}</p>
                  <p className="text-[10px] text-white/30">{outlet?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black">₹{order.totalAmount?.toFixed(0)}</p>
                  <span className={cn('text-[10px] font-black', statusColor[order.status]?.split(' ')[0])}>{order.status}</span>
                </div>
              </button>
              <AnimatePresence>
                {isExp && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5">
                    <div className="p-4 space-y-2">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-white/50">
                          <span>{item.quantity}× {item.name}</span><span>₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                      <p className="text-[10px] text-white/20 pt-1">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ── Transactions Tab ──────────────────────────────────────────────────────────
const TransactionsTab: React.FC<{ allTransactions: Transaction[] }> = ({ allTransactions }) => {
  const [search, setSearch] = useState('');
  const [flowFilter, setFlowFilter] = useState('all');

  const filtered = useMemo(() => allTransactions.filter(t => {
    const matchFlow = flowFilter === 'all' || t.flow === flowFilter;
    const matchSearch = !search || t.studentName?.toLowerCase().includes(search.toLowerCase()) || t.outletName?.toLowerCase().includes(search.toLowerCase());
    return matchFlow && matchSearch;
  }), [allTransactions, flowFilter, search]);

  const paid = allTransactions.filter(t => t.paymentStatus === 'paid');
  const totalRevenue = paid.reduce((s, t) => s + t.totalAmount, 0);
  const totalFees = paid.reduce((s, t) => s + t.platformFee, 0);
  const totalVendor = paid.reduce((s, t) => s + t.vendorAmount, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="p-4">
          <p className="text-[10px] text-white/30 font-black uppercase">Gross Revenue</p>
          <p className="text-xl font-black text-white">₹{totalRevenue.toFixed(0)}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[10px] text-white/30 font-black uppercase">Platform Fees</p>
          <p className="text-xl font-black text-emerald-400">₹{totalFees.toFixed(2)}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[10px] text-white/30 font-black uppercase">Vendor Payout</p>
          <p className="text-xl font-black text-blue-400">₹{totalVendor.toFixed(0)}</p>
        </GlassCard>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-klu-red/40"
            placeholder="Search student, outlet..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[['all', 'All'], ['Food_Order', 'Food Orders'], ['Peer_to_Merchant_Pay', 'Direct Pay']].map(([k, l]) => (
            <button key={k} onClick={() => setFlowFilter(k)}
              className={cn('px-3 h-10 rounded-xl text-xs font-black border transition-all',
                flowFilter === k ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block glass-frosted rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {['Type', 'Student', 'Outlet', 'Total', 'Fee', 'Vendor', 'Status', 'Time'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((tx, i) => (
              <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-1 rounded-lg text-[10px] font-black border',
                    tx.flow === 'Food_Order' ? 'text-klu-red bg-klu-red/10 border-klu-red/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20')}>
                    {tx.flow === 'Food_Order' ? '🍱 Food' : '💸 Direct'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-black text-white">{tx.studentName}</p>
                  <p className="text-[10px] text-white/30">{tx.studentPhone}</p>
                </td>
                <td className="px-4 py-3 text-xs text-white/60">{tx.outletName}</td>
                <td className="px-4 py-3 text-xs font-black text-white">₹{tx.totalAmount?.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs font-black text-emerald-400">₹{tx.platformFee?.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs font-black text-blue-400">₹{tx.vendorAmount?.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-1 rounded-lg text-[10px] font-black border',
                    tx.paymentStatus === 'paid' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                    tx.paymentStatus === 'failed' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20')}>
                    {tx.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-[10px] text-white/30">
                  {new Date(tx.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-white/20 text-sm py-12">No transactions found</p>}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {filtered.slice(0, 30).map(tx => (
          <div key={tx.id} className="glass-frosted rounded-2xl border border-white/10 p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base',
              tx.flow === 'Food_Order' ? 'bg-klu-red/10' : 'bg-blue-500/10')}>
              {tx.flow === 'Food_Order' ? '🍱' : '💸'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate">{tx.studentName}</p>
              <p className="text-[10px] text-white/30 truncate">{tx.outletName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-black">₹{tx.totalAmount?.toFixed(0)}</p>
              <p className={cn('text-[10px] font-black', tx.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400')}>{tx.paymentStatus}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ── Outlets Tab ───────────────────────────────────────────────────────────────
const OutletsTab: React.FC<{
  outlets: Outlet[];
  onSaveOutlet: (d: Partial<Outlet> & { name: string }) => Promise<void>;
  onDeleteOutlet: (id: string) => Promise<void>;
  onSaveMenuItem: (item: Partial<MenuItem> & { name: string; price: number; category: string }, outletId: string) => Promise<void>;
  onDeleteMenuItem: (itemId: string, outletId: string) => Promise<void>;
}> = ({ outlets, onSaveOutlet, onDeleteOutlet, onSaveMenuItem, onDeleteMenuItem }) => {
  const [outletModal, setOutletModal] = useState<Partial<Outlet> | null>(null);
  const [savingOutlet, setSavingOutlet] = useState(false);
  const [deleteOutletId, setDeleteOutletId] = useState<string | null>(null);
  const [expandedOutlet, setExpandedOutlet] = useState<string | null>(null);
  const [outletMenus, setOutletMenus] = useState<Record<string, MenuItem[]>>({});
  const [itemModal, setItemModal] = useState<{ item: Partial<typeof EMPTY_ITEM>; outletId: string } | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ id: string; outletId: string } | null>(null);

  useEffect(() => {
    if (!expandedOutlet) return;
    const load = () => supabase.from('menu_items').select('*').eq('outlet_id', expandedOutlet).then(({ data }) => {
      if (data) setOutletMenus(prev => ({ ...prev, [expandedOutlet]: data.map((r: any) => ({
        id: r.id, outletId: r.outlet_id, name: r.name, description: r.description || '',
        price: r.price, imageUrl: r.image_url || '', category: r.category,
        isAvailable: r.is_available, prepTime: r.prep_time,
      } as MenuItem)) }));
    });
    load();
    const ch = supabase.channel(`admin_menu_${expandedOutlet}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${expandedOutlet}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [expandedOutlet]);

  const handleSaveOutlet = async () => {
    if (!outletModal?.name) return;
    setSavingOutlet(true);
    const payload = { ...outletModal } as Partial<Outlet> & { name: string };
    if (!payload.id) {
      payload.id = `${payload.blockName || 'outlet'}-${payload.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    await onSaveOutlet(payload);
    setSavingOutlet(false);
    setOutletModal(null);
  };

  const handleSaveItem = async () => {
    if (!itemModal || !itemModal.item.name || !itemModal.item.price) return;
    setSavingItem(true);
    await onSaveMenuItem(itemModal.item as any, itemModal.outletId);
    setOutletMenus(prev => { const copy = { ...prev }; delete copy[itemModal.outletId]; return copy; });
    setSavingItem(false);
    setItemModal(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-white/60">{outlets.length} outlets registered</p>
        <button onClick={() => setOutletModal({ ...EMPTY_OUTLET })}
          className="flex items-center gap-1.5 px-4 py-2 bg-klu-red rounded-xl text-white text-xs font-black shadow-lg shadow-klu-red/30 active:scale-95 transition-all">
          <Plus className="w-3.5 h-3.5" /> Add Outlet
        </button>
      </div>

      {/* Desktop grid */}
      <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-4">
        {outlets.map(outlet => (
          <div key={outlet.id} className="glass-frosted rounded-2xl border border-white/10 overflow-hidden">
            <div className="h-28 relative overflow-hidden">
              <img src={outlet.imageUrl || `https://picsum.photos/seed/${outlet.id}/400/200`} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div>
                  <p className="font-black text-sm text-white">{outlet.name}</p>
                  <p className="text-[10px] text-white/50">{outlet.blockName}</p>
                </div>
                <div className={cn('w-2 h-2 rounded-full', outlet.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
              </div>
            </div>
            <div className="p-3">
              <p className="text-[10px] text-white/30 mb-3">{outlet.category} · {outlet.upiId || 'No UPI'} · {outlet.timings}</p>
              <div className="flex gap-2">
                <button onClick={() => setOutletModal({ ...outlet })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 rounded-xl text-xs font-black text-white/50 hover:text-white transition-colors">
                  <Settings className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => setExpandedOutlet(expandedOutlet === outlet.id ? null : outlet.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 rounded-xl text-xs font-black text-white/50 hover:text-white transition-colors">
                  <Package className="w-3 h-3" /> Menu
                </button>
                <button onClick={() => setDeleteOutletId(outlet.id)}
                  className="w-9 flex items-center justify-center py-2 bg-red-500/10 rounded-xl text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <AnimatePresence>
                {expandedOutlet === outlet.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-3 border-t border-white/5 mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase text-white/30">Menu Items</p>
                        <button onClick={() => setItemModal({ item: { ...EMPTY_ITEM }, outletId: outlet.id })}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-[10px] font-black">
                          <Plus className="w-2.5 h-2.5" /> Add
                        </button>
                      </div>
                      {(outletMenus[outlet.id] || []).length === 0
                        ? <p className="text-white/20 text-[10px] text-center py-2">No items yet</p>
                        : (outletMenus[outlet.id] || []).map(item => (
                          <div key={item.id} className="flex items-center gap-2 bg-white/[0.03] rounded-lg p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black truncate">{item.name}</p>
                              <p className="text-[9px] text-white/30">₹{item.price} · {item.category}</p>
                            </div>
                            <button onClick={() => setItemModal({ item: { ...item }, outletId: outlet.id })} className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white"><Settings className="w-2.5 h-2.5" /></button>
                            <button onClick={() => setDeleteItem({ id: item.id, outletId: outlet.id })} className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                          </div>
                        ))
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile list */}
      <div className="lg:hidden space-y-3">
        {outlets.map(outlet => (
          <div key={outlet.id} className="glass-frosted rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                <img src={outlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{outlet.name}</p>
                <p className="text-[10px] text-white/30">{outlet.blockName} · {outlet.category}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setOutletModal({ ...outlet })} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30"><Settings className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteOutletId(outlet.id)} className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setExpandedOutlet(expandedOutlet === outlet.id ? null : outlet.id)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
                  {expandedOutlet === outlet.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <AnimatePresence>
              {expandedOutlet === outlet.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 overflow-hidden">
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black uppercase text-white/30">Menu</p>
                      <button onClick={() => setItemModal({ item: { ...EMPTY_ITEM }, outletId: outlet.id })} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black"><Plus className="w-3 h-3" /> Add</button>
                    </div>
                    {(outletMenus[outlet.id] || []).map(item => (
                      <div key={item.id} className="flex items-center gap-2 bg-white/[0.03] rounded-xl p-2.5">
                        <div className="flex-1 min-w-0"><p className="text-xs font-black truncate">{item.name}</p><p className="text-[10px] text-white/30">₹{item.price}</p></div>
                        <button onClick={() => setItemModal({ item: { ...item }, outletId: outlet.id })} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30"><Settings className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteItem({ id: item.id, outletId: outlet.id })} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {outletModal && (
          <Modal title={outletModal.id ? 'Edit Outlet' : 'Add Outlet'} onClose={() => setOutletModal(null)}>
            <BlockPicker value={outletModal.blockName || 'Tulip Hostel'} onChange={b => setOutletModal(p => ({ ...p!, blockName: b, name: '' }))} compact label="Block / Location" />
            <Field label="Canteen Name" icon={<Tag className="w-4 h-4" />}>
              <input className="input-field" placeholder="e.g. Friend's Canteen" value={outletModal.name || ''} onChange={e => setOutletModal(p => ({ ...p!, name: e.target.value }))} autoFocus />
              {BLOCK_PRESETS[outletModal.blockName || ''] && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {BLOCK_PRESETS[outletModal.blockName!].map(preset => (
                    <button key={preset} type="button" onClick={() => setOutletModal(p => ({ ...p!, name: preset }))}
                      className={cn('px-2.5 py-1 rounded-full text-[10px] font-black border transition-all', outletModal.name === preset ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/50')}>
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Description" icon={<Tag className="w-4 h-4" />}>
              <input className="input-field" placeholder="Short description" value={outletModal.description || ''} onChange={e => setOutletModal(p => ({ ...p!, description: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Category</p>
                <select className="input-field" value={outletModal.category || 'Meals'} onChange={e => setOutletModal(p => ({ ...p!, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Timings" icon={<Clock className="w-4 h-4" />}>
                <input className="input-field" placeholder="8am - 9pm" value={outletModal.timings || ''} onChange={e => setOutletModal(p => ({ ...p!, timings: e.target.value }))} />
              </Field>
            </div>
            <Field label="UPI ID" icon={<CreditCard className="w-4 h-4" />}>
              <input className="input-field" placeholder="merchant@okaxis" value={outletModal.upiId || ''} onChange={e => setOutletModal(p => ({ ...p!, upiId: e.target.value }))} />
            </Field>
            <Field label="Image URL (optional)" icon={<Link className="w-4 h-4" />}>
              <input className="input-field" placeholder="https://..." value={outletModal.imageUrl || ''} onChange={e => setOutletModal(p => ({ ...p!, imageUrl: e.target.value }))} />
            </Field>
            <ClayButton onClick={handleSaveOutlet} className="w-full h-12" disabled={savingOutlet || !outletModal.name}>
              {savingOutlet ? 'Saving...' : outletModal.id ? 'Save Changes' : 'Add Outlet'}
            </ClayButton>
          </Modal>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {itemModal && (
          <Modal title={itemModal.item.id ? 'Edit Item' : 'Add Menu Item'} onClose={() => setItemModal(null)}>
            <Field label="Item Name" icon={<Tag className="w-4 h-4" />}>
              <input className="input-field" placeholder="e.g. Chicken Biryani" value={itemModal.item.name || ''} onChange={e => setItemModal(p => p ? { ...p, item: { ...p.item, name: e.target.value } } : null)} autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹)" icon={<CreditCard className="w-4 h-4" />}>
                <input className="input-field" type="number" inputMode="numeric" placeholder="0" value={itemModal.item.price || ''} onChange={e => setItemModal(p => p ? { ...p, item: { ...p.item, price: parseFloat(e.target.value) || 0 } } : null)} />
              </Field>
              <Field label="Prep Time" icon={<Clock className="w-4 h-4" />}>
                <input className="input-field" placeholder="10m" value={itemModal.item.prepTime || ''} onChange={e => setItemModal(p => p ? { ...p, item: { ...p.item, prepTime: e.target.value } } : null)} />
              </Field>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {ITEM_CATS.map(cat => (
                  <button key={cat} onClick={() => setItemModal(p => p ? { ...p, item: { ...p.item, category: cat } } : null)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-black border transition-all', itemModal.item.category === cat ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40')}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Image URL (optional)" icon={<Link className="w-4 h-4" />}>
              <input className="input-field" placeholder="https://..." value={itemModal.item.imageUrl || ''} onChange={e => setItemModal(p => p ? { ...p, item: { ...p.item, imageUrl: e.target.value } } : null)} />
            </Field>
            <ClayButton onClick={handleSaveItem} className="w-full h-12" disabled={savingItem || !itemModal.item.name || !itemModal.item.price}>
              {savingItem ? 'Saving...' : itemModal.item.id ? 'Save Changes' : 'Add Item'}
            </ClayButton>
          </Modal>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteOutletId && <ConfirmDelete label="outlet" onCancel={() => setDeleteOutletId(null)} onConfirm={async () => { await onDeleteOutlet(deleteOutletId); setDeleteOutletId(null); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {deleteItem && <ConfirmDelete label="menu item" onCancel={() => setDeleteItem(null)} onConfirm={async () => { await onDeleteMenuItem(deleteItem.id, deleteItem.outletId); setOutletMenus(prev => { const c = { ...prev }; delete c[deleteItem.outletId]; return c; }); setDeleteItem(null); }} />}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Merchant Codes Tab ────────────────────────────────────────────────────────
const CodesTab: React.FC<{ outlets: Outlet[] }> = ({ outlets }) => {
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('outlets').select('id, login_code').then(({ data }) => {
      if (data) { const map: Record<string, string> = {}; data.forEach((r: any) => { map[r.id] = r.login_code || ''; }); setCodes(map); }
    });
    const ch = supabase.channel('admin_codes_sync').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'outlets' }, () => {
      supabase.from('outlets').select('id, login_code').then(({ data }) => {
        if (data) { const map: Record<string, string> = {}; data.forEach((r: any) => { map[r.id] = r.login_code || ''; }); setCodes(map); }
      });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [outlets]);

  const handleSave = async (outletId: string) => {
    setSaving(outletId);
    const code = (codes[outletId] || '').toUpperCase().trim();
    await supabase.from('outlets').update({ login_code: code || null }).eq('id', outletId);
    setCodes(p => ({ ...p, [outletId]: code }));
    setSaving(null); setEditing(null); setSaved(outletId);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <p className="text-sm text-white/40">Set the login code each merchant uses to access their dashboard. Changes save directly to Supabase.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {outlets.map(outlet => (
          <div key={outlet.id} className="glass-frosted rounded-2xl border border-white/10 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
              <img src={outlet.imageUrl || `https://picsum.photos/seed/${outlet.id}/80`} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm truncate">{outlet.name}</p>
              <p className="text-[10px] text-white/30">{outlet.blockName}</p>
            </div>
            {editing === outlet.id ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <input autoFocus
                  className="w-32 h-9 bg-[#1a0a0e] border border-white/20 rounded-xl px-3 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-klu-red/50"
                  value={codes[outlet.id] || ''} placeholder="CANTEEN01"
                  onChange={e => setCodes(p => ({ ...p, [outlet.id]: e.target.value.toUpperCase() }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(outlet.id); if (e.key === 'Escape') setEditing(null); }} />
                <button onClick={() => handleSave(outlet.id)} disabled={!!saving}
                  className="w-9 h-9 rounded-xl bg-klu-red flex items-center justify-center text-white disabled:opacity-50">
                  {saving === outlet.id ? <span className="text-[10px]">...</span> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditing(null)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/30"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('px-3 py-1.5 rounded-xl text-xs font-black tracking-widest border',
                  saved === outlet.id ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                  codes[outlet.id] ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/20')}>
                  {saved === outlet.id ? '✓ Saved' : codes[outlet.id] || 'No code'}
                </span>
                <button onClick={() => setEditing(outlet.id)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ── Tools Tab ─────────────────────────────────────────────────────────────────
const ToolsTab: React.FC<{ onSeedData: () => void; isSeeding: boolean }> = ({ onSeedData, isSeeding }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 max-w-lg">
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-klu-red/10 flex items-center justify-center"><Zap className="w-5 h-5 text-klu-red" /></div>
        <div>
          <p className="font-black">Seed Campus Data</p>
          <p className="text-xs text-white/40">Populate DB with demo outlets and menus</p>
        </div>
      </div>
      <ClayButton onClick={onSeedData} className="w-full" disabled={isSeeding}>
        {isSeeding ? 'Seeding...' : 'Seed Campus Data'}
      </ClayButton>
    </GlassCard>
  </motion.div>
);

// ── Main AdminView ────────────────────────────────────────────────────────────
export const AdminView: React.FC<AdminViewProps> = ({
  allOrders, allTransactions, outlets, onSeedData, isSeeding,
  onSaveOutlet, onDeleteOutlet, onSaveMenuItem, onDeleteMenuItem,
  initialTab = 'overview',
}) => {
  const [tab, setTab] = useState<AdminTab>(initialTab);

  const TABS: { id: AdminTab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview',     label: 'Overview',     icon: BarChart3 },
    { id: 'orders',       label: 'Orders',       icon: ShoppingBag, badge: allOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'outlets',      label: 'Outlets',      icon: Store },
    { id: 'codes',        label: 'Codes',        icon: KeyRound },
    { id: 'tools',        label: 'Tools',        icon: Settings },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-klu-red uppercase tracking-widest mb-1">KL ONE</p>
          <h2 className="text-display text-2xl lg:text-3xl font-black">Admin Panel</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Tab bar — scrollable on mobile, full on desktop */}
      <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10 gap-1 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-1.5 px-3 lg:px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all relative whitespace-nowrap flex-shrink-0',
              tab === t.id ? 'bg-klu-red text-white shadow-lg shadow-klu-red/30' : 'text-white/30 hover:text-white/60')}>
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
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
        {tab === 'overview'     && <OverviewTab     key="overview"     allOrders={allOrders} allTransactions={allTransactions} outlets={outlets} />}
        {tab === 'orders'       && <OrdersTab       key="orders"       allOrders={allOrders} outlets={outlets} />}
        {tab === 'transactions' && <TransactionsTab key="transactions" allTransactions={allTransactions} />}
        {tab === 'outlets'      && <OutletsTab      key="outlets"      outlets={outlets} onSaveOutlet={onSaveOutlet} onDeleteOutlet={onDeleteOutlet} onSaveMenuItem={onSaveMenuItem} onDeleteMenuItem={onDeleteMenuItem} />}
        {tab === 'codes'        && <CodesTab        key="codes"        outlets={outlets} />}
        {tab === 'tools'        && <ToolsTab        key="tools"        onSeedData={onSeedData} isSeeding={isSeeding} />}
      </AnimatePresence>
    </motion.div>
  );
};
