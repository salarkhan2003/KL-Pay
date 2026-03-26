import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../utils';

export const PRESET_BLOCKS = [
  'Tulip Hostel',
  'Himalaya Hostel',
  'Kanchan Ganga Hostel',
  'Vindhya Hostel',
  'CSE',
  'EEE',
  'MECH',
  'CIVIL',
  'R&D',
  'FED',
  'SDC',
  'C Block',
];

interface BlockPickerProps {
  value: string;
  onChange: (block: string) => void;
  /** Show as a compact select dropdown instead of chip grid */
  compact?: boolean;
  label?: string;
}

export const BlockPicker: React.FC<BlockPickerProps> = ({ value, onChange, compact = false, label = 'Block / Location' }) => {
  const [customMode, setCustomMode] = useState(!PRESET_BLOCKS.includes(value) && value !== '');
  const [customInput, setCustomInput] = useState(!PRESET_BLOCKS.includes(value) ? value : '');

  const handlePreset = (b: string) => {
    setCustomMode(false);
    onChange(b);
  };

  const handleCustomConfirm = () => {
    if (customInput.trim()) onChange(customInput.trim());
  };

  if (compact) {
    // Dropdown mode for forms with limited space
    return (
      <div>
        {label && <p className="text-[10px] font-black uppercase text-white/30 mb-1">{label}</p>}
        {customMode ? (
          <div className="flex gap-2">
            <input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onBlur={handleCustomConfirm}
              onKeyDown={e => { if (e.key === 'Enter') { handleCustomConfirm(); (e.target as HTMLInputElement).blur(); } }}
              placeholder="Type block name..."
              autoFocus
              className="flex-1 bg-white/5 border border-klu-red/50 rounded-xl px-3 py-2.5 text-sm font-bold text-white placeholder-white/20 outline-none"
            />
            <button onClick={() => { setCustomMode(false); onChange(PRESET_BLOCKS[0]); }}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={value}
              onChange={e => onChange(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-klu-red/50"
            >
              {PRESET_BLOCKS.map(b => <option key={b} value={b} className="bg-gray-900">{b}</option>)}
            </select>
            <button onClick={() => { setCustomMode(true); setCustomInput(''); }}
              title="Enter custom block name"
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-klu-red hover:border-klu-red/30 transition-all flex-shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Chip grid mode for profile / registration
  return (
    <div>
      {label && <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {PRESET_BLOCKS.map(b => (
          <button key={b} onClick={() => handlePreset(b)}
            className={cn(
              'px-3 py-2 rounded-xl border text-xs font-black transition-all',
              value === b && !customMode
                ? 'bg-klu-red border-klu-red text-white'
                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'
            )}>
            {b}
          </button>
        ))}
        {/* Custom entry chip */}
        {customMode ? (
          <div className="flex items-center gap-1.5 bg-klu-red/10 border border-klu-red/40 rounded-xl px-2 py-1">
            <input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onBlur={handleCustomConfirm}
              onKeyDown={e => { if (e.key === 'Enter') { handleCustomConfirm(); (e.target as HTMLInputElement).blur(); } }}
              placeholder="Type name..."
              autoFocus
              className="bg-transparent text-xs font-black text-white placeholder-white/30 outline-none w-28"
            />
            <button onClick={() => { setCustomMode(false); if (!PRESET_BLOCKS.includes(value)) onChange(PRESET_BLOCKS[0]); }}
              className="text-white/30 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button onClick={() => { setCustomMode(true); setCustomInput(value && !PRESET_BLOCKS.includes(value) ? value : ''); }}
            className={cn(
              'px-3 py-2 rounded-xl border text-xs font-black transition-all flex items-center gap-1',
              !PRESET_BLOCKS.includes(value) && value
                ? 'bg-klu-red border-klu-red text-white'
                : 'bg-white/5 border-dashed border-white/20 text-white/30 hover:border-white/40 hover:text-white/60'
            )}>
            <Plus className="w-3 h-3" />
            {!PRESET_BLOCKS.includes(value) && value ? value : 'Custom'}
          </button>
        )}
      </div>
    </div>
  );
};
