import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, ChefHat, CheckCircle2, Phone, Zap, ShoppingBag, ScanLine, Bell, Volume2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { Order, Outlet } from '../types';
import { useMerchantSocket, announcePayment, PaymentAlertPayload } from '../hooks/useMerchantSocket';
interface MerchantViewProps {
  orders: Order[];
  outlets: Outlet[];
  merchantOutlet: Outlet | null;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onSwitchView: (view: any) => void;
}
export const MerchantView: React.FC<MerchantViewProps> = ({
  orders, outlets, merchantOutlet, onUpdateStatus, onSwitchView
}) => {
  const activeOrders = orders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled');
  const todaySales = orders.reduce((acc, o) => acc + (o.vendorAmount || 0), 0);
  const [alerts, setAlerts] = useState<PaymentAlertPayload[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const handleAlert = useCallback((alert: PaymentAlertPayload) => {
    setAlerts(prev => [alert, ...prev].slice(0, 10));
    if (voiceEnabled) {
      announcePayment(alert.amount, alert.type, alert.fromName);
    }
  }, [voiceEnabled]);
  useMerchantSocket({ outletId: merchantOutlet?.id || null, onAlert: handleAlert });

  // No outlet assigned yet — prompt to assign one
  if (!merchantOutlet) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-20 h-20 rounded-[28px] bg-white/5 border border-white/10 flex items-center justify-center">
          <ChefHat className="w-10 h-10 text-white/20" />
        </div>
        <div>
          <p className="font-black text-lg">No outlet assigned</p>
          <p className="text-white/30 text-sm mt-1">Go to Profile → Dev Tools → Assign Outlet</p>
        </div>
        <button onClick={() => onSwitchView('profile')}
          className="px-6 py-3 bg-klu-red/10 border border-klu-red/30 rounded-2xl text-klu-red text-sm font-black">
          Go to Profile
        </button>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-display text-4xl font-black">Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setVoiceEnabled(v => !v)}
            className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
              voiceEnabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-white/20")}
            title={voiceEnabled ? "Voice ON" : "Voice OFF"}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button onClick={() => onSwitchView('profile')} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white/40" />
          </button>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <p className="text-[10px] text-white/30 font-black uppercase">Active Orders</p>
          <p className="text-3xl font-black">{activeOrders.length}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[10px] text-white/30 font-black uppercase">Today Sales</p>
          <p className="text-3xl font-black">₹{todaySales}</p>
        </GlassCard>
      </div>
      {/* Real-time alerts */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
              <Bell className="w-3 h-3" /> Live Alerts
            </p>
            {alerts.slice(0, 3).map((alert, i) => (
              <motion.div
                key={`${alert.orderId}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border",
                  alert.type === 'Food_Order'
                    ? "bg-blue-500/10 border-blue-500/20"
                    : "bg-emerald-500/10 border-emerald-500/20"
                )}
              >
                {alert.type === 'Food_Order'
                  ? <ShoppingBag className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  : <ScanLine className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-black", alert.type === 'Food_Order' ? "text-blue-300" : "text-emerald-300")}>
                    {alert.type === 'Food_Order' ? `New Pre-Order (Token #${alert.token || '—'})` : `Direct Payment Received (₹${alert.amount} from ${alert.fromName})`}
                  </p>
                  {alert.note && <p className="text-white/30 text-[10px] truncate">{alert.note}</p>}
                </div>
                <Zap className={cn("w-4 h-4 flex-shrink-0", alert.type === 'Food_Order' ? "text-blue-400" : "text-emerald-400")} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Live Orders */}
      <div className="space-y-4">
        <h3 className="text-display text-xl font-black">Live Orders</h3>
        {activeOrders.length === 0 ? (
          <div className="text-center py-12 glass-frosted rounded-[32px] border border-white/5">
            <ChefHat className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 font-medium">No active orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map(order => (
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
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    order.status === 'pending' && "bg-amber-500/20 text-amber-500",
                    order.status === 'preparing' && "bg-blue-500/20 text-blue-500",
                    order.status === 'ready' && "bg-emerald-500/20 text-emerald-500"
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
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};