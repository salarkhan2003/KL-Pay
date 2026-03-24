import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings, Trophy, Flame, History, HelpCircle, LogOut, ChevronRight,
  Phone, Check, ScanLine, Shield, Store, Crown,
  GraduationCap, BarChart2, UtensilsCrossed, Users, ArrowUpRight,
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { cn } from '../utils';
import { UserProfile, Outlet } from '../types';

interface ProfileViewProps {
  profile: UserProfile | null;
  user: null;
  onLogout: () => void;
  onUpdateProfile: (data: Partial<UserProfile>) => Promise<void>;
  onSwitchView: (view: any) => void;
  outlets?: Outlet[];
  onAssignOutlet?: (outletId: string) => Promise<void>;
  assignedOutlet?: Outlet | null;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile, onLogout, onUpdateProfile, onSwitchView,
  outlets = [], onAssignOutlet, assignedOutlet,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await onUpdateProfile({ displayName: newName.trim() });
    setSaving(false);
    setIsEditingName(false);
  };

  const savePhone = async () => {
    const cleaned = newPhone.replace(/\D/g, '').slice(0, 10);
    if (cleaned.length < 10) return;
    setSaving(true);
    await onUpdateProfile({ phone: cleaned });
    setSaving(false);
    setIsEditingPhone(false);
  };

  const role = profile?.role || 'student';

  const roleConfig = {
    admin:    { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',   icon: Crown,          label: 'Admin' },
    merchant: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Store,         label: 'Merchant' },
    student:  { color: 'text-klu-red',     bg: 'bg-klu-red/10 border-klu-red/20',        icon: GraduationCap, label: 'Student' },
  }[role];

  const RoleIcon = roleConfig.icon;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

      {/* Avatar + Name */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-[28px] overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 relative">
          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile?.displayName}&backgroundColor=c8102e`}
            className="w-full h-full object-cover" alt="avatar" />
          <div className={cn('absolute bottom-0 right-0 w-6 h-6 rounded-tl-xl flex items-center justify-center', roleConfig.bg)}>
            <RoleIcon className={cn('w-3 h-3', roleConfig.color)} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex gap-2">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-klu-red text-white" autoFocus />
              <button onClick={saveName} disabled={saving} className="p-2 bg-emerald-500 rounded-xl text-white disabled:opacity-50">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-display text-2xl font-black truncate">{profile?.displayName}</h2>
              <button onClick={() => setIsEditingName(true)} className="p-1 text-white/20 hover:text-white flex-shrink-0">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-white/40 font-medium text-xs mt-0.5 truncate">{profile?.email}</p>
          <div className={cn('mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border', roleConfig.bg)}>
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
            <span className={cn('text-[10px] font-black uppercase tracking-widest', roleConfig.color)}>{roleConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Phone */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Mobile</p>
              {isEditingPhone ? (
                <div className="flex gap-2 mt-1">
                  <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm w-36 outline-none focus:ring-2 focus:ring-klu-red text-white" autoFocus />
                  <button onClick={savePhone} disabled={saving} className="p-1.5 bg-emerald-500 rounded-xl text-white disabled:opacity-50">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="font-bold text-sm mt-0.5">{profile?.phone ? `+91 ${profile.phone}` : <span className="text-white/30">Not set</span>}</p>
              )}
            </div>
          </div>
          {!isEditingPhone && (
            <button onClick={() => { setNewPhone(profile?.phone || ''); setIsEditingPhone(true); }} className="text-xs font-black text-klu-red">
              {profile?.phone ? 'Edit' : 'Add'}
            </button>
          )}
        </div>
      </GlassCard>

      {/* ── STUDENT profile ── */}
      {role === 'student' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="p-3 flex flex-col items-center text-center">
              <Trophy className="w-5 h-5 text-amber-500 mb-1" />
              <p className="text-lg font-black">{profile?.kCoins || 0}</p>
              <p className="text-[9px] font-black uppercase text-white/30">K-Coins</p>
            </GlassCard>
            <GlassCard className="p-3 flex flex-col items-center text-center">
              <Flame className="w-5 h-5 text-klu-red mb-1" />
              <p className="text-lg font-black">{profile?.streak || 0}</p>
              <p className="text-[9px] font-black uppercase text-white/30">Streak</p>
            </GlassCard>
            <GlassCard className="p-3 flex flex-col items-center text-center">
              <Shield className="w-5 h-5 text-blue-400 mb-1" />
              <p className="text-lg font-black capitalize">{profile?.block || '—'}</p>
              <p className="text-[9px] font-black uppercase text-white/30">Block</p>
            </GlassCard>
          </div>
          <MenuList items={[
            { label: 'Order History',       icon: History,      view: 'orders' },
            { label: 'Transaction History', icon: ArrowUpRight, view: 'transactions' },
            { label: 'K-Coins & Rewards',   icon: Trophy,       view: 'kcoins' },
            { label: 'Direct Pay',          icon: ScanLine,     view: 'direct_pay' },
            { label: 'Support & Tickets',   icon: HelpCircle,   view: 'support' },
          ]} onNavigate={onSwitchView} />
        </>
      )}

      {/* ── MERCHANT profile ── */}
      {role === 'merchant' && (
        <>
          {assignedOutlet ? (
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                  <img src={assignedOutlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Your Outlet</p>
                  <p className="font-black text-sm truncate">{assignedOutlet.name}</p>
                  <p className="text-xs text-white/30">{assignedOutlet.blockName}</p>
                </div>
                <div className={cn('px-2 py-1 rounded-lg text-[10px] font-black uppercase border',
                  assignedOutlet.isOpen ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20')}>
                  {assignedOutlet.isOpen ? 'Open' : 'Closed'}
                </div>
              </div>
            </GlassCard>
          ) : (
            <button onClick={() => onSwitchView('merchant')}
              className="w-full p-4 rounded-2xl bg-klu-red/10 border border-klu-red/30 text-left active:scale-[0.98] transition-all">
              <p className="text-klu-red text-xs font-black">No outlet assigned yet</p>
              <p className="text-white/40 text-[10px] mt-0.5">Tap to go to Dashboard → Create or assign an outlet</p>
            </button>
          )}
          <MenuList items={[
            { label: 'Dashboard',         icon: BarChart2,       view: 'merchant' },
            { label: 'Manage Menu',       icon: UtensilsCrossed, view: 'merchant_menu' },
            { label: 'Support & Tickets', icon: HelpCircle,      view: 'support' },
          ]} onNavigate={onSwitchView} />
          {onAssignOutlet && (
            <OutletAssigner outlets={outlets} assignedOutlet={assignedOutlet} onAssign={onAssignOutlet} />
          )}
        </>
      )}

      {/* ── ADMIN profile ── */}
      {role === 'admin' && (
        <>
          <GlassCard className="p-3 flex flex-col items-center text-center">
            <Users className="w-5 h-5 text-amber-400 mb-1" />
            <p className="text-lg font-black">{outlets.length}</p>
            <p className="text-[9px] font-black uppercase text-white/30">Outlets</p>
          </GlassCard>
          <MenuList items={[
            { label: 'Admin Dashboard',     icon: Crown,        view: 'admin' },
            { label: 'Transaction History', icon: ArrowUpRight, view: 'transactions' },
            { label: 'Support & Tickets',   icon: HelpCircle,   view: 'support' },
          ]} onNavigate={onSwitchView} />
          {outlets.length > 0 && onAssignOutlet && (
            <OutletAssigner outlets={outlets} assignedOutlet={assignedOutlet} onAssign={onAssignOutlet} />
          )}
        </>
      )}

      {/* Logout */}
      <button onClick={onLogout}
        className="w-full flex items-center p-4 glass-frosted rounded-[20px] border border-red-500/20 active:scale-[0.98] transition-all">
        <div className="flex items-center gap-3 text-red-500">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm">Logout</span>
        </div>
      </button>
    </motion.div>
  );
};

// ── Shared sub-components ─────────────────────────────────────────────────────

const MenuList: React.FC<{ items: { label: string; icon: any; view: string }[]; onNavigate: (v: string) => void }> = ({ items, onNavigate }) => (
  <div className="space-y-2">
    {items.map(item => (
      <button key={item.view} onClick={() => onNavigate(item.view)}
        className="w-full flex items-center justify-between p-4 glass-frosted rounded-[20px] border border-white/10 group active:scale-[0.98] transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
            <item.icon className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm">{item.label}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/20" />
      </button>
    ))}
  </div>
);

const OutletAssigner: React.FC<{ outlets: Outlet[]; assignedOutlet?: Outlet | null; onAssign: (id: string) => Promise<void> }> = ({ outlets, assignedOutlet, onAssign }) => (
  <div className="pt-2 border-t border-white/5">
    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3 flex items-center gap-2">
      <Store className="w-3 h-3" /> Assign Outlet
    </p>
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {outlets.map(outlet => (
        <button key={outlet.id} onClick={() => onAssign(outlet.id)}
          className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
            assignedOutlet?.id === outlet.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-white/20')}>
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
            <img src={outlet.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate">{outlet.name}</p>
            <p className="text-[10px] text-white/30">{outlet.blockName}</p>
          </div>
          {assignedOutlet?.id === outlet.id && <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />}
        </button>
      ))}
    </div>
  </div>
);
