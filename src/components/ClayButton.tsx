import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ClayButton = ({ children, onClick, className, variant = 'primary', disabled = false, type = 'button' }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'secondary' | 'danger' | 'emerald' | 'slate', disabled?: boolean, type?: 'button' | 'submit' | 'reset' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "px-6 py-4 font-bold text-sm transition-all active:scale-95 rounded-[24px] disabled:opacity-50 disabled:cursor-not-allowed",
      variant === 'primary' && "clay-red",
      variant === 'secondary' && "clay-dark",
      variant === 'danger' && "bg-red-900/50 text-white border border-red-500/30",
      variant === 'emerald' && "bg-emerald-900/50 text-white border border-emerald-500/30",
      variant === 'slate' && "bg-slate-900/50 text-white border border-slate-500/30",
      className
    )}
  >
    {children}
  </button>
);
