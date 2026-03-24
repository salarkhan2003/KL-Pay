import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Star, Clock } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { cn } from '../utils';
import { Outlet } from '../types';

interface HomeViewProps {
  outlets: Outlet[];
  onSelectOutlet: (outlet: Outlet) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  blockFilter: string;
  setBlockFilter: (b: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ outlets, onSelectOutlet }) => {
  const visibleOutlets = outlets;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-display text-4xl font-black leading-none">Hungry?</h2>
        <p className="text-white/30 text-sm font-medium">Order from campus canteens</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-display text-xl font-black">Campus Canteens</h3>
        <div className="grid gap-4">
          {visibleOutlets.length === 0 ? (
            <div className="text-center py-12 glass-frosted rounded-3xl border border-white/10">
              <p className="text-white/40 font-medium">Loading canteens...</p>
            </div>
          ) : (
            visibleOutlets.map((outlet, idx) => (
              <GlassCard key={outlet.id} delay={idx * 0.05} onClick={() => onSelectOutlet(outlet)} className="group">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                    <img
                      src={outlet.imageUrl}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      alt={outlet.name}
                      onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400'; }}
                    />
                  </div>
                  <div className="flex-1 py-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-display font-black text-lg leading-tight">{outlet.name}</h4>
                      {outlet.rating && (
                        <div className="flex items-center gap-1 bg-klu-red/10 px-2 py-1 rounded-lg border border-klu-red/20 flex-shrink-0">
                          <Star className="w-3 h-3 text-klu-red fill-klu-red" />
                          <span className="text-[10px] font-black text-klu-red">{outlet.rating}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-white/40 text-xs font-medium mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {outlet.blockName}
                    </p>
                    {outlet.timings && (
                      <p className="text-white/30 text-xs font-medium mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" /> {outlet.timings}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className={cn(
                        'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border',
                        outlet.isOpen
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-red-400 bg-red-500/10 border-red-500/20'
                      )}>
                        {outlet.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
