import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Flame, Gift, Star, Zap, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { UserProfile } from '../types';

interface KCoinsViewProps {
  profile: UserProfile | null;
  onBack?: () => void;
}

const REWARDS = [
  { coins: 50, label: 'Rs.5 off next order', icon: Gift },
  { coins: 100, label: 'Free Chai or Coffee', icon: Star },
  { coins: 200, label: 'Rs.25 off any order', icon: Zap },
  { coins: 500, label: 'Free Meal (up to Rs.80)', icon: Trophy },
];

const HOW_TO_EARN = [
  { label: 'Place an order', coins: '+5 K-Coins' },
  { label: 'Order 3 days in a row', coins: '+15 K-Coins' },
  { label: 'Rate your order', coins: '+2 K-Coins' },
  { label: 'Refer a friend', coins: '+25 K-Coins' },
];

export const KCoinsView: React.FC<KCoinsViewProps> = ({ profile, onBack }) => {
  const coins = profile?.kCoins || 0;
  const streak = profile?.streak || 0;
  const progress = Math.min((coins % 100) / 100, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="w-10 h-10 rounded-2xl glass-frosted flex items-center justify-center text-white/40 hover:text-white transition-all flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-display text-4xl font-black">K-Coins</h2>
      </div>

      {/* Balance Card */}
      <div className="glass-frosted rounded-[32px] p-6 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Your Balance</p>
              <p className="text-4xl font-black text-amber-400">{coins} <span className="text-lg text-white/40">coins</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-klu-red" />
            <span className="text-sm font-bold text-white/60">{streak} day streak</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-black uppercase text-white/30">
              <span>Next reward at {Math.ceil(coins / 100) * 100} coins</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rewards */}
      <div className="space-y-3">
        <h3 className="text-display text-xl font-black">Redeem Rewards</h3>
        <div className="grid grid-cols-2 gap-3">
          {REWARDS.map((r) => {
            const Icon = r.icon;
            const canRedeem = coins >= r.coins;
            return (
              <div key={r.label} className={`glass-frosted rounded-[24px] p-4 border flex flex-col gap-2 ${canRedeem ? 'border-amber-500/30' : 'border-white/10 opacity-50'}`}>
                <Icon className={`w-6 h-6 ${canRedeem ? 'text-amber-400' : 'text-white/20'}`} />
                <p className="text-xs font-black text-white/80 leading-tight">{r.label}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] font-black text-amber-400">{r.coins} coins</span>
                  {canRedeem && (
                    <button className="text-[10px] font-black text-klu-red flex items-center gap-0.5">
                      Redeem <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to earn */}
      <GlassCard>
        <h3 className="text-display font-black mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" /> How to Earn
        </h3>
        <div className="space-y-3">
          {HOW_TO_EARN.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-medium text-white/60">{item.label}</span>
              </div>
              <span className="text-xs font-black text-amber-400">{item.coins}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
};
