import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, TrendingUp, Users, Plus, Trash2, Settings,
  X, Store, Tag, Link, CreditCard, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { Order, Outlet, MenuItem } from '../types';
import { supabase } from '../supabase';

interface AdminViewProps {
  allOrders: Order[];
  outlets: Outlet[];
  onSeedData: () => void;
  isSeeding: boolean;
  onSaveOutlet: (data: Partial<Outlet> & { name: string }) => Promise<void>;
  onDeleteOutlet: (id: string) => Promise<void>;
  onSaveMenuItem: (item: Partial<MenuItem> & { name: string; price: number; category: string }, outletId: string) => Promise<void>;
  onDeleteMenuItem: (itemId: string, outletId: string) => Promise<void>;
}

const BLOCKS = [
  'Tulip Hostel', 'Himalaya Hostel', 'Kanchan Ganga Hostel',
  'CSE', 'EEE', 'MECH', 'CIVIL', 'R&D', 'FED', 'SDC', 'C',
];
const CATEGORIES = ['Meals', 'Cafe', 'Bakery', 'Juice', 'Snacks'];
const ITEM_CATS  = ['Main', 'Snack', 'Breakfast', 'Beverage', 'Juice', 'Dessert'];
const EMPTY_OUTLET: Partial<Outlet> = { name: '', description: '', blockName: 'Tulip Hostel', category: 'Meals', upiId: '', imageUrl: '', isOpen: true, timings: '8am - 9pm' };

// Preset canteens per block — selecting one auto-fills name
const BLOCK_PRESETS: Record<string, string[]> = {
  'Tulip Hostel': ["Friend's Canteen", 'Tulip Snacks Corner'],
  'Himalaya Hostel': ['Himalaya Canteen', 'Himalaya Juice Bar'],
  'Kanchan Ganga Hostel': ['KG Canteen', 'KG Snacks'],
};
const EMPTY_ITEM = { name: '', price: 0, category: 'Main', prepTime: '10m', description: '', imageUrl: '', isAvailable: true };

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/70 backdrop-blur-md"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-full max-w-sm glass-frosted rounded-[32px] border border-white/10 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="font-black text-lg">{title}</p>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
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

