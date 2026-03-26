import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, ScanLine, Bell, Volume2, BarChart2, TrendingUp, Package, Clock,
  Plus, Trash2, Loader2, Store, ToggleLeft, ToggleRight, UtensilsCrossed,
  MapPin, Edit2, XCircle, Wallet, CheckCheck, RefreshCw, ChevronDown, IndianRupee,
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { BlockPicker } from '../components/BlockPicker';
import { cn } from '../utils';
import { Order, Outlet, MenuItem, Transaction } from '../types';
import { useMerchantSocket, announcePayment, PaymentAlertPayload } from '../hooks/useMerchantSocket';
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

const CATEGORIES = ['Main', 'Snack', 'Breakfast', 'Beverage', 'Juice', 'Dessert'];
const OUTLET_CATS = ['Meals', 'Snacks', 'Breakfast', 'Beverages', 'Juice', 'Multi'];
type DashTab = 'orders' | 'payments' | 'analytics' | 'menu' | 'outlet';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, { color: string; label: string }> = {
    pending:   { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',      label: 'Pending' },
    preparing: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',         label: 'Preparing' },
    ready:     { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Ready' },
    picked_up: { color: 'bg-white/10 text-white/40 border-white/10',               label: 'Picked Up' },
    cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30',            label: 'Cancelled' },
    paid:      { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Paid' },
    unpaid:    { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',      label: 'Unpaid' },
    failed:    { color: 'bg-red-500/20 text-red-400 border-red-500/30',            label: 'Failed' },
  };
  const c = cfg[status] || cfg.pending;
  return <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', c.color)}>{c.label}</span>;
};

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

  const myOutlets = allMerchantOutlets.length > 0 ? allMerchantOutlets : (merchantOutlet ? [merchantOutlet] : []);
  const [activeOutletId, setActiveOutletId] = useState<string>(merchantOutlet?.id || myOutlets[0]?.id || '');
  const activeOutlet = myOutlets.find(o => o.id === activeOutletId) || myOutlets[0] || null;
  const [isOpen, setIsOpen] = useState(activeOutlet?.isOpen ?? true);

  useEffect(() => {
    if (merchantOutlet?.id && !activeOutletId) setActiveOutletId(merchantOutlet.id);
  }, [merchantOutlet?.id]);

  useEffect(() => {
    if (activeOutlet) setIsOpen(activeOutlet.isOpen);
  }, [activeOutlet?.id]);

  // Only fetch PAID orders — unpaid = abandoned checkout, should NOT show to merchant
  useEffect(() => {
    if (!activeOutlet?.id) return;
    const fetchOrders = () =>
      supabase.from('orders').select('*')
        .eq('outlet_id', activeOutlet.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setLiveOrders(data.map(rowToOrder)); });
    fetchOrders();
    const ch = supabase.channel(`mv_orders_${activeOutlet.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${activeOutlet.id}` }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeOutlet?.id]);

  useEffect(() => {
    if (!activeOutlet?.id) return;
    setLoadingTx(true);
    const fetchTx = () =>
      supabase.from('transactions').select('*')
        .eq('outlet_id', activeOutlet.id).order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setTransactions(data.map(rowToTransaction)); setLoadingTx(false); });
    fetchTx();
    const ch = supabase.channel(`merchant_tx_${activeOutlet.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `outlet_id=eq.${activeOutlet.id}` }, fetchTx)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeOutlet?.id]);

  useEffect(() => {
    if (!activeOutlet?.id) return;
    const fetchMenu = () =>
      supabase.from('menu_items').select('*').eq('outlet_id', activeOutlet.id).order('name')
        .then(({ data }) => {
          if (data) setOutletMenus(prev => ({ ...prev, [activeOutlet.id]: data.map(r => ({
            id: r.id, outletId: r.outlet_id, name: r.name, description: r.description || '',
            price: Number(r.price), imageUrl: r.image_url || '', category: r.category,
            isAvailable: r.is_available ?? true, prepTime: r.prep_time,
          })) }));
        });
    fetchMenu();
    const ch = supabase.channel(`mv_menu_${activeOutlet.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${activeOutlet.id}` }, fetchMenu)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeOutlet?.id]);

  const activeMenu = outletMenus[activeOutlet?.id || ''] ?? menu;

  // Payment alerts via Supabase Realtime on transactions table
  // (Socket.io is not supported on Vercel — replaced with Supabase)
  useEffect(() => {
    if (!activeOutlet?.id) return;
    const ch = supabase.channel(`merchant_alerts_${activeOutlet.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'transactions',
        filter: `outlet_id=eq.${activeOutlet.id}`,
      }, ({ new: row }) => {
        if (!row) return;
        const alert: PaymentAlertPayload = {
          type: row.flow === 'Food_Order' ? 'Food_Order' : 'Direct_Pay',
          status: row.payment_status === 'paid' ? 'confirmed' : 'pending',
          amount: Number(row.total_amount),
          fromName: row.student_name || 'Student',
          outletId: row.outlet_id,
          token: row.token,
          note: row.note,
          orderId: row.id,
          timestamp: Date.now(),
        };
        setAlerts(prev => [alert, ...prev].slice(0, 10));
        if (voiceEnabled) announcePayment(alert.amount, alert.type, alert.fromName);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'transactions',
        filter: `outlet_id=eq.${activeOutlet.id}`,
      }, ({ new: row }) => {
        if (row?.payment_status !== 'paid') return;
        const alert: PaymentAlertPayload = {
          type: row.flow === 'Food_Order' ? 'Food_Order' : 'Direct_Pay',
          status: 'confirmed',
          amount: Number(row.total_amount),
          fromName: row.student_name || 'Student',
          outletId: row.outlet_id,
          token: row.token,
          note: row.note,
          orderId: row.id,
          timestamp: Date.now(),
        };
        setAlerts(prev => [alert, ...prev].slice(0, 10));
        if (voiceEnabled) announcePayment(alert.amount, alert.type, alert.fromName);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeOutlet?.id, voiceEnabled]);

  // Direct order status update — writes straight to Supabase, no prop chain needed
  const handleUpdateStatus = useCallback(async (orderId: string, status: Order['status']) => {
    // Optimistic local update
    setLiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    // Write to DB
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) {
      console.error('order status update failed:', error.message);
      // Revert on failure
      setLiveOrders(prev => prev.map(o => o.id === orderId ? { ...o } : o));
    }
    // Also call the prop so App.tsx state stays in sync
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
    if (m) setOutletMenus(prev => ({ ...prev, [activeOutlet.id]: m.map(r => ({
      id: r.id, outletId: r.outlet_id, name: r.name, description: r.description || '',
      price: Number(r.price), imageUrl: r.image_url || '', category: r.category,
      isAvailable: r.is_available ?? true, prepTime: r.prep_time,
    })) }));
    setRefreshing(false);
  };

  const toggleOutletOpen = async () => {
    if (!activeOutlet) return;
    const next = !isOpen;
    setIsOpen(next);
    await supabase.from('outlets').update({ is_open: next }).eq('id', activeOutlet.id);
  };

  if (myOutlets.length === 0) {
    return <NoOutletSetup outlets={outlets} onSaveOutlet={onSaveOutlet} onAssignOutlet={onAssignOutlet} />;
  }

  const now = new Date();
  const todayOrders = liveOrders.filter(o => {
    const d = new Date(o.createdAt || '');
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const activeOrders = liveOrders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled');
  const todaySales = todayOrders.reduce((s, o) => s + (o.vendorAmount || 0), 0);
  const totalRevenue = liveOrders.reduce((s, o) => s + (o.vendorAmount || 0), 0);
  const avgOrder = liveOrders.length ? Math.round(totalRevenue / liveOrders.length) : 0;

  const TABS: { id: DashTab; label: string; icon: any; badge?: number }[] = [
    { id: 'orders',    label: 'Orders',    icon: ShoppingBag, badge: activeOrders.length },
    { id: 'payments',  label: 'Payments',  icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'menu',      label: 'Menu',      icon: UtensilsCrossed },
    { id: 'outlet',    label: 'Outlet',    icon: Store },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Merchant Dashboard</p>
          {myOutlets.length > 1 ? (
            <div className="relative inline-flex items-center gap-1">
              <select value={activeOutletId}
                onChange={e => { setActiveOutletId(e.target.value); setLiveOrders([]); setTransactions([]); }}
                className="appearance-none bg-transparent text-2xl font-black text-white pr-6 outline-none cursor-pointer max-w-[200px] truncate">
                {myOutlets.map(o => <option key={o.id} value={o.id} className="bg-gray-900 text-base font-normal">{o.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-white/40 pointer-events-none flex-shrink-0" />
            </div>
          ) : (
            <h2 className="text-display text-3xl font-black leading-tight truncate">{activeOutlet?.name}</h2>
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

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Active', value: activeOrders.length, color: 'text-amber-400', icon: Clock },
          { label: 'Today', value: todayOrders.length, color: 'text-blue-400', icon: Package },
          { label: 'Sales', value: `₹${todaySales}`, color: 'text-emerald-400', icon: TrendingUp },
          { label: 'Menu', value: `${activeMenu.filter(m => m.isAvailable).length}/${activeMenu.length}`, color: 'text-klu-red', icon: UtensilsCrossed },
        ].map(s => (
          <GlassCard key={s.label} className="p-3 text-center">
            <s.icon className={cn('w-4 h-4 mx-auto mb-1', s.color)} />
            <p className={cn('text-base font-black', s.color)}>{s.value}</p>
            <p className="text-[9px] font-black uppercase text-white/20">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                <Bell className="w-3 h-3 text-amber-400" /> Live Alerts
              </p>
              <button onClick={() => setAlerts([])} className="text-[10px] text-white/20 hover:text-white/50 font-black">Clear</button>
            </div>
            {alerts.slice(0, 3).map((alert, i) => (
              <motion.div key={`${alert.orderId}-${i}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className={cn('flex items-center gap-3 p-3 rounded-2xl border',
                  alert.status === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/20' :
                  alert.type === 'Food_Order' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20')}>
                {alert.type === 'Food_Order' ? <ShoppingBag className="w-5 h-5 text-blue-400 flex-shrink-0" /> : <ScanLine className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white">
                    {alert.status === 'confirmed' ? '✓ Payment Confirmed' : alert.type === 'Food_Order' ? `New Order — Token #${alert.token || '—'}` : `Direct Pay ₹${alert.amount}`}
                  </p>
                  <p className="text-white/30 text-[10px]">{alert.fromName}{alert.note ? ` · ${alert.note}` : ''}</p>
                </div>
                <span className="text-xs font-black text-white/60">₹{alert.amount}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all relative',
              tab === t.id ? 'bg-klu-red text-white shadow-lg' : 'text-white/30 hover:text-white/60')}>
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

      <AnimatePresence mode="wait">
        {tab === 'orders'    && <OrdersTab    key="orders"    orders={liveOrders} onUpdateStatus={handleUpdateStatus} />}
        {tab === 'payments'  && <PaymentsTab  key="payments"  transactions={transactions} loading={loadingTx} />}
        {tab === 'analytics' && <AnalyticsTab key="analytics" orders={liveOrders} transactions={transactions} todaySales={todaySales} totalRevenue={totalRevenue} avgOrder={avgOrder} />}
        {tab === 'menu'      && <MenuTab      key={`menu-${activeOutlet?.id}`} menu={activeMenu} outletId={activeOutlet?.id || ''} onSaveItem={(item) => onSaveItem?.(item, activeOutlet?.id)} onDeleteItem={onDeleteItem} onToggleAvailability={onToggleAvailability} />}
        {tab === 'outlet'    && <OutletTab    key="outlet" outlet={activeOutlet!} allOutlets={myOutlets} onSave={onSaveOutlet} onSwitchOutlet={setActiveOutletId} />}
      </AnimatePresence>
    </motion.div>
  );
};

// ── OrdersTab ─────────────────────────────────────────────────────────────────
const OrdersTab: React.FC<{ orders: Order[]; onUpdateStatus: (id: string, s: Order['status']) => void }> = ({ orders, onUpdateStatus }) => {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [expanded, setExpanded] = useState<string | null>(null);

  const shown = filter === 'active'
    ? orders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled')
    : orders;

  const NEXT: Record<Order['status'], Order['status'] | null> = {
    pending: 'preparing', preparing: 'ready', ready: 'picked_up', picked_up: null, cancelled: null,
  };
  const NEXT_LABEL: Record<Order['status'], string> = {
    pending: 'Start Preparing', preparing: 'Mark Ready', ready: 'Mark Picked Up', picked_up: '', cancelled: '',
  };

  return (
    <motion.div key="orders-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
        {[
          { k: 'active', l: `Active (${orders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled').length})` },
          { k: 'all',    l: `All (${orders.length})` },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k as any)}
            className={cn('flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all', filter === f.k ? 'clay-red' : 'text-white/30')}>
            {f.l}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-16 glass-frosted rounded-3xl border border-white/10">
          <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 font-medium">No {filter} orders</p>
        </div>
      ) : shown.map(order => {
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
                    <div className="space-y-1">
                      {(order.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-white/60">
                          <span>{item.quantity}× {item.name}</span>
                          <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-white/5" />
                    <p className="text-[10px] text-white/20">
                      {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
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
    </motion.div>
  );
};

// ── PaymentsTab ───────────────────────────────────────────────────────────────
const PaymentsTab: React.FC<{ transactions: Transaction[]; loading: boolean }> = ({ transactions, loading }) => {
  const paid = transactions.filter(t => t.paymentStatus === 'paid');
  const totalReceived = paid.reduce((s, t) => s + (t.vendorAmount || 0), 0);
  const now = new Date();
  const todayPaid = paid.filter(t => {
    const d = new Date(t.createdAt);
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const todayTotal = todayPaid.reduce((s, t) => s + (t.vendorAmount || 0), 0);

  return (
    <motion.div key="payments-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="text-[10px] text-white/30 font-black uppercase">Today's Revenue</p>
          <p className="text-2xl font-black text-emerald-400">₹{todayTotal.toFixed(2)}</p>
          <p className="text-[10px] text-white/20 mt-1">{todayPaid.length} payments</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[10px] text-white/30 font-black uppercase">Total Revenue</p>
          <p className="text-2xl font-black">₹{totalReceived.toFixed(2)}</p>
          <p className="text-[10px] text-white/20 mt-1">{paid.length} payments</p>
        </GlassCard>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 glass-frosted rounded-3xl border border-white/10">
          <Wallet className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 font-medium">No payments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => (
            <div key={tx.id} className="glass-frosted rounded-2xl border border-white/10 p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                tx.flow === 'Food_Order' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-emerald-500/10 border border-emerald-500/20')}>
                {tx.flow === 'Food_Order' ? <ShoppingBag className="w-4 h-4 text-blue-400" /> : <ScanLine className="w-4 h-4 text-emerald-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate">{tx.studentName || 'Student'}</p>
                <p className="text-[10px] text-white/30">
                  {tx.flow === 'Food_Order' ? `Token #${tx.token || '—'}` : tx.note || 'Direct Pay'} ·{' '}
                  {new Date(tx.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-sm text-emerald-400">+₹{(tx.vendorAmount || 0).toFixed(2)}</p>
                <StatusBadge status={tx.paymentStatus} />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ── AnalyticsTab ──────────────────────────────────────────────────────────────
const AnalyticsTab: React.FC<{ orders: Order[]; transactions: Transaction[]; todaySales: number; totalRevenue: number; avgOrder: number }> = ({ orders, transactions, todaySales, totalRevenue, avgOrder }) => {
  const paid = transactions.filter(t => t.paymentStatus === 'paid');
  const foodOrders = paid.filter(t => t.flow === 'Food_Order');
  const directPays = paid.filter(t => t.flow === 'Peer_to_Merchant_Pay');
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;
  const completedCount = orders.filter(o => o.status === 'picked_up').length;
  const completionRate = orders.length ? Math.round((completedCount / orders.length) * 100) : 0;

  const stats = [
    { label: 'Total Revenue',  value: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee, color: 'text-emerald-400' },
    { label: "Today's Sales",  value: `₹${todaySales.toFixed(0)}`,   icon: TrendingUp,  color: 'text-blue-400' },
    { label: 'Avg Order',      value: `₹${avgOrder}`,                icon: BarChart2,   color: 'text-amber-400' },
    { label: 'Completion',     value: `${completionRate}%`,           icon: CheckCheck,  color: 'text-klu-red' },
    { label: 'Food Orders',    value: foodOrders.length,              icon: ShoppingBag, color: 'text-blue-400' },
    { label: 'Direct Pays',    value: directPays.length,              icon: ScanLine,    color: 'text-emerald-400' },
    { label: 'Cancelled',      value: cancelledCount,                 icon: XCircle,     color: 'text-red-400' },
    { label: 'Total Orders',   value: orders.length,                  icon: Package,     color: 'text-white/60' },
  ];

  return (
    <motion.div key="analytics-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
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

// ── MenuTab ───────────────────────────────────────────────────────────────────
const MenuTab: React.FC<{
  menu: MenuItem[]; outletId: string;
  onSaveItem?: (item: Partial<MenuItem> & { name: string; price: number; category: string }) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  onToggleAvailability?: (id: string, isAvailable: boolean) => void;
}> = ({ menu, onSaveItem, onDeleteItem, onToggleAvailability }) => {
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing?.name || !editing?.price || !onSaveItem) return;
    setSaving(true);
    await onSaveItem({ ...editing, name: editing.name!, price: editing.price!, category: editing.category || 'Main' });
    setSaving(false);
    setEditing(null);
  };

  return (
    <motion.div key="menu-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <ClayButton onClick={() => setEditing({ name: '', price: 0, category: 'Main', prepTime: '10m', description: '', isAvailable: true })}
        className="w-full flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Add Item
      </ClayButton>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass-frosted rounded-3xl border border-white/10 p-5 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/40">{editing.id ? 'Edit Item' : 'New Item'}</p>
            <input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
              placeholder="Item name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-white/20 outline-none focus:border-klu-red/50" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={editing.price || ''} onChange={e => setEditing(p => ({ ...p!, price: parseFloat(e.target.value) || 0 }))}
                placeholder="Price ₹"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-white/20 outline-none focus:border-klu-red/50" />
              <select value={editing.category || 'Main'} onChange={e => setEditing(p => ({ ...p!, category: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-klu-red/50">
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
              </select>
            </div>
            <input value={editing.description || ''} onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))}
              placeholder="Description (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-white/20 outline-none focus:border-klu-red/50" />
            <input value={editing.prepTime || ''} onChange={e => setEditing(p => ({ ...p!, prepTime: e.target.value }))}
              placeholder="Prep time (e.g. 10m)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-white/20 outline-none focus:border-klu-red/50" />
            <div className="flex gap-2">
              <ClayButton onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
              </ClayButton>
              <button onClick={() => setEditing(null)} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 font-black text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {menu.length === 0 ? (
        <div className="text-center py-12 glass-frosted rounded-3xl border border-white/10">
          <UtensilsCrossed className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 font-medium">No menu items yet</p>
        </div>
      ) : menu.map(item => (
        <div key={item.id} className="glass-frosted rounded-2xl border border-white/10 p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className={cn('font-black text-sm', !item.isAvailable && 'text-white/30 line-through')}>{item.name}</p>
            <p className="text-white/40 text-xs">₹{item.price} · {item.category}{item.prepTime ? ` · ${item.prepTime}` : ''}</p>
            {item.description && <p className="text-white/20 text-[10px] mt-0.5 truncate">{item.description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => onToggleAvailability?.(item.id, !item.isAvailable)}
              className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                item.isAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/20')}>
              {item.isAvailable ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            </button>
            <button onClick={() => setEditing(item)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDeleteItem?.(item.id)} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </motion.div>
  );
};

// ── OutletTab — manage current outlet + add new outlets ───────────────────────
const OutletTab: React.FC<{
  outlet: Outlet;
  allOutlets: Outlet[];
  onSave?: (data: Partial<Outlet> & { name: string }) => Promise<void>;
  onSwitchOutlet: (id: string) => void;
}> = ({ outlet, allOutlets, onSave, onSwitchOutlet }) => {
  const [form, setForm] = useState({
    name: outlet.name, description: outlet.description, blockName: outlet.blockName,
    category: outlet.category, upiId: outlet.upiId, timings: outlet.timings || '', imageUrl: outlet.imageUrl,
  });
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', description: '', blockName: 'Tulip Hostel', category: 'Meals', upiId: '', timings: '8am – 9pm', imageUrl: '' });
  const [savingNew, setSavingNew] = useState(false);

  // Sync form when outlet changes
  useEffect(() => {
    setForm({ name: outlet.name, description: outlet.description, blockName: outlet.blockName,
      category: outlet.category, upiId: outlet.upiId, timings: outlet.timings || '', imageUrl: outlet.imageUrl });
  }, [outlet.id]);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    await onSave({ ...form, id: outlet.id });
    setSaving(false);
  };

  const handleAddNew = async () => {
    if (!newForm.name || !onSave) return;
    setSavingNew(true);
    await onSave(newForm);
    setSavingNew(false);
    setAddingNew(false);
    setNewForm({ name: '', description: '', blockName: 'Tulip Hostel', category: 'Meals', upiId: '', timings: '8am – 9pm', imageUrl: '' });
  };

  const FIELD_INPUT = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-white/20 outline-none focus:border-klu-red/50';

  return (
    <motion.div key="outlet-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
      {/* All outlets list */}
      {allOutlets.length > 1 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Your Outlets</p>
          {allOutlets.map(o => (
            <button key={o.id} onClick={() => onSwitchOutlet(o.id)}
              className={cn('w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left',
                o.id === outlet.id ? 'bg-klu-red/10 border-klu-red/30' : 'bg-white/5 border-white/10 hover:border-white/20')}>
              <Store className={cn('w-4 h-4 flex-shrink-0', o.id === outlet.id ? 'text-klu-red' : 'text-white/30')} />
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{o.name}</p>
                <p className="text-white/30 text-xs">{o.blockName}</p>
              </div>
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', o.isOpen ? 'bg-emerald-400' : 'bg-red-400')} />
            </button>
          ))}
        </div>
      )}

      {/* Edit current outlet */}
      <GlassCard className="p-5 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Edit: {outlet.name}</p>
        {[
          { label: 'Name',        key: 'name',        placeholder: 'Outlet name' },
          { label: 'Description', key: 'description', placeholder: 'Short description' },
          { label: 'UPI ID',      key: 'upiId',       placeholder: 'merchant@upi' },
          { label: 'Timings',     key: 'timings',     placeholder: '8am – 9pm' },
          { label: 'Image URL',   key: 'imageUrl',    placeholder: 'https://...' },
        ].map(f => (
          <div key={f.key}>
            <p className="text-[10px] font-black uppercase text-white/30 mb-1">{f.label}</p>
            <input value={(form as any)[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder} className={FIELD_INPUT} />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <BlockPicker value={form.blockName} onChange={b => setForm(p => ({ ...p, blockName: b }))} compact label="Block" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-white/30 mb-1">Category</p>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className={FIELD_INPUT}>
              {OUTLET_CATS.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
            </select>
          </div>
        </div>
        <ClayButton onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
        </ClayButton>
      </GlassCard>

      {/* Add new outlet */}
      <div>
        <button onClick={() => setAddingNew(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/40 transition-all text-sm font-black">
          <Plus className="w-4 h-4" /> Add Another Outlet
        </button>
        <AnimatePresence>
          {addingNew && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 glass-frosted rounded-3xl border border-white/10 p-5 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/40">New Outlet</p>
              {[
                { label: 'Name',        key: 'name',        placeholder: "Canteen name" },
                { label: 'UPI ID',      key: 'upiId',       placeholder: 'merchant@upi' },
                { label: 'Description', key: 'description', placeholder: 'Short description' },
                { label: 'Timings',     key: 'timings',     placeholder: '8am – 9pm' },
              ].map(f => (
                <div key={f.key}>
                  <p className="text-[10px] font-black uppercase text-white/30 mb-1">{f.label}</p>
                  <input value={(newForm as any)[f.key]} onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className={FIELD_INPUT} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <BlockPicker value={newForm.blockName} onChange={b => setNewForm(p => ({ ...p, blockName: b }))} compact label="Block" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/30 mb-1">Category</p>
                  <select value={newForm.category} onChange={e => setNewForm(p => ({ ...p, category: e.target.value }))} className={FIELD_INPUT}>
                    {OUTLET_CATS.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <ClayButton onClick={handleAddNew} disabled={savingNew || !newForm.name} className="flex-1">
                  {savingNew ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Outlet'}
                </ClayButton>
                <button onClick={() => setAddingNew(false)} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 font-black text-sm">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ── NoOutletSetup ─────────────────────────────────────────────────────────────
const NoOutletSetup: React.FC<{
  outlets: Outlet[];
  onSaveOutlet?: (data: Partial<Outlet> & { name: string }) => Promise<void>;
  onAssignOutlet?: (id: string) => Promise<void>;
}> = ({ outlets, onSaveOutlet, onAssignOutlet }) => {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', blockName: 'Tulip Hostel', category: 'Meals', upiId: '', timings: '8am – 9pm', imageUrl: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !onSaveOutlet) return;
    setSaving(true);
    await onSaveOutlet(form);
    setSaving(false);
  };

  const FIELD_INPUT = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-white/20 outline-none focus:border-klu-red/50';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center py-8">
        <Store className="w-16 h-16 text-white/10 mx-auto mb-4" />
        <h3 className="text-2xl font-black mb-2">No Outlet Assigned</h3>
        <p className="text-white/30 text-sm">Create a new outlet or claim an existing one</p>
      </div>

      {outlets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Claim Existing Outlet</p>
          {outlets.map(o => (
            <button key={o.id} onClick={() => onAssignOutlet?.(o.id)}
              className="w-full glass-frosted rounded-2xl border border-white/10 p-4 flex items-center gap-3 hover:border-white/20 transition-all text-left">
              <Store className="w-5 h-5 text-white/30 flex-shrink-0" />
              <div>
                <p className="font-black text-sm">{o.name}</p>
                <p className="text-white/30 text-xs">{o.blockName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div>
        <button onClick={() => setCreating(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 bg-white/5 text-white/60 font-black text-sm hover:text-white transition-all">
          <Plus className="w-4 h-4" /> Create New Outlet
        </button>
        <AnimatePresence>
          {creating && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 space-y-3">
              {[
                { key: 'name',        label: 'Outlet Name', placeholder: "Friend's Canteen" },
                { key: 'upiId',       label: 'UPI ID',      placeholder: 'merchant@upi' },
                { key: 'description', label: 'Description', placeholder: 'Short description' },
              ].map(f => (
                <div key={f.key}>
                  <p className="text-[10px] font-black uppercase text-white/30 mb-1">{f.label}</p>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className={FIELD_INPUT} />
                </div>
              ))}
              <ClayButton onClick={handleCreate} disabled={saving || !form.name} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Outlet'}
              </ClayButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
