import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChefHat, CheckCircle2, Phone, Zap, ShoppingBag, ScanLine, Bell, Volume2,
  BarChart2, TrendingUp, Package, Clock, Plus, Settings, Trash2, X,
  IndianRupee, Tag, Image, Upload, Loader2, Store, ToggleLeft, ToggleRight,
  UtensilsCrossed, Star, MapPin, Edit2, Eye, EyeOff,
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { Order, Outlet, MenuItem } from '../types';
import { useMerchantSocket, announcePayment, PaymentAlertPayload } from '../hooks/useMerchantSocket';
import { supabase } from '../supabase';

interface MerchantViewProps {
  orders: Order[];
  outlets: Outlet[];
  merchantOutlet: Outlet | null;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onSwitchView: (view: any) => void;
  menu?: MenuItem[];
  onSaveItem?: (item: Partial<MenuItem> & { name: string; price: number; category: string }) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onToggleAvailability?: (itemId: string, isAvailable: boolean) => void;
  onSaveOutlet?: (data: Partial<Outlet> & { name: string }) => Promise<void>;
}

const CATEGORIES = ['Main', 'Snack', 'Breakfast', 'Beverage', 'Juice', 'Dessert'];
const EMPTY_ITEM: Partial<MenuItem> = { name: '', price: 0, category: 'Main', prepTime: '10m', description: '', imageUrl: '', isAvailable: true };

