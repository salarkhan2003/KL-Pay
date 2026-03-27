import React from 'react';
import { Home, ShoppingBag, ShoppingCart, User, LayoutDashboard, UtensilsCrossed, ScanLine, ArrowUpRight } from 'lucide-react';
import { cn } from '../utils';

interface NavigationProps {
  activeView: string;
  onViewChange: (view: any) => void;
  role: 'student' | 'merchant' | 'admin';
  cartCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange, role, cartCount = 0 }) => {
  const studentTabs = [
    { id: 'home',         icon: Home,          label: 'Home' },
    { id: 'direct_pay',  icon: ScanLine,       label: 'Pay' },
    { id: 'orders',      icon: ShoppingBag,    label: 'Orders' },
    { id: 'cart',        icon: ShoppingCart,   label: 'Cart',  badge: cartCount },
    { id: 'profile',     icon: User,           label: 'Profile' },
  ];

  const merchantTabs = [
    { id: 'merchant',      icon: LayoutDashboard,  label: 'Dashboard' },
    { id: 'merchant_menu', icon: UtensilsCrossed,  label: 'Menu' },
    { id: 'transactions',  icon: ArrowUpRight,     label: 'History' },
    { id: 'profile',       icon: User,             label: 'Profile' },
  ];

  const adminTabs = [
    { id: 'admin',        icon: LayoutDashboard, label: 'Admin' },
    { id: 'transactions', icon: ArrowUpRight,    label: 'Txns' },
    { id: 'profile',      icon: User,            label: 'Profile' },
  ];

  const tabs = role === 'admin' ? adminTabs : role === 'merchant' ? merchantTabs : studentTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4">
      <div className="max-w-md mx-auto glass-frosted rounded-[32px] border border-white/10 p-2 flex items-center justify-between shadow-2xl shadow-black/50">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          const Icon = tab.icon;
          const badge = (tab as any).badge;

          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-3 transition-all duration-300",
                isActive ? "text-white" : "text-white/20 hover:text-white/40"
              )}
            >
              {isActive && (
                <div className="absolute inset-x-2 inset-y-1 bg-white/5 rounded-2xl border border-white/10" />
              )}
              <div className="relative z-10">
                <Icon className={cn("w-5 h-5 mb-1 transition-transform duration-300", isActive && "scale-110")} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-klu-red rounded-full text-[9px] font-black flex items-center justify-center text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
