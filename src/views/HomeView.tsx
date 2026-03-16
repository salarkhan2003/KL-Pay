import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Star } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { cn } from '../utils';
import { Outlet } from '../types';

interface HomeViewProps {
  outlets: Outlet[];
  onSelectOutlet: (outlet: Outlet) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ outlets, onSelectOutlet }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [blockFilter, setBlockFilter] = useState('All');

  const filteredOutlets = outlets
    .filter(o => blockFilter === 'All' || o.blockName === blockFilter)
    .filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="space-y-4">
        <h2 className="text-display text-4xl font-black leading-none">Hungry?</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input 
            type="text" 
            placeholder="Search for food or outlets..." 
            className="w-full h-16 bg-white/5 border border-white/10 rounded-[24px] pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-klu-red/50 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {['All', 'CSE', 'EEE', 'MECH', 'CIVIL', 'R&D'].map(block => (
          <button 
            key={block}
            onClick={() => setBlockFilter(block)}
            className={cn(
              "px-6 py-3 rounded-full text-xs font-black whitespace-nowrap transition-all border",
              blockFilter === block 
                ? "bg-klu-red border-klu-red text-white shadow-lg shadow-klu-red/20" 
                : "bg-white/5 border-white/10 text-white/40"
            )}
          >
            {block}
          </button>
        ))}
      </div>

      {/* Outlets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-display text-xl font-black">Campus Outlets</h3>
          <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">{filteredOutlets.length} found</span>
        </div>
        
        <div className="grid gap-4">
          {filteredOutlets.length === 0 ? (
            <div className="text-center py-12 glass-frosted rounded-3xl border border-white/10">
              <p className="text-white/40 font-medium">No outlets found</p>
            </div>
          ) : (
            filteredOutlets.map((outlet, idx) => (
              <GlassCard 
                key={outlet.id} 
                delay={idx * 0.1}
                onClick={() => onSelectOutlet(outlet)}
                className="group"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                    <img src={outlet.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 py-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-display font-black text-lg">{outlet.name}</h4>
                      <div className="flex items-center gap-1 bg-klu-red/10 px-2 py-1 rounded-lg border border-klu-red/20">
                        <Star className="w-3 h-3 text-klu-red fill-klu-red" />
                        <span className="text-[10px] font-black text-klu-red">{outlet.rating}</span>
                      </div>
                    </div>
                    <p className="text-white/40 text-xs font-medium mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {outlet.blockName} Block
                    </p>
                    <div className="flex gap-2 mt-3">
                      {[outlet.category].map(cat => (
                        <span key={cat} className="text-[10px] font-black uppercase tracking-widest text-white/20 px-2 py-1 bg-white/5 rounded-md border border-white/5">
                          {cat}
                        </span>
                      ))}
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
