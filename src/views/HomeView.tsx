import React from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, Star, Clock } from 'lucide-react';
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

export const HomeView: React.FC<HomeViewProps> = ({
  outlets,
  onSelectOutlet,
  searchQuery,
  setSearchQuery,
  blockFilter,
  setBlockFilter,
  categoryFilter,
  setCategoryFilter,
}) => {
  const blocks = ['All', ...Array.from(new Set(outlets.map(o => o.blockName)))];
  const categories = ['All', ...Array.from(new Set(outlets.map(o => o.category)))];

  const filteredOutlets = outlets
    .filter(o => blockFilter === 'All' || o.blockName === blockFilter)
    .filter(o => categoryFilter === 'All' || o.category === categoryFilter)
    .filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 o.description.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <h2 className="text-display text-4xl font-black leading-none">Hungry?</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input
            type="text"
            placeholder="Search for food or outlets..."
            className="w-full h-14 bg-white/5 border border-white/10 rounded-[24px] pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-klu-red/50 transition-all outline-none text-white placeholder:text-white/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Block Filters */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Block</p>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {blocks.map(block => (
            <button
              key={block}
              onClick={() => setBlockFilter(block)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border",
                blockFilter === block
                  ? "bg-klu-red border-klu-red text-white shadow-lg shadow-klu-red/20"
                  : "bg-white/5 border-white/10 text-white/40"
              )}
            >
              {block}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filters */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Category</p>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border",
                categoryFilter === cat
                  ? "bg-white/20 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-white/40"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
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
                delay={idx * 0.05}
                onClick={() => onSelectOutlet(outlet)}
                className="group"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                    <img
                      src={outlet.imageUrl}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      alt={outlet.name}
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
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {outlet.blockName} Block
                    </p>
                    {outlet.timings && (
                      <p className="text-white/30 text-xs font-medium mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" /> {outlet.timings}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20 px-2 py-1 bg-white/5 rounded-md border border-white/5">
                        {outlet.category}
                      </span>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border",
                        outlet.isOpen
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : "text-red-400 bg-red-500/10 border-red-500/20"
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
