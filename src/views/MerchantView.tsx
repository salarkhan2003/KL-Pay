import React from 'react';
import { motion } from 'framer-motion';
import { Settings, ChefHat, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { Order } from '../types';

interface MerchantViewProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onSwitchView: (view: any) => void;
}

export const MerchantView: React.FC<MerchantViewProps> = ({ orders, onUpdateStatus, onSwitchView }) => {
  const activeOrders = orders.filter(o => o.status !== 'picked_up');
  const todaySales = orders.reduce((acc, o) => acc + o.vendorAmount, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-display text-4xl font-black">Dashboard</h2>
        <button onClick={() => onSwitchView('merchant_profile')} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-white/40" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <p className="text-[10px] text-white/30 font-black uppercase">Active Orders</p>
          <p className="text-3xl font-black">{activeOrders.length}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[10px] text-white/30 font-black uppercase">Today's Sales</p>
          <p className="text-3xl font-black">₹{todaySales}</p>
        </GlassCard>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-display text-xl font-black">Live Orders</h3>
          <button onClick={() => onSwitchView('merchant_archive')} className="text-klu-red text-[10px] font-black uppercase tracking-widest">History</button>
        </div>
        
        {activeOrders.length === 0 ? (
          <div className="text-center py-12 glass-frosted rounded-[32px] border border-white/5">
            <ChefHat className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 font-medium">No active orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map(order => (
              <GlassCard key={order.id} className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-display font-black text-lg">Token: #{order.token}</h4>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{order.userName}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      order.status === 'pending' && "bg-amber-500/20 text-amber-500",
                      order.status === 'preparing' && "bg-blue-500/20 text-blue-500",
                      order.status === 'ready' && "bg-emerald-500/20 text-emerald-500"
                    )}>{order.status}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm font-bold">
                      <span>{item.quantity}x {item.name}</span>
                    </div>
                  ))}
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
                      <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 text-[10px] font-black uppercase">Waiting for Pick Up</div>
                      <button onClick={() => onUpdateStatus(order.id, 'picked_up')} className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg"><CheckCircle2 className="w-6 h-6" /></button>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
