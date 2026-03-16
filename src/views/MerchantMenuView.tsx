import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Settings } from 'lucide-react';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { MenuItem } from '../types';

interface MerchantMenuViewProps {
  menu: MenuItem[];
  onToggleAvailability: (itemId: string, isAvailable: boolean) => void;
}

export const MerchantMenuView: React.FC<MerchantMenuViewProps> = ({ menu, onToggleAvailability }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Menu Manager</h2>
        <ClayButton className="flex items-center gap-2 px-4 py-2 text-xs">
          <Plus className="w-4 h-4" /> Add Item
        </ClayButton>
      </div>

      <div className="grid gap-4">
        {menu.map(item => (
          <div key={item.id} className="glass-frosted p-4 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <img src={item.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">{item.name}</h4>
              <p className="text-xs text-white/40">₹{item.price} • {item.category}</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onToggleAvailability(item.id, !item.isAvailable)}
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative",
                  item.isAvailable ? "bg-emerald-500" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                  item.isAvailable ? "right-0.5" : "left-0.5"
                )} />
              </button>
              <button className="p-2 text-white/20 hover:text-white">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