async function uploadFoodImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `food/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

type DashTab = 'orders' | 'menu' | 'analytics' | 'outlet';

export const MerchantView: React.FC<MerchantViewProps> = ({
  orders, outlets, merchantOutlet, onUpdateStatus, onSwitchView,
  menu = [], onSaveItem, onDeleteItem, onToggleAvailability, onSaveOutlet,
}) => {
  const [tab, setTab] = useState<DashTab>('orders');
  const [alerts, setAlerts] = useState<PaymentAlertPayload[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const handleAlert = useCallback((alert: PaymentAlertPayload) => {
    setAlerts(prev => [alert, ...prev].slice(0, 10));
    if (voiceEnabled) announcePayment(alert.amount, alert.type, alert.fromName);
  }, [voiceEnabled]);

  useMerchantSocket({ outletId: merchantOutlet?.id || null, onAlert: handleAlert });

  if (!merchantOutlet) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-20 h-20 rounded-[28px] bg-white/5 border border-white/10 flex items-center justify-center">
          <ChefHat className="w-10 h-10 text-white/20" />
        </div>
        <div>
          <p className="font-black text-lg">No outlet assigned</p>
          <p className="text-white/30 text-sm mt-1">Go to Profile → Assign Outlet</p>
        </div>
        <button onClick={() => onSwitchView('profile')}
          className="px-6 py-3 bg-klu-red/10 border border-klu-red/30 rounded-2xl text-klu-red text-sm font-black">
          Go to Profile
        </button>
      </motion.div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled');
  const todayOrders = orders.filter(o => {
    const d = new Date(o.createdAt || '');
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  });
  const todaySales = todayOrders.reduce((acc, o) => acc + (o.vendorAmount || 0), 0);
  const totalSales = orders.reduce((acc, o) => acc + (o.vendorAmount || 0), 0);
  const avgOrder = orders.length ? Math.round(totalSales / orders.length) : 0;
  const availableItems = menu.filter(m => m.isAvailable).length;

  const TABS: { id: DashTab; label: string; icon: any }[] = [
    { id: 'orders',    label: 'Orders',    icon: ShoppingBag },
    { id: 'menu',      label: 'Menu',      icon: UtensilsCrossed },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'outlet',    label: 'Outlet',    icon: Store },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Merchant Dashboard</p>
          <h2 className="text-display text-3xl font-black leading-tight">{merchantOutlet.name}</h2>
          <p className="text-white/30 text-xs mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />{merchantOutlet.blockName}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setVoiceEnabled(v => !v)}
            className={cn('w-10 h-10 rounded-xl border flex items-center justify-center transition-all',
              voiceEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/20')}>
            <Volume2 className="w-4 h-4" />
          </button>
          <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center',
            merchantOutlet.isOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400')}>
            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Active', value: activeOrders.length, color: 'text-amber-400', icon: Clock },
          { label: 'Today', value: todayOrders.length, color: 'text-blue-400', icon: Package },
          { label: 'Sales', value: `₹${todaySales}`, color: 'text-emerald-400', icon: TrendingUp },
          { label: 'Menu', value: `${availableItems}/${menu.length}`, color: 'text-klu-red', icon: UtensilsCrossed },
        ].map(s => (
          <GlassCard key={s.label} className="p-3 text-center">
            <s.icon className={cn('w-4 h-4 mx-auto mb-1', s.color)} />
            <p className={cn('text-base font-black', s.color)}>{s.value}</p>
            <p className="text-[9px] font-black uppercase text-white/20">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Live alerts */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
              <Bell className="w-3 h-3 text-amber-400" /> Live Alerts
            </p>
            {alerts.slice(0, 3).map((alert, i) => (
              <motion.div key={`${alert.orderId}-${i}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className={cn('flex items-center gap-3 p-3 rounded-2xl border',
                  alert.type === 'Food_Order' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20')}>
                {alert.type === 'Food_Order'
                  ? <ShoppingBag className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  : <ScanLine className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-black', alert.type === 'Food_Order' ? 'text-blue-300' : 'text-emerald-300')}>
                    {alert.type === 'Food_Order' ? `New Order — Token #${alert.token || '—'}` : `Direct Pay ₹${alert.amount} from ${alert.fromName}`}
                  </p>
                  {alert.note && <p className="text-white/30 text-[10px] truncate">{alert.note}</p>}
                </div>
                <Zap className={cn('w-4 h-4 flex-shrink-0', alert.type === 'Food_Order' ? 'text-blue-400' : 'text-emerald-400')} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all',
              tab === t.id ? 'bg-klu-red text-white shadow-lg' : 'text-white/30 hover:text-white/60')}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'orders' && <OrdersTab key="orders" activeOrders={activeOrders} onUpdateStatus={onUpdateStatus} />}
        {tab === 'menu' && <MenuTab key="menu" menu={menu} onSaveItem={onSaveItem} onDeleteItem={onDeleteItem} onToggleAvailability={onToggleAvailability} outletId={merchantOutlet.id} />}
        {tab === 'analytics' && <AnalyticsTab key="analytics" orders={orders} todaySales={todaySales} totalSales={totalSales} avgOrder={avgOrder} />}
        {tab === 'outlet' && <OutletTab key="outlet" outlet={merchantOutlet} onSave={onSaveOutlet} />}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Orders Tab ────────────────────────────────────────────────────────────────
const OrdersTab: React.FC<{ activeOrders: Order[]; onUpdateStatus: (id: string, s: Order['status']) => void }> = ({ activeOrders, onUpdateStatus }) => (
  <motion.div key="orders-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}</p>
    {activeOrders.length === 0 ? (
      <div className="text-center py-16 glass-frosted rounded-[32px] border border-white/5">
        <ChefHat className="w-12 h-12 text-white/10 mx-auto mb-3" />
        <p className="text-white/30 font-medium">No active orders</p>
      </div>
    ) : (
      activeOrders.map(order => (
        <GlassCard key={order.id} className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-display font-black text-lg">Token #{order.token}</h4>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">Pre-Order</span>
              </div>
              {order.userName && <p className="text-xs text-white/40 font-bold mt-0.5">{order.userName}</p>}
              {order.userPhone && (
                <a href={`tel:${order.userPhone}`} className="flex items-center gap-1.5 mt-1 text-xs font-black text-emerald-400">
                  <Phone className="w-3 h-3" />{order.userPhone}
                </a>
              )}
            </div>
            <span className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
              order.status === 'pending' && 'bg-amber-500/20 text-amber-500',
              order.status === 'preparing' && 'bg-blue-500/20 text-blue-500',
              order.status === 'ready' && 'bg-emerald-500/20 text-emerald-500'
            )}>{order.status}</span>
          </div>
          <div className="space-y-1.5 mb-4 border-t border-white/5 pt-3">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm font-bold">
                <span className="text-white/70">{item.quantity}× {item.name}</span>
                <span className="text-white/40">₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-black pt-1 border-t border-white/5">
              <span>Total</span><span className="text-klu-red">₹{order.vendorAmount}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {order.status === 'pending' && (
              <ClayButton onClick={() => onUpdateStatus(order.id, 'preparing')} className="flex-1 py-3 text-xs">Start Preparing</ClayButton>
            )}
            {order.status === 'preparing' && (
              <ClayButton onClick={() => onUpdateStatus(order.id, 'ready')} className="flex-1 py-3 text-xs" variant="emerald">Mark Ready</ClayButton>
            )}
            {order.status === 'ready' && (
              <div className="flex-1 flex gap-2">
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 text-[10px] font-black uppercase px-2">Waiting for Pick Up</div>
                <button onClick={() => onUpdateStatus(order.id, 'picked_up')} className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg active:scale-95 transition-transform">
                  <CheckCircle2 className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </GlassCard>
      ))
    )}
  </motion.div>
);

