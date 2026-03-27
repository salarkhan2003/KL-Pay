import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { MapPin, Star, Clock, Search, Filter } from 'lucide-react';
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
  outlets, onSelectOutlet,
  searchQuery, setSearchQuery,
  blockFilter, setBlockFilter,
  categoryFilter, setCategoryFilter,
}) => {
  const blocks = useMemo(() => ['All', ...Array.from(new Set(outlets.map(o => o.blockName).filter(Boolean)))], [outlets]);
  const categories = useMemo(() => ['All', ...Array.from(new Set(outlets.map(o => o.category).filter(Boolean)))], [outlets]);

  const visibleOutlets = useMemo(() => outlets.filter(o => {
    const matchSearch = !searchQuery || o.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.blockName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBlock = blockFilter === 'All' || o.blockName === blockFilter;
    const matchCat = categoryFilter === 'All' || o.category === categoryFilter;
    return matchSearch && matchBlock && matchCat;
  }), [outlets, searchQuery, blockFilter, categoryFilter]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-display text-4xl font-black leading-none">Hungry?</h2>
        <p className="text-white/30 text-sm font-medium">Order from campus canteens</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input
          className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-klu-red/40"
          placeholder="Search canteens..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Block filter */}
      {blocks.length > 2 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {blocks.map(b => (
            <button key={b} onClick={() => setBlockFilter(b)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-black border transition-all whitespace-nowrap flex-shrink-0',
                blockFilter === b ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white')}>
              {b}
            </button>
          ))}
        </div>
      )}

      {/* Category filter */}
      {categories.length > 2 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-black border transition-all whitespace-nowrap flex-shrink-0',
                categoryFilter === c ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.03] border-white/5 text-white/30 hover:text-white')}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Outlet grid — 1 col mobile, 2 col lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleOutlets.length === 0 ? (
          <div className="col-span-full text-center py-12 glass-frosted rounded-3xl border border-white/10">
            <p className="text-white/40 font-medium">No canteens found</p>
            {(searchQuery || blockFilter !== 'All' || categoryFilter !== 'All') && (
              <button onClick={() => { setSearchQuery(''); setBlockFilter('All'); setCategoryFilter('All'); }}
                className="mt-3 text-xs font-black text-klu-red">Clear filters</button>
            )}
          </div>
        ) : visibleOutlets.map((outlet, idx) => (
          <GlassCard key={outlet.id} delay={idx * 0.04} onClick={() => onSelectOutlet(outlet)} className="group cursor-pointer">
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
                  <span className={cn('text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border',
                    outlet.isOpen ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20')}>
                    {outlet.isOpen ? 'Open' : 'Closed'}
                  </span>
                  {outlet.category && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border text-white/30 bg-white/5 border-white/10">
                      {outlet.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
};
