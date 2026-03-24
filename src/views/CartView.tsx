import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { CartItem } from '../types';

interface CartViewProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export const CartView: React.FC<CartViewProps> = ({ cart, onUpdateQuantity, onRemove, onCheckout }) => {
  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const fee = 2.5;
  const total = Math.round((subtotal + fee) * 100) / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <h2 className="text-display text-4xl font-black">Your Cart</h2>

      {cart.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
            <ShoppingCart className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-white/40 font-medium">Your cart is empty</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.id} className="flex gap-4 items-center glass-frosted rounded-[24px] p-4 border border-white/10">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                  <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={item.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black truncate">{item.name}</h4>
                  <p className="text-klu-red font-black text-sm">Rs.{item.price}</p>
                </div>
                <div className="flex items-center gap-1 bg-white/5 rounded-2xl p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-sm w-6 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <GlassCard className="space-y-4">
            <div className="flex justify-between text-sm font-medium text-white/40">
              <span>Subtotal</span>
              <span>Rs.{subtotal}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-white/40">
              <span>Convenience Fee</span>
              <span>Rs.{fee}</span>
            </div>
            <div className="h-[1px] bg-white/10" />
            <div className="flex justify-between text-xl font-black">
              <span>Total</span>
              <span>Rs.{total}</span>
            </div>
            <ClayButton onClick={onCheckout} className="w-full">Place Order</ClayButton>
          </GlassCard>
        </>
      )}
    </motion.div>
  );
};
