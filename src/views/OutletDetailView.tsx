import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Star, MapPin, Plus } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Outlet, MenuItem } from '../types';

interface OutletDetailViewProps {
  outlet: Outlet;
  menuItems: MenuItem[];
  onBack: () => void;
  onAddToCart: (item: MenuItem) => void;
}

export const OutletDetailView: React.FC<OutletDetailViewProps> = ({ outlet, menuItems, onBack, onAddToCart }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="relative h-64 -mx-6 -mt-24 overflow-hidden">
        <img src={outlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-crimson-dark via-crimson-dark/20 to-transparent" />
        <button 
          onClick={onBack}
          className="absolute top-12 left-6 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white"
        >
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
          <MapPin className="w-4 h-4" /> {outlet.blockName} Block • Open until 9:00 PM
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-display text-xl font-black">Menu</h3>
        <div className="grid gap-4">
          {menuItems.length === 0 ? (
            <div className="text-center py-12 glass-frosted rounded-[28px] border border-white/10">
              <p className="text-white/30 font-bold text-sm">No items available</p>
            </div>
          ) : menuItems.map((item, idx) => (
            <GlassCard key={item.id} delay={idx * 0.05} className="p-4">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                  <img src={item.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-lg">{item.name}</h4>
                  <p className="text-white/40 text-xs font-medium line-clamp-1">{item.description}</p>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xl font-black text-white">Rs.{item.price}</p>
                    <button 
                      onClick={() => onAddToCart(item)}
                      className="w-10 h-10 clay-red rounded-xl flex items-center justify-center shadow-lg"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
