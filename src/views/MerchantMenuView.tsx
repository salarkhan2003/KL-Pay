import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Settings, Trash2, X, IndianRupee, Clock, Tag, Image, Upload, Loader2, ArrowLeft } from 'lucide-react';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { MenuItem } from '../types';
import { supabase } from '../supabase';

interface MerchantMenuViewProps {
  menu: MenuItem[];
  onToggleAvailability: (itemId: string, isAvailable: boolean) => void;
  onSaveItem: (item: Partial<MenuItem> & { name: string; price: number; category: string }) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onBack?: () => void;
}

const CATEGORIES = ['Main', 'Snack', 'Breakfast', 'Beverage', 'Juice', 'Dessert'];
const EMPTY: Partial<MenuItem> = { name: '', price: 0, category: 'Main', prepTime: '10m', description: '', imageUrl: '', isAvailable: true };

async function uploadFoodImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `food/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

export const MerchantMenuView: React.FC<MerchantMenuViewProps> = ({
  menu, onToggleAvailability, onSaveItem, onDeleteItem, onBack
}) => {
  const [modal, setModal] = useState<Partial<MenuItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd  = () => setModal({ ...EMPTY });
  const openEdit = (item: MenuItem) => setModal({ ...item });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFoodImage(file);
      setModal(p => ({ ...p, imageUrl: url }));
    } catch (err) {
      console.warn('Image upload failed:', err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!modal?.name || !modal.price || !modal.category) return;
    setSaving(true);
    await onSaveItem(modal as any);
    setSaving(false);
    setModal(null);
  };

  const handleDelete = async (id: string) => {
    await onDeleteItem(id);
    setDeleteId(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-10 h-10 rounded-2xl glass-frosted flex items-center justify-center text-white/40 hover:text-white transition-all flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-display text-4xl font-black">Menu</h2>
            <p className="text-white/30 text-xs font-bold mt-1">{menu.length} items</p>
          </div>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-klu-red rounded-2xl text-white text-xs font-black shadow-lg shadow-klu-red/30 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {menu.length === 0 ? (
        <div className="text-center py-20 glass-frosted rounded-[32px] border border-white/10">
          <div className="w-16 h-16 rounded-[20px] bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-white/10" />
          </div>
          <p className="text-white/30 font-bold">No items yet</p>
          <p className="text-white/20 text-xs mt-1">Tap "Add Item" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {menu.map(item => (
            <motion.div key={item.id} layout
              className="glass-frosted rounded-[24px] border border-white/10 p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100`}
                  className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={item.name}
                  onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/100`; }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{item.name}</p>
                <p className="text-white/40 text-xs mt-0.5">Rs.{item.price} · {item.category} · {item.prepTime}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => onToggleAvailability(item.id, !item.isAvailable)}
                  className={cn('w-10 h-5 rounded-full transition-colors relative flex-shrink-0',
                    item.isAvailable ? 'bg-emerald-500' : 'bg-white/10')}>
                  <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow',
                    item.isAvailable ? 'right-0.5' : 'left-0.5')} />
                </button>
                <button onClick={() => openEdit(item)}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteId(item.id)}
                  className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
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
                <button onClick={() => setModal(null)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Image upload */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 flex items-center gap-1.5">
                  <Image className="w-4 h-4" /> Food Image
                </p>
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                    {modal.imageUrl ? (
                      <img src={modal.imageUrl} className="w-full h-full object-cover" alt="preview"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/food/100'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10">
                        <Image className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 h-10 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/50 hover:text-white hover:border-white/30 transition-all disabled:opacity-50">
                      {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload Photo</>}
                    </button>
                    <input type="url" placeholder="or paste image URL"
                      value={modal.imageUrl || ''}
                      onChange={e => setModal(p => ({ ...p, imageUrl: e.target.value }))}
                      className="input-field text-xs h-9" />
                  </div>
                </div>
              </div>

              {/* Name */}
              <Field label="Item Name" icon={<Tag className="w-4 h-4" />}>
                <input type="text" placeholder="e.g. Chicken Biryani" value={modal.name || ''}
                  onChange={e => setModal(p => ({ ...p, name: e.target.value }))}
                  className="input-field" autoFocus />
              </Field>

              {/* Price + PrepTime */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (Rs.)" icon={<IndianRupee className="w-4 h-4" />}>
                  <input type="number" inputMode="numeric" placeholder="0" value={modal.price || ''}
                    onChange={e => setModal(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                    className="input-field" />
                </Field>
                <Field label="Prep Time" icon={<Clock className="w-4 h-4" />}>
                  <input type="text" placeholder="10m" value={modal.prepTime || ''}
                    onChange={e => setModal(p => ({ ...p, prepTime: e.target.value }))}
                    className="input-field" />
                </Field>
              </div>

              {/* Category */}
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

              {/* Description */}
              <Field label="Description (optional)" icon={<Tag className="w-4 h-4" />}>
                <input type="text" placeholder="Short description" value={modal.description || ''}
                  onChange={e => setModal(p => ({ ...p, description: e.target.value }))}
                  className="input-field" />
              </Field>

              <ClayButton onClick={handleSave} className="w-full h-12" disabled={saving || uploading || !modal.name || !modal.price}>
                {saving ? 'Saving...' : modal.id ? 'Save Changes' : 'Add to Menu'}
              </ClayButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
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
                <button onClick={() => handleDelete(deleteId)} className="flex-1 py-3 bg-red-500 rounded-2xl text-white font-black text-sm">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 flex items-center gap-1.5">
      {icon}{label}
    </p>
    {children}
  </div>
);
