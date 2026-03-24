import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { Order } from '../types';

interface OrdersViewProps {
  orders: Order[];
  onReorder: (order: Order) => void;
  onBack?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ orders, onReorder, onBack }) => {
  const [filter, setFilter] = useState<'active' | 'history'>('active');

  const filteredOrders = orders.filter(o => 
    filter === 'active' ? o.status !== 'picked_up' : o.status === 'picked_up'
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="w-10 h-10 rounded-2xl glass-frosted flex items-center justify-center text-white/40 hover:text-white transition-all flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-display text-4xl font-black">My Orders</h2>
      </div>
      
      <div className="flex gap-2 p-1 bg-white/5 rounded-[24px] border border-white/10">
        <button 
          onClick={() => setFilter('active')}
          className={cn(
            "flex-1 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all",
            filter === 'active' ? "clay-red shadow-lg" : "text-white/30"
          )}
        >
          Active
        </button>
        <button 
          onClick={() => setFilter('history')}
          className={cn(
            "flex-1 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all",
            filter === 'history' ? "clay-red shadow-lg" : "text-white/30"
          )}
        >
          History
        </button>
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 glass-frosted rounded-3xl border border-white/10">
            <p className="text-white/40 font-medium">No {filter} orders</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <GlassCard key={order.id} className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-display font-black text-lg">{order.outletName}</h4>
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Token: #{order.token}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black">Rs.{order.totalAmount}</p>
                  <span className={cn(
                    "text-[10px] uppercase font-black tracking-widest",
                    order.status === 'pending' && "text-amber-500",
                    order.status === 'preparing' && "text-blue-500",
                    order.status === 'ready' && "text-emerald-500",
                    order.status === 'picked_up' && "text-white/20"
                  )}>{order.status}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-xs font-medium text-white/60">
                    <span>{item.quantity}x {item.name}</span>
                    <span>Rs.{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {order.status === 'ready' && (
                <div className="p-4 bg-white rounded-3xl flex flex-col items-center gap-3">
                  <QRCodeSVG value={order.id} size={120} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Scan to Pick Up</p>
                </div>
              )}

              {order.status === 'picked_up' && (
                <ClayButton 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => onReorder(order)}
                >
                  Reorder Items
                </ClayButton>
              )}
            </GlassCard>
          ))
        )}
      </div>
    </motion.div>
  );
};
