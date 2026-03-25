import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Star, MapPin, Plus, ShoppingCart, Minus } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { Outlet, MenuItem, CartItem } from '../types';
import { cn } from '../utils';

interface OutletDetailViewProps {
  outlet: Outlet;
  menuItems: MenuItem[];
  cart: CartItem[];
  onBack: () => void;
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  onGoToCart: () => void;
}

export const OutletDetailView: React.FC<OutletDetailViewProps> = ({
  outlet, menuItems, cart, onBack, onAddToCart, onUpdateQuantity, onRemoveFromCart, onGoToCart,
}) => {
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-32"
    >
      <div className="relative h-64 -mx-6 -mt-24 overflow-hidden">
        <img src={outlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer"
          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400'; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-crimson-dark via-crimson-dark/20 to-transparent" />
        <button onClick={onBack}
          className="absolute top-12 left-6 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <h2 className="text-display text-4xl font-black">{outlet.name}</h2>
          <div className="flex items-center gap-1 bg-klu-red px-3 py-1.5 rounded-full shadow-lg shadow-klu-red/20">
            <Star className="w-4 h-4 text-white fill-white" />
            <span className="text-sm font-black text-white">{outlet.rating}</span>
          </div>
        </div>
        <p className="text-white/40 font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4" /> {outlet.blockName} • {outlet.timings || 'Open'}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-display text-xl font-black">Menu</h3>
        {menuItems.length === 0 ? (
          <div className="text-center py-12 glass-frosted rounded-[28px] border border-white/10">
            <p className="text-white/30 font-bold text-sm">No items available</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {menuItems.map((item, idx) => {
              const inCart = cart.find(c => c.id === item.id);
              return (
                <GlassCard key={item.id} delay={idx * 0.05} className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                      <img src={item.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer"
                        onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/100`; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base leading-tight">{item.name}</h4>
                      <p className="text-white/40 text-xs font-medium line-clamp-1 mt-0.5">{item.description}</p>
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-lg font-black text-white">₹{item.price}</p>
                        {inCart ? (
                          <div className="flex items-center gap-1 bg-white/5 rounded-2xl p-1 border border-white/10">
                            <button onClick={() => inCart.quantity === 1 ? onRemoveFromCart(item.id) : onUpdateQuantity(item.id, -1)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-500/20 active:scale-90 transition-all text-red-400">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black text-sm w-5 text-center">{inCart.quantity}</span>
                            <button onClick={() => onAddToCart(item)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all text-white">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => onAddToCart(item)}
                            className="w-10 h-10 clay-red rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 lg:bottom-6 lg:left-auto lg:right-8 lg:w-96 z-50"
          >
            <button onClick={onGoToCart}
              className="w-full flex items-center justify-between px-5 py-4 bg-klu-red rounded-[20px] shadow-2xl shadow-klu-red/40 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-white">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white">₹{cartTotal}</span>
                <span className="text-white/70 font-bold text-sm">→ Checkout</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
