import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GlassCard: React.FC<{ children: React.ReactNode, className?: string, delay?: number, onClick?: () => void }> = ({ children, className, delay = 0, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
    onClick={onClick}
    className={cn("glass-frosted rounded-[32px] p-6 relative overflow-hidden", className, onClick && "cursor-pointer active:scale-[0.98] transition-transform")}
  >
    <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />
    {children}
  </motion.div>
);