export const AdminView: React.FC<AdminViewProps> = ({
  allOrders, outlets, onSeedData, isSeeding,
  onSaveOutlet, onDeleteOutlet, onSaveMenuItem, onDeleteMenuItem
}) => {
  const totalRevenue = allOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalFees    = allOrders.reduce((acc, o) => acc + (o.convenienceFee || 0), 0);

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
    // Load and subscribe to menu items for expanded outlet
    const load = () => {
      supabase.from('menu_items').select('*').eq('outlet_id', expandedOutlet).then(({ data }) => {
        if (data) setOutletMenus(prev => ({
          ...prev,
          [expandedOutlet]: data.map((r: any) => ({
            id: r.id, outletId: r.outlet_id, name: r.name, description: r.description || '',
            price: r.price, imageUrl: r.image_url || '', category: r.category,
            isAvailable: r.is_available, prepTime: r.prep_time,
          } as MenuItem)),
        }));
      });
    };
    load();
    const ch = supabase.channel(`admin_menu_${expandedOutlet}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${expandedOutlet}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [expandedOutlet]);

  const handleSaveOutlet = async () => {
    if (!outletModal?.name) return;
    setSavingOutlet(true);
    // Generate stable ID from block + name if new outlet
    const payload = { ...outletModal } as Partial<Outlet> & { name: string };
    if (!payload.id) {
      const slug = `${payload.blockName || 'outlet'}-${payload.name}`
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      payload.id = slug;
    }
    await onSaveOutlet(payload);
    setSavingOutlet(false);
    setOutletModal(null);
  };

  const handleSaveItem = async () => {
    if (!itemModal || !itemModal.item.name || !itemModal.item.price) return;
    setSavingItem(true);
    await onSaveMenuItem(itemModal.item as any, itemModal.outletId);
    // Realtime will refresh via subscription; also clear cache to force reload
    setOutletMenus(prev => { const copy = { ...prev }; delete copy[itemModal.outletId]; return copy; });
    setSavingItem(false);
    setItemModal(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <h2 className="text-display text-3xl font-black">Admin Panel</h2>

      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <BarChart3 className="w-6 h-6 text-klu-red mb-2" />
          <p className="text-[10px] text-white/30 font-black uppercase">Total Revenue</p>
          <p className="text-xl font-black">Rs.{totalRevenue}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <TrendingUp className="w-6 h-6 text-emerald-500 mb-2" />
          <p className="text-[10px] text-white/30 font-black uppercase">Platform Fees</p>
          <p className="text-xl font-black">Rs.{totalFees}</p>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="text-display font-black mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-klu-red" /> Block Orders
        </h3>
        <div className="space-y-3">
          {BLOCKS.slice(0, 5).map(block => {
            const count = allOrders.filter(o => o.block === block).length;
            const pct   = ((count / (allOrders.length || 1)) * 100);
            return (
              <div key={block} className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase text-white/40">
                  <span>{block}</span><span>{count}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-klu-red rounded-full" />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-display font-black text-lg flex items-center gap-2">
            <Store className="w-5 h-5 text-klu-red" /> Outlets ({outlets.length})
          </h3>
          <button onClick={() => setOutletModal({ ...EMPTY_OUTLET })}
            className="flex items-center gap-1.5 px-3 py-2 bg-klu-red rounded-xl text-white text-xs font-black shadow-lg shadow-klu-red/30 active:scale-95 transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Outlet
          </button>
        </div>

        {outlets.map(outlet => (
          <div key={outlet.id} className="glass-frosted rounded-[24px] border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10 flex-shrink-0">
                <img src={outlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={outlet.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{outlet.name}</p>
                <p className="text-[10px] text-white/30">{outlet.blockName} · {outlet.category} · {outlet.upiId || 'No UPI'}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => setOutletModal({ ...outlet })}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteOutletId(outlet.id)}
                  className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setExpandedOutlet(expandedOutlet === outlet.id ? null : outlet.id)}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors">
                  {expandedOutlet === outlet.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {expandedOutlet === outlet.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 px-4 pb-4 overflow-hidden">
                  <div className="flex items-center justify-between pt-3 mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Menu Items</p>
                    <button onClick={() => setItemModal({ item: { ...EMPTY_ITEM }, outletId: outlet.id })}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black">
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                  {(outletMenus[outlet.id] || []).length === 0 ? (
                    <p className="text-white/20 text-xs text-center py-4">No items — tap Add Item</p>
                  ) : (
                    <div className="space-y-2">
                      {(outletMenus[outlet.id] || []).map(item => (
                        <div key={item.id} className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                            <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{item.name}</p>
                            <p className="text-[10px] text-white/30">Rs.{item.price} · {item.category}</p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={() => setItemModal({ item: { ...item }, outletId: outlet.id })}
                              className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white">
                              <Settings className="w-3 h-3" />
                            </button>
                            <button onClick={() => setDeleteItem({ id: item.id, outletId: outlet.id })}
                              className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <GlassCard className="p-5">
        <h3 className="font-black mb-1">System Tools</h3>
        <p className="text-xs text-white/40 mb-4">Seed the database with demo campus outlets and menus.</p>
        <ClayButton onClick={onSeedData} className="w-full" disabled={isSeeding}>
          {isSeeding ? 'Seeding...' : 'Seed Campus Data'}
        </ClayButton>
      </GlassCard>

      <AnimatePresence>
        {outletModal && (
          <Modal title={outletModal.id ? 'Edit Outlet' : 'Add Outlet'} onClose={() => setOutletModal(null)}>
            {/* Block / Location */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 flex items-center gap-1.5">
                <Store className="w-4 h-4" /> Block / Location
              </p>
              <select className="input-field" value={outletModal.blockName || 'Tulip Hostel'}
                onChange={e => setOutletModal(p => ({ ...p!, blockName: e.target.value, name: '' }))}>
                {BLOCKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Canteen Name — type freely or pick a preset */}
            <Field label="Canteen Name" icon={<Tag className="w-4 h-4" />}>
              <input className="input-field" placeholder="e.g. Friend's Canteen" value={outletModal.name || ''}
                onChange={e => setOutletModal(p => ({ ...p!, name: e.target.value }))} autoFocus />
              {/* Preset suggestions for selected block */}
              {BLOCK_PRESETS[outletModal.blockName || ''] && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {BLOCK_PRESETS[outletModal.blockName!].map(preset => (
                    <button key={preset} type="button"
                      onClick={() => setOutletModal(p => ({ ...p!, name: preset }))}
                      className={cn('px-2.5 py-1 rounded-full text-[10px] font-black border transition-all',
                        outletModal.name === preset
                          ? 'bg-klu-red border-klu-red text-white'
                          : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30')}>
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Description" icon={<Tag className="w-4 h-4" />}>
              <input className="input-field" placeholder="Short description" value={outletModal.description || ''}
                onChange={e => setOutletModal(p => ({ ...p!, description: e.target.value }))} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5">Category</p>
                <select className="input-field" value={outletModal.category || 'Meals'}
                  onChange={e => setOutletModal(p => ({ ...p!, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Timings" icon={<Clock className="w-4 h-4" />}>
                <input className="input-field" placeholder="8am - 9pm" value={outletModal.timings || ''}
                  onChange={e => setOutletModal(p => ({ ...p!, timings: e.target.value }))} />
              </Field>
            </div>

            <Field label="UPI ID" icon={<CreditCard className="w-4 h-4" />}>
              <input className="input-field" placeholder="merchant@okaxis" value={outletModal.upiId || ''}
                onChange={e => setOutletModal(p => ({ ...p!, upiId: e.target.value }))} />
            </Field>
            <Field label="Image URL (optional)" icon={<Link className="w-4 h-4" />}>
              <input className="input-field" placeholder="https://..." value={outletModal.imageUrl || ''}
                onChange={e => setOutletModal(p => ({ ...p!, imageUrl: e.target.value }))} />
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
              <input className="input-field" placeholder="e.g. Chicken Biryani" value={itemModal.item.name || ''}
                onChange={e => setItemModal(p => p ? { ...p, item: { ...p.item, name: e.target.value } } : null)} autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (Rs.)" icon={<CreditCard className="w-4 h-4" />}>
                <input className="input-field" type="number" inputMode="numeric" placeholder="0" value={itemModal.item.price || ''}
                  onChange={e => setItemModal(p => p ? { ...p, item: { ...p.item, price: parseFloat(e.target.value) || 0 } } : null)} />
              </Field>
              <Field label="Prep Time" icon={<Clock className="w-4 h-4" />}>
                <input className="input-field" placeholder="10m" value={itemModal.item.prepTime || ''}
                  onChange={e => setItemModal(p => p ? { ...p, item: { ...p.item, prepTime: e.target.value } } : null)} />
              </Field>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {ITEM_CATS.map(cat => (
                  <button key={cat} onClick={() => setItemModal(p => p ? { ...p, item: { ...p.item, category: cat } } : null)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-black border transition-all',
                      itemModal.item.category === cat ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40')}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Image URL (optional)" icon={<Link className="w-4 h-4" />}>
              <input className="input-field" placeholder="https://..." value={itemModal.item.imageUrl || ''}
                onChange={e => setItemModal(p => p ? { ...p, item: { ...p.item, imageUrl: e.target.value } } : null)} />
            </Field>
            <ClayButton onClick={handleSaveItem} className="w-full h-12" disabled={savingItem || !itemModal.item.name || !itemModal.item.price}>
              {savingItem ? 'Saving...' : itemModal.item.id ? 'Save Changes' : 'Add Item'}
            </ClayButton>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteOutletId && (
          <ConfirmDelete label="outlet" onCancel={() => setDeleteOutletId(null)}
            onConfirm={async () => { await onDeleteOutlet(deleteOutletId); setDeleteOutletId(null); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteItem && (
          <ConfirmDelete label="menu item" onCancel={() => setDeleteItem(null)}
            onConfirm={async () => {
              await onDeleteMenuItem(deleteItem.id, deleteItem.outletId);
              setOutletMenus(prev => { const copy = { ...prev }; delete copy[deleteItem.outletId]; return copy; });
              setDeleteItem(null);
            }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
