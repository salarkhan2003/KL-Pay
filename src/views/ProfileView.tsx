import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Trophy, Flame, History, CreditCard, HelpCircle, LogOut, ChevronRight, User as UserIcon, Shield } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { UserProfile } from '../types';
import { User } from 'firebase/auth';

interface ProfileViewProps {
  profile: UserProfile | null;
  user: User | null;
  onLogout: () => void;
  onUpdateProfile: (data: Partial<UserProfile>) => Promise<void>;
  onSwitchView: (view: any) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, user, onLogout, onUpdateProfile, onSwitchView }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName || '');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-white/5 border border-white/10 p-1">
          <img src={profile?.photoURL || `https://picsum.photos/seed/${user?.uid}/200`} className="w-full h-full object-cover rounded-[28px]" referrerPolicy="no-referrer" />
        </div>
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-klu-red"
                autoFocus
              />
              <button 
                onClick={() => onUpdateProfile({ displayName: newName }).then(() => setIsEditingName(false))} 
                className="p-2 bg-emerald-500 rounded-xl text-white"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-display text-2xl font-black">{profile?.displayName}</h2>
              <button onClick={() => setIsEditingName(true)} className="p-1 text-white/20 hover:text-white"><Settings className="w-4 h-4" /></button>
            </div>
          )}
          <p className="text-white/40 font-medium text-sm">{profile?.email}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-klu-red/10 px-2.5 py-1 rounded-full border border-klu-red/20">
            <div className="w-1.5 h-1.5 rounded-full bg-klu-red" />
            <span className="text-[10px] font-black uppercase tracking-widest text-klu-red">{profile?.role}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4 flex flex-col items-center text-center">
          <Trophy className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-xl font-black">{profile?.kCoins || 0}</p>
          <p className="text-[10px] font-black uppercase text-white/30">K-Coins</p>
        </GlassCard>
        <GlassCard className="p-4 flex flex-col items-center text-center">
          <Flame className="w-6 h-6 text-klu-red mb-2" />
          <p className="text-xl font-black">{profile?.streak || 0}</p>
          <p className="text-[10px] font-black uppercase text-white/30">Day Streak</p>
        </GlassCard>
      </div>

      <div className="space-y-3">
        <button onClick={() => onSwitchView('orders')} className="w-full flex items-center justify-between p-5 glass-frosted rounded-[24px] border border-white/10 group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <History className="w-5 h-5" />
            </div>
            <span className="font-bold">Order History</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20" />
        </button>
        <button className="w-full flex items-center justify-between p-5 glass-frosted rounded-[24px] border border-white/10 group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="font-bold">KL Pay & Cards</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20" />
        </button>
        <button onClick={() => onSwitchView('support')} className="w-full flex items-center justify-between p-5 glass-frosted rounded-[24px] border border-white/10 group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="font-bold">Support & Tickets</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20" />
        </button>
        <button onClick={onLogout} className="w-full flex items-center justify-between p-5 glass-frosted rounded-[24px] border border-red-500/20 group">
          <div className="flex items-center gap-4 text-red-500">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="font-bold">Logout</span>
          </div>
        </button>
      </div>

      {/* Role Switcher (Dev Only) */}
      <div className="pt-8 border-t border-white/5">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Developer Tools</p>
        <div className="flex gap-2">
          {['student', 'merchant', 'admin'].map(role => (
            <button 
              key={role}
              onClick={() => onUpdateProfile({ role: role as any })}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all",
                profile?.role === role ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/20"
              )}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
