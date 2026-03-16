import React from 'react';
import { Home, ShoppingBag, ShoppingCart, User, LayoutDashboard, UtensilsCrossed } from 'lucide-react';
import { cn } from '../utils';

interface NavigationProps {
  activeView: string;
  onViewChange: (view: any) => void;
  role: 'student' | 'merchant' | 'admin';
}

export const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange, role }) => {
  const studentTabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'orders', icon: ShoppingBag, label: 'Orders' },
    { id: 'cart', icon: ShoppingCart, label: 'Cart' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const merchantTabs = [
    { id: 'merchant_dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'merchant_menu', icon: UtensilsCrossed, label: 'Menu' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const adminTabs = [
    { id: 'admin_dashboard', icon: LayoutDashboard, label: 'Admin' },
    { id: 'home', icon: Home, label: 'Browse' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const tabs = role === 'admin' ? adminTabs : role === 'merchant' ? merchantTabs : studentTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4">
      <div className="max-w-md mx-auto glass-frosted rounded-[32px] border border-white/10 p-2 flex items-center justify-between shadow-2xl shadow-black/50">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          const Icon = tab.icon;
          
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
              <Icon className={cn(
                "w-6 h-6 mb-1 relative z-10 transition-transform duration-300",
                isActive && "scale-110"
              )} />
              <span className="text-[10px] font-black uppercase tracking-widest relative z-10">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
