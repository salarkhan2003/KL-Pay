import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Users, Store, ChevronRight } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { Order, Outlet } from '../types';

interface AdminViewProps {
  allOrders: Order[];
  outlets: Outlet[];
  onSeedData: () => void;
  isSeeding: boolean;
}

export const AdminView: React.FC<AdminViewProps> = ({ allOrders, outlets, onSeedData, isSeeding }) => {
  const totalRevenue = allOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalFees = allOrders.reduce((acc, o) => acc + o.convenienceFee, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <h2 className="text-display text-3xl font-black">Admin Analytics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <BarChart3 className="w-6 h-6 text-klu-red mb-2" />
          <p className="text-[10px] text-white/30 font-black uppercase">Total Revenue</p>
          <p className="text-xl font-black">₹{totalRevenue}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <TrendingUp className="w-6 h-6 text-emerald-500 mb-2" />
          <p className="text-[10px] text-white/30 font-black uppercase">Platform Fee</p>
          <p className="text-xl font-black">₹{totalFees}</p>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="text-display font-black mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-klu-red" /> Block Analytics
        </h3>
        <div className="space-y-3">
          {['CSE', 'EEE', 'MECH', 'CIVIL', 'R&D'].map(block => {
            const count = allOrders.filter(o => o.block === block).length;
            const total = allOrders.length || 1;
            const percentage = (count / total) * 100;
            return (
              <div key={block} className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase text-white/40">
                  <span>{block} Block</span>
                  <span>{count} Orders</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-full bg-klu-red"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Merchant Management</h3>
        <div className="space-y-2">
          {outlets.map(outlet => (
            <div key={outlet.id} className="glass-frosted p-4 rounded-2xl border border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden border border-white/10">
                  <img src={outlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{outlet.name}</h4>
                  <p className="text-[10px] text-white/40">{outlet.blockName} Block</p>
                </div>
              </div>
              <button className="text-klu-red text-xs font-bold">Manage</button>
            </div>
          ))}
        </div>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-bold mb-2">System Tools</h3>
        <p className="text-xs text-white/40 mb-4">Populate the database with initial campus data.</p>
        <ClayButton onClick={onSeedData} className="w-full" disabled={isSeeding}>
          {isSeeding ? 'Seeding...' : 'Seed Campus Data'}
        </ClayButton>
      </GlassCard>
    </motion.div>
  );
};
