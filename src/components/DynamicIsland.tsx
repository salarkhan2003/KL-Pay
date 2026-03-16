import React from 'react';
import { motion } from 'motion/react';

export const DynamicIsland = () => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200]">
    <motion.div 
      initial={{ width: 120, height: 36 }}
      animate={{ width: 140 }}
      className="bg-black rounded-full flex items-center justify-center px-4 gap-2 shadow-2xl border border-white/10"
    >
      <motion.div 
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-2 h-2 rounded-full bg-klu-red shadow-[0_0_8px_rgba(200,16,46,0.8)]"
      />
      <span className="text-[10px] font-bold tracking-widest uppercase text-white/60">KL ONE</span>
    </motion.div>
  </div>
);