// ── Menu Tab ──────────────────────────────────────────────────────────────────
const MenuTab: React.FC<{
  menu: MenuItem[];
  outletId: string;
  onSaveItem?: (item: Partial<MenuItem> & { name: string; price: number; category: string }) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  onToggleAvailability?: (id: string, isAvailable: boolean) => void;
}> = ({ menu, onSaveItem, onDeleteItem, onToggleAvailability }) => {
  const [modal, setModal] = useState<Partial<MenuItem> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const url = await uploadFoodImage(file); setModal(p => ({ ...p, imageUrl: url })); }
    catch { /* silent */ } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleSave = async () => {
    if (!modal?.name || !modal.price || !modal.category || !onSaveItem) return;
    setSaving(true); await onSaveItem(modal as any); setSaving(false); setModal(null);
  };

  return (
    <motion.div key="menu-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{menu.length} items · {menu.filter(m => m.isAvailable).length} available</p>
        <button onClick={() => setModal({ ...EMPTY_ITEM })}
          className="flex items-center gap-2 px-4 py-2 bg-klu-red rounded-2xl text-white text-xs font-black shadow-lg shadow-klu-red/30 active:scale-95 transition-all">
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>

      {menu.length === 0 ? (
        <div className="text-center py-16 glass-frosted rounded-[32px] border border-white/10">
          <UtensilsCrossed className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 font-bold">No menu items yet</p>
          <p className="text-white/20 text-xs mt-1">Tap "Add Item" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {menu.map(item => (
            <motion.div key={item.id} layout className="glass-frosted rounded-[24px] border border-white/10 p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100`}
                  className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={item.name}
                  onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/100`; }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{item.name}</p>
                <p className="text-white/40 text-xs mt-0.5">₹{item.price} · {item.category}</p>
                <span className={cn('text-[9px] font-black uppercase', item.isAvailable ? 'text-emerald-400' : 'text-red-400')}>
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => onToggleAvailability?.(item.id, !item.isAvailable)}
                  className={cn('w-10 h-5 rounded-full transition-colors relative', item.isAvailable ? 'bg-emerald-500' : 'bg-white/10')}>
                  <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow', item.isAvailable ? 'right-0.5' : 'left-0.5')} />
                </button>
                <button onClick={() => setModal({ ...item })} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm glass-frosted rounded-[32px] border border-white/10 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="font-black text-lg">{modal.id ? 'Edit Item' : 'Add Item'}</p>
                <button onClick={() => setModal(null)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30"><X className="w-4 h-4" /></button>
              </div>
              {/* Image */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 flex items-center gap-1.5"><Image className="w-4 h-4" /> Photo</p>
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                    {modal.imageUrl ? <img src={modal.imageUrl} className="w-full h-full object-cover" alt="preview" /> : <div className="w-full h-full flex items-center justify-center text-white/10"><Image className="w-6 h-6" /></div>}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 h-10 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/50 hover:text-white transition-all disabled:opacity-50">
                      {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
                    </button>
                    <input type="url" placeholder="or paste URL" value={modal.imageUrl || ''}
                      onChange={e => setModal(p => ({ ...p, imageUrl: e.target.value }))} className="input-field text-xs h-9" />
                  </div>
                </div>
              </div>
              <MField label="Name" icon={<Tag className="w-4 h-4" />}>
                <input type="text" placeholder="e.g. Chicken Biryani" value={modal.name || ''}
                  onChange={e => setModal(p => ({ ...p, name: e.target.value }))} className="input-field" autoFocus />
              </MField>
              <div className="grid grid-cols-2 gap-3">
                <MField label="Price (₹)" icon={<IndianRupee className="w-4 h-4" />}>
                  <input type="number" inputMode="numeric" placeholder="0" value={modal.price || ''}
                    onChange={e => setModal(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className="input-field" />
                </MField>
                <MField label="Prep Time" icon={<Clock className="w-4 h-4" />}>
                  <input type="text" placeholder="10m" value={modal.prepTime || ''}
                    onChange={e => setModal(p => ({ ...p, prepTime: e.target.value }))} className="input-field" />
                </MField>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setModal(p => ({ ...p, category: cat }))}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-black border transition-all',
                        modal.category === cat ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40')}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <MField label="Description (optional)" icon={<Tag className="w-4 h-4" />}>
                <input type="text" placeholder="Short description" value={modal.description || ''}
                  onChange={e => setModal(p => ({ ...p, description: e.target.value }))} className="input-field" />
              </MField>
              <ClayButton onClick={handleSave} className="w-full h-12" disabled={saving || uploading || !modal.name || !modal.price}>
                {saving ? 'Saving...' : modal.id ? 'Save Changes' : 'Add to Menu'}
              </ClayButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-frosted rounded-[32px] border border-white/10 p-8 max-w-xs w-full text-center shadow-2xl">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <p className="font-black text-lg mb-1">Delete item?</p>
              <p className="text-white/30 text-sm mb-6">This can't be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-white/5 rounded-2xl text-white/50 font-bold text-sm">Cancel</button>
                <button onClick={async () => { await onDeleteItem?.(deleteId); setDeleteId(null); }}
                  className="flex-1 py-3 bg-red-500 rounded-2xl text-white font-black text-sm">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Analytics Tab ─────────────────────────────────────────────────────────────
const AnalyticsTab: React.FC<{ orders: Order[]; todaySales: number; totalSales: number; avgOrder: number }> = ({ orders, todaySales, totalSales, avgOrder }) => {
  const completed = orders.filter(o => o.status === 'picked_up').length;
  const cancelled = orders.filter(o => o.status === 'cancelled').length;
  const pending = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;

  // Last 7 days sales
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayOrders = orders.filter(o => {
      const od = new Date(o.createdAt || '');
      return od.getDate() === d.getDate() && od.getMonth() === d.getMonth();
    });
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), sales: dayOrders.reduce((s, o) => s + (o.vendorAmount || 0), 0), count: dayOrders.length };
  });
  const maxSales = Math.max(...last7.map(d => d.sales), 1);

  return (
    <motion.div key="analytics-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
      {/* Revenue cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Today's Revenue", value: `₹${todaySales}`, sub: 'vs yesterday', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Total Revenue', value: `₹${totalSales}`, sub: 'all time', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Avg Order Value', value: `₹${avgOrder}`, sub: 'per order', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Total Orders', value: orders.length, sub: `${completed} completed`, color: 'text-klu-red', bg: 'bg-klu-red/10 border-klu-red/20' },
        ].map(s => (
          <GlassCard key={s.label} className={cn('p-4 border', s.bg)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{s.label}</p>
            <p className={cn('text-2xl font-black mt-1', s.color)}>{s.value}</p>
            <p className="text-[10px] text-white/20 mt-0.5">{s.sub}</p>
          </GlassCard>
        ))}
      </div>

      {/* 7-day bar chart */}
      <GlassCard className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Last 7 Days</p>
        <div className="flex items-end gap-2 h-24">
          {last7.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg bg-klu-red/20 border border-klu-red/10 transition-all relative overflow-hidden"
                style={{ height: `${Math.max((d.sales / maxSales) * 80, d.sales > 0 ? 8 : 2)}px` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-klu-red/60 to-klu-red/20" />
              </div>
              <p className="text-[9px] font-black text-white/30">{d.day}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Order status breakdown */}
      <GlassCard className="p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Order Status</p>
        {[
          { label: 'Completed', count: completed, color: 'bg-emerald-500', text: 'text-emerald-400' },
          { label: 'In Progress', count: pending, color: 'bg-blue-500', text: 'text-blue-400' },
          { label: 'Cancelled', count: cancelled, color: 'bg-red-500', text: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color.replace('bg-', '') }} />
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', s.color)}
                style={{ width: `${orders.length ? (s.count / orders.length) * 100 : 0}%` }} />
            </div>
            <span className={cn('text-xs font-black w-6 text-right', s.text)}>{s.count}</span>
            <span className="text-[10px] text-white/30 w-20">{s.label}</span>
          </div>
        ))}
      </GlassCard>
    </motion.div>
  );
};

// ── Outlet Tab ────────────────────────────────────────────────────────────────
const OutletTab: React.FC<{ outlet: Outlet; onSave?: (data: Partial<Outlet> & { name: string }) => Promise<void> }> = ({ outlet, onSave }) => {
  const [form, setForm] = useState({ name: outlet.name, description: outlet.description, blockName: outlet.blockName, timings: outlet.timings || '', upiId: outlet.upiId, category: outlet.category, isOpen: outlet.isOpen });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    await onSave({ ...outlet, ...form });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div key="outlet-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
      {/* Outlet image preview */}
      <div className="relative h-36 rounded-[24px] overflow-hidden border border-white/10">
        <img src={outlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={outlet.name}
          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400'; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          {outlet.rating && (
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black text-white">{outlet.rating}</span>
            </div>
          )}
        </div>
      </div>

      {/* Open/Closed toggle */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-sm">Outlet Status</p>
            <p className="text-xs text-white/30 mt-0.5">{form.isOpen ? 'Accepting orders' : 'Not accepting orders'}</p>
          </div>
          <button onClick={() => setForm(f => ({ ...f, isOpen: !f.isOpen }))}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-xs transition-all',
              form.isOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400')}>
            {form.isOpen ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {form.isOpen ? 'Open' : 'Closed'}
          </button>
        </div>
      </GlassCard>

      {/* Edit fields */}
      <GlassCard className="p-4 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Outlet Details</p>
        {[
          { label: 'Name', key: 'name', placeholder: "Friend's Canteen" },
          { label: 'Description', key: 'description', placeholder: 'Short description' },
          { label: 'Block / Location', key: 'blockName', placeholder: 'e.g. Tulip Hostel' },
          { label: 'Timings', key: 'timings', placeholder: '7am – 10pm' },
          { label: 'UPI ID', key: 'upiId', placeholder: 'merchant@okaxis' },
        ].map(f => (
          <div key={f.key}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">{f.label}</p>
            <input type="text" placeholder={f.placeholder} value={(form as any)[f.key] || ''}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="input-field" />
          </div>
        ))}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {['Meals', 'Snack', 'Breakfast', 'Beverages', 'Multi'].map(cat => (
              <button key={cat} onClick={() => setForm(p => ({ ...p, category: cat }))}
                className={cn('px-3 py-1.5 rounded-full text-xs font-black border transition-all',
                  form.category === cat ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40')}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <ClayButton onClick={handleSave} className="w-full h-12" disabled={saving}>
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
      </ClayButton>
    </motion.div>
  );
};

// ── Shared field wrapper ──────────────────────────────────────────────────────
const MField: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 flex items-center gap-1.5">{icon}{label}</p>
    {children}
  </div>
);
