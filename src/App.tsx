import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  supabase, upsertOutlet, deleteOutletDb, upsertMenuItem, deleteMenuItemDb,
  insertOrder, updateOrderStatusDb, deleteOrderDb, insertSupportTicket,
  updateProfileFields, awardKCoinsSupabase,
  rowToOutlet, rowToMenuItem, rowToOrder, rowToTransaction, rowToSupportTicket,
} from './supabase';
import { saveUserProfile, signOutUser, getMerchantOutletByCode } from './auth';
import { Trash2, UtensilsCrossed, LogOut, Home, ShoppingBag, ShoppingCart, User, LayoutDashboard, ScanLine, ArrowUpRight } from 'lucide-react';
import { UserProfile, Outlet, MenuItem, Order, OrderItem, SupportTicket, CartItem, Transaction } from './types';
import { cn } from './utils';
import { ClayButton } from './components/ClayButton';
import { DynamicIsland } from './components/DynamicIsland';
import { Navigation } from './components/Navigation';
import { LoginPage } from './components/LoginPage';
import { HomeView } from './views/HomeView';
import { OutletDetailView } from './views/OutletDetailView';
import { CartView } from './views/CartView';
import { OrdersView } from './views/OrdersView';
import { ProfileView } from './views/ProfileView';
import { MerchantView } from './views/MerchantView';
import { MerchantMenuView } from './views/MerchantMenuView';
import { SupportView } from './views/SupportView';
import { AdminView } from './views/AdminView';
import { KCoinsView } from './views/KCoinsView';
import { DirectPayView } from './views/DirectPayView';
import { TransactionHistoryView } from './views/TransactionHistoryView';
import { PLATFORM_FEE } from './paymentEngine';
import { awardKCoinsSupabase } from './supabase';

// alias for use in payment confirmation
const awardKCoins = awardKCoinsSupabase;

declare global { interface Window { Cashfree: any; } }

const FRIENDS_ID = 'friends-canteen';
const TEST_ID    = 'test-canteen';

const SEED_OUTLETS = [
  { id: FRIENDS_ID, name: "Friend's Canteen", description: 'Authentic biryani and SP Curry specials.', image_url: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg', is_open: true, merchant_id: '', block_name: 'Tulip Hostel', category: 'Meals', upi_id: 'friends.canteen@okaxis', timings: '7am – 10pm', rating: 4.7 },
  { id: TEST_ID,    name: 'Test Canteen',      description: 'Dev testing — Rs.1 items only.',           image_url: 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',  is_open: true, merchant_id: '', block_name: 'Tulip Hostel', category: 'Meals', upi_id: 'test.canteen@okaxis',    timings: '24/7',       rating: 5.0 },
];

const SEED_MENU = [
  { id: `${FRIENDS_ID}_biryani`,    outlet_id: FRIENDS_ID, name: 'Biryani',          description: 'Classic aromatic biryani with raita',     price: 80,  image_url: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg', category: 'Main',  is_available: true, prep_time: '15m' },
  { id: `${FRIENDS_ID}_sp_biryani`, outlet_id: FRIENDS_ID, name: 'SP Curry Biryani', description: 'Special SP curry biryani — rich and spicy', price: 100, image_url: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/sp-biryani.jpeg',    category: 'Main',  is_available: true, prep_time: '20m' },
  { id: `${TEST_ID}_chocolate`,     outlet_id: TEST_ID,    name: 'Chocolate',        description: 'Rs.1 test item for payment testing',       price: 1,   image_url: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=400',  category: 'Snack', is_available: true, prep_time: '1m'  },
];

async function ensureCanteensSeeded() {
  const results = await Promise.allSettled([
    ...SEED_OUTLETS.map(o => upsertOutlet(o)),
    ...SEED_MENU.map(m => upsertMenuItem(m)),
  ]);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) console.warn(`seed: ${failed.length} items failed (DB may need SQL migration)`);
}

// ── Desktop sidebar navigation ────────────────────────────────────────────────
function DesktopNav({ activeView, onViewChange, role, cartCount }: { activeView: string; onViewChange: (v: string) => void; role: string; cartCount: number }) {
  const studentTabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'direct_pay', icon: ScanLine, label: 'Pay' },
    { id: 'orders', icon: ShoppingBag, label: 'Orders' },
    { id: 'cart', icon: ShoppingCart, label: 'Cart', badge: cartCount },
    { id: 'transactions', icon: ArrowUpRight, label: 'Transactions' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];
  const merchantTabs = [
    { id: 'merchant', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'merchant_menu', icon: UtensilsCrossed, label: 'Menu' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];
  const adminTabs = [
    { id: 'admin', icon: LayoutDashboard, label: 'Admin' },
    { id: 'home', icon: Home, label: 'Browse' },
    { id: 'transactions', icon: ArrowUpRight, label: 'Transactions' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];
  const tabs = role === 'admin' ? adminTabs : role === 'merchant' ? merchantTabs : studentTabs;
  return (
    <nav className="space-y-1">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button key={tab.id} onClick={() => onViewChange(tab.id)}
            className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all relative',
              isActive ? 'bg-klu-red text-white shadow-lg shadow-klu-red/20' : 'text-white/40 hover:text-white hover:bg-white/5')}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{tab.label}</span>
            {(tab as any).badge > 0 && (
              <span className="ml-auto w-5 h-5 bg-white text-klu-red rounded-full text-[10px] font-black flex items-center justify-center">
                {(tab as any).badge > 9 ? '9+' : (tab as any).badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSkipped, setIsSkipped] = useState(false);
  const [view, setView] = useState<string>('home');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>(() =>
    SEED_OUTLETS.map(o => ({
      id: o.id, name: o.name, description: o.description, imageUrl: o.image_url,
      isOpen: o.is_open, merchantId: o.merchant_id, blockName: o.block_name,
      category: o.category, upiId: o.upi_id, timings: o.timings, rating: o.rating,
    }))
  );
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchantOrders, setMerchantOrders] = useState<Order[]>([]);
  const [merchantMenu, setMerchantMenu] = useState<MenuItem[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [dbMissing, setDbMissing] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Persist profile across refreshes ─────────────────────────────────────
  const PROFILE_KEY = 'klone-profile';
  const persistProfile = (p: UserProfile | null) => {
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_KEY);
    setProfile(p);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; setLoading(false); } };

    // Restore from localStorage immediately so UI doesn't flash login screen
    const cached = localStorage.getItem(PROFILE_KEY);
    if (cached) {
      try {
        const p: UserProfile = JSON.parse(cached);
        setProfile(p);
        setView(p.role === 'merchant' ? 'merchant' : p.role === 'admin' ? 'admin' : 'home');
      } catch { localStorage.removeItem(PROFILE_KEY); }
    }

    // Hard timeout — show app in 3s no matter what
    const timeout = setTimeout(finish, 3000);
    let sessionHandled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          sessionHandled = true;
          try {
            const p = await saveUserProfile(session.user.id, session.user.email || '', '', {});
            persistProfile(p);
            if (p.role === 'merchant') setView('merchant');
            else if (p.role === 'admin') setView('admin');
            else setView('home');
          } catch (e) { console.warn('Profile load:', e); }
        } else if (!cached) {
          // No session and no cache — show login
        }
      } catch (e) { console.warn('getSession:', e); }
      clearTimeout(timeout);
      finish();
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (sessionHandled) { sessionHandled = false; return; }
        try {
          const p = await saveUserProfile(session.user.id, session.user.email || '', '', {});
          persistProfile(p); setIsSkipped(false);
          if (p.role === 'merchant') setView('merchant');
          else if (p.role === 'admin') setView('admin');
          else setView('home');
        } catch (e) { console.warn('Profile save:', e); }
        finish();
      } else if (event === 'SIGNED_OUT') {
        persistProfile(null); setIsSkipped(false); setView('home'); setCart([]);
      }
      // Ignore TOKEN_REFRESHED — don't log out on token refresh failures
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    persistProfile(null); setIsSkipped(false); setView('home'); setCart([]);
    await signOutUser().catch(() => {});
  };

  const devLogin = async (role: 'student' | 'merchant' | 'admin') => {
    const names = { student: 'Test Student', merchant: 'Test Merchant', admin: 'Salar Khan (Admin)' };
    const p: UserProfile = { uid: `dev_${role}_${Date.now()}`, email: role === 'admin' ? 'salarkhanpatan7861@gmail.com' : `dev_${role}@kluniversity.in`, displayName: names[role], role, kCoins: role === 'student' ? 120 : 0, streak: role === 'student' ? 5 : 0, block: 'CSE', phone: '9999999999' };
    persistProfile(p); setIsSkipped(false);
    ensureCanteensSeeded().catch(() => {});
    setView(role === 'merchant' ? 'merchant' : role === 'admin' ? 'admin' : 'home');
  };

  const merchantCodeLogin = async (code: string): Promise<boolean> => {
    const outletId = getMerchantOutletByCode(code);
    if (!outletId) return false;
    const seedOutlet = SEED_OUTLETS.find(o => o.id === outletId);
    const p: UserProfile = {
      uid: `merchant_${outletId}_${Date.now()}`,
      email: `merchant_${outletId}@kluniversity.in`,
      displayName: seedOutlet?.name || outletId,
      role: 'merchant', kCoins: 0, streak: 0, block: 'CSE',
      merchantOutletId: outletId,
    };
    persistProfile(p); setIsSkipped(false);
    ensureCanteensSeeded().catch(() => {});
    setView('merchant');
    return true;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const fieldMap: Record<string, string> = { displayName: 'display_name', phone: 'phone', kCoins: 'k_coins', streak: 'streak', merchantOutletId: 'merchant_outlet_id' };
    const dbUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) { if (fieldMap[k]) dbUpdates[fieldMap[k]] = v; }
    if (Object.keys(dbUpdates).length) updateProfileFields(profile.uid, dbUpdates).catch(() => {});
    const updated = { ...profile, ...updates };
    persistProfile(updated);
  };

  const assignOutlet = async (outletId: string) => {
    if (!profile) return;
    // Try DB update, don't block on failure
    supabase.from('outlets').update({ merchant_id: profile.uid }).eq('id', outletId).catch(() => {});
    await updateProfile({ merchantOutletId: outletId });
  };

  // ── Seed canteens ─────────────────────────────────────────────────────────
  const seedCanteenData = async () => {
    setIsSeeding(true);
    try { await ensureCanteensSeeded(); } catch (e) { console.warn('seed:', e); }
    // Reload outlets after seeding
    const { data } = await supabase.from('outlets').select('*').catch(() => ({ data: null }));
    if (data && data.length > 0) setOutlets(data.map(rowToOutlet));
    setIsSeeding(false);
    showToast('Campus data seeded');
  };

  // ── Supabase realtime listeners ───────────────────────────────────────────
  useEffect(() => {
    const loadOutlets = async () => {
      const { data, error } = await supabase.from('outlets').select('*');
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          setDbMissing(true);
        }
        // On ANY error (including 401/403) fall back to seed data so UI isn't blank
        setOutlets(SEED_OUTLETS.map(o => ({
          id: o.id, name: o.name, description: o.description, imageUrl: o.image_url,
          isOpen: o.is_open, merchantId: o.merchant_id, blockName: o.block_name,
          category: o.category, upiId: o.upi_id, timings: o.timings, rating: o.rating,
        })));
        return;
      }
      setDbMissing(false);
      if (data && data.length > 0) {
        setOutlets(data.map(rowToOutlet));
      } else {
        // Seed when genuinely empty — fire-and-forget
        ensureCanteensSeeded().then(() => {
          supabase.from('outlets').select('*').then(({ data: seeded }) => {
            if (seeded && seeded.length > 0) setOutlets(seeded.map(rowToOutlet));
          });
        });
        // Show seed data immediately while seeding runs
        setOutlets(SEED_OUTLETS.map(o => ({
          id: o.id, name: o.name, description: o.description, imageUrl: o.image_url,
          isOpen: o.is_open, merchantId: o.merchant_id, blockName: o.block_name,
          category: o.category, upiId: o.upi_id, timings: o.timings, rating: o.rating,
        })));
      }
    };
    loadOutlets();
    const ch = supabase.channel('outlets').on('postgres_changes', { event: '*', schema: 'public', table: 'outlets' }, () => {
      supabase.from('outlets').select('*').then(({ data }) => { if (data) setOutlets(data.map(rowToOutlet)); });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!profile) return;
    supabase.from('orders').select('*').eq('student_id', profile.uid).order('created_at', { ascending: false }).then(({ data }) => { if (data) setOrders(data.map(rowToOrder)); });
    const ch = supabase.channel(`orders_student_${profile.uid}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `student_id=eq.${profile.uid}` }, () => {
      supabase.from('orders').select('*').eq('student_id', profile.uid).order('created_at', { ascending: false }).then(({ data }) => { if (data) setOrders(data.map(rowToOrder)); });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile || profile.role !== 'merchant') return;
    const outletId = profile.merchantOutletId || outlets.find(o => o.merchantId === profile.uid)?.id;
    if (!outletId) return;
    supabase.from('orders').select('*').eq('outlet_id', outletId).order('created_at', { ascending: false }).then(({ data }) => { if (data) setMerchantOrders(data.map(rowToOrder)); });
    const ch = supabase.channel(`orders_merchant_${outletId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${outletId}` }, () => {
      supabase.from('orders').select('*').eq('outlet_id', outletId).order('created_at', { ascending: false }).then(({ data }) => { if (data) setMerchantOrders(data.map(rowToOrder)); });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.uid, profile?.role, profile?.merchantOutletId, outlets.length]);

  useEffect(() => {
    if (!profile || profile.role !== 'merchant') return;
    const outletId = profile.merchantOutletId || outlets.find(o => o.merchantId === profile.uid)?.id;
    if (!outletId) return;
    supabase.from('menu_items').select('*').eq('outlet_id', outletId).order('name').then(({ data }) => { if (data) setMerchantMenu(data.map(rowToMenuItem)); });
    const ch = supabase.channel(`menu_${outletId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${outletId}` }, () => {
      supabase.from('menu_items').select('*').eq('outlet_id', outletId).order('name').then(({ data }) => { if (data) setMerchantMenu(data.map(rowToMenuItem)); });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.uid, profile?.role, profile?.merchantOutletId, outlets.length]);

  useEffect(() => {
    if (!profile) return;
    supabase.from('support_tickets').select('*').eq('user_id', profile.uid).order('created_at', { ascending: false }).then(({ data }) => { if (data) setSupportTickets(data.map(rowToSupportTicket)); });
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile) return;
    supabase.from('transactions').select('*').eq('student_id', profile.uid).order('created_at', { ascending: false }).then(({ data }) => { if (data) setTransactions(data.map(rowToTransaction)); });
    const ch = supabase.channel(`tx_${profile.uid}`).on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `student_id=eq.${profile.uid}` }, () => {
      supabase.from('transactions').select('*').eq('student_id', profile.uid).order('created_at', { ascending: false }).then(({ data }) => { if (data) setTransactions(data.map(rowToTransaction)); });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.uid]);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setAllOrders(data.map(rowToOrder)); });
    const ch = supabase.channel('orders_admin').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setAllOrders(data.map(rowToOrder)); });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.role]);

  useEffect(() => {
    if (!selectedOutlet) return;
    supabase.from('menu_items').select('*').eq('outlet_id', selectedOutlet.id).then(({ data, error }) => {
      if (data && data.length > 0) {
        setMenuItems(data.map(rowToMenuItem));
      } else if (!error) {
        // Empty — show seed menu as fallback
        setMenuItems(SEED_MENU.filter(m => m.outlet_id === selectedOutlet.id).map(m => ({
          id: m.id, outletId: m.outlet_id, name: m.name, description: m.description,
          price: m.price, imageUrl: m.image_url, category: m.category,
          isAvailable: m.is_available, prepTime: m.prep_time,
        })));
      } else {
        // DB error — show seed menu so students can still browse
        setMenuItems(SEED_MENU.filter(m => m.outlet_id === selectedOutlet.id).map(m => ({
          id: m.id, outletId: m.outlet_id, name: m.name, description: m.description,
          price: m.price, imageUrl: m.image_url, category: m.category,
          isAvailable: m.is_available, prepTime: m.prep_time,
        })));
      }
    });
    const ch = supabase.channel(`menu_view_${selectedOutlet.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${selectedOutlet.id}` }, () => {
      supabase.from('menu_items').select('*').eq('outlet_id', selectedOutlet.id).then(({ data }) => { if (data) setMenuItems(data.map(rowToMenuItem)); });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedOutlet?.id]);

  // Handle Cashfree return URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id') || params.get('dp_order_id');
    if (!orderId) return;
    // Clean URL immediately
    window.history.replaceState({}, document.title, window.location.pathname);
    (async () => {
      try {
        // Update order payment status
        await supabase.from('orders').update({ payment_status: 'paid', status: 'pending' }).eq('id', orderId);
        // Update transaction status
        await supabase.from('transactions').update({ payment_status: 'paid' }).eq('cashfree_order_id', orderId);
        // Award K-Coins if user is logged in
        if (profile?.uid) {
          const kCoins = await awardKCoins(profile.uid, 5);
          setProfile(prev => prev ? { ...prev, kCoins: (prev.kCoins || 0) + 5 } : prev);
          // Persist updated kCoins
          const cached = localStorage.getItem('klone-profile');
          if (cached) {
            try {
              const p = JSON.parse(cached);
              localStorage.setItem('klone-profile', JSON.stringify({ ...p, kCoins: (p.kCoins || 0) + 5 }));
            } catch { /* ignore */ }
          }
          showToast(`✓ Payment confirmed! +5 K-Coins earned`);
        } else {
          showToast('✓ Payment confirmed!');
        }
        setView('transactions');
      } catch (err) {
        console.error('Payment confirmation:', err);
        showToast('Payment received — check your order history', 'success');
        setView('orders');
      }
    })();
  }, [profile?.uid]);

  // ── Cart ─────────────────────────────────────────────────────────────────
  const addToCart = (item: MenuItem | CartItem) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, imageUrl: (item as any).imageUrl || '' }];
    });
  };

  const reorder = (items: OrderItem[]) => {
    setCart(prev => {
      const next = [...prev];
      items.forEach(item => { const ex = next.find(i => i.id === item.id); if (ex) ex.quantity += item.quantity; else next.push({ ...item, imageUrl: '' }); });
      return next;
    });
    setView('cart');
  };

  const updateCartQuantity = (itemId: string, delta: number) =>
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));

  const removeItemFromCart = (itemId: string) => setCart(prev => prev.filter(i => i.id !== itemId));
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  // ── Checkout ─────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!profile || !selectedOutlet || cart.length === 0) return;
    const orderId = `KLP_${Date.now()}`;
    const totalAmount = Math.round((cartTotal + PLATFORM_FEE) * 100) / 100;
    const token = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      const res = await fetch('/api/payments/create-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount, customerId: profile.uid, orderId, customerEmail: profile.email, customerName: profile.displayName, customerPhone: profile.phone || '9999999999', merchantVpa: selectedOutlet.upiId, outletName: selectedOutlet.name, token }),
      });
      const sessionData = await res.json();
      if (!sessionData.payment_session_id) {
        const errMsg = typeof sessionData.error === 'string'
          ? sessionData.error
          : JSON.stringify(sessionData.error || sessionData);
        throw new Error(errMsg);
      }

      await insertOrder({ id: orderId, student_id: profile.uid, outlet_id: selectedOutlet.id, user_name: profile.displayName, user_phone: profile.phone || '', items: cart, total_amount: totalAmount, convenience_fee: PLATFORM_FEE, vendor_amount: cartTotal, status: 'pending', payment_status: 'unpaid', token, created_at: new Date().toISOString() });

      const cashfree = new window.Cashfree({ mode: 'production' });
      await cashfree.checkout({ paymentSessionId: sessionData.payment_session_id, redirectTarget: '_self' });
      setCart([]); setSelectedOutlet(null);
    } catch (err: any) {
      console.error('Checkout:', err);
      const msg = err?.message || 'Payment initialization failed';
      // Show a readable error — strip JSON noise
      const display = msg.includes('appId') || msg.includes('authentication')
        ? 'Payment gateway not configured. Contact support.'
        : msg.length > 80 ? 'Payment failed. Please try again.' : msg;
      showToast(display, 'error');
    }
  };

  // ── Merchant / Admin helpers ──────────────────────────────────────────────
  const getMerchantOutlet = (override?: string) =>
    override ? outlets.find(o => o.id === override)
      : outlets.find(o => o.merchantId === profile?.uid) || (profile?.merchantOutletId ? outlets.find(o => o.id === profile.merchantOutletId) : undefined);

  const toggleMenuItemAvailability = async (itemId: string, isAvailable: boolean) => {
    await supabase.from('menu_items').update({ is_available: isAvailable }).eq('id', itemId);
  };

  const saveMenuItem = async (item: Partial<MenuItem> & { name: string; price: number; category: string }, outletIdOverride?: string) => {
    const outlet = getMerchantOutlet(outletIdOverride);
    if (!outlet) { showToast('No outlet assigned', 'error'); return; }
    const itemId = item.id || `${outlet.id}_${item.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    await upsertMenuItem({ id: itemId, outlet_id: outlet.id, name: item.name, description: item.description || '', price: item.price, image_url: item.imageUrl || '', category: item.category, is_available: item.isAvailable ?? true, prep_time: item.prepTime || '10m' });
    showToast(item.id ? 'Item updated' : 'Item added');
  };

  const deleteMenuItem = async (itemId: string, _?: string) => {
    await deleteMenuItemDb(itemId);
    showToast('Item deleted');
  };

  const saveOutlet = async (data: Partial<Outlet> & { name: string }) => {
    const id = data.id || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const outletRow = {
      id, name: data.name, description: data.description || '',
      image_url: data.imageUrl || 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',
      is_open: data.isOpen ?? true, merchant_id: data.merchantId || profile?.uid || '',
      block_name: data.blockName || 'CSE', category: data.category || 'Meals',
      upi_id: data.upiId || '', timings: data.timings || '8am – 9pm', rating: data.rating || 4.0,
    };
    try {
      await upsertOutlet(outletRow);
    } catch (e) {
      console.warn('upsertOutlet failed (DB may need SQL migration), continuing locally:', e);
    }
    // Always update local state so UI reflects the new outlet immediately
    const newOutlet = rowToOutlet(outletRow);
    setOutlets(prev => {
      const exists = prev.find(o => o.id === id);
      return exists ? prev.map(o => o.id === id ? newOutlet : o) : [...prev, newOutlet];
    });
    // If merchant creating new outlet with no assignment yet, auto-assign locally
    if (profile?.role === 'merchant' && !profile.merchantOutletId && !data.id) {
      // Try DB assign, but don't block on failure
      supabase.from('outlets').update({ merchant_id: profile.uid }).eq('id', id).catch(() => {});
      updateProfile({ merchantOutletId: id });
    }
    showToast(data.id ? 'Outlet updated' : 'Outlet created');
  };

  const deleteOutlet = async (outletId: string) => { await deleteOutletDb(outletId); showToast('Outlet deleted'); };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => { await updateOrderStatusDb(orderId, status); };

  const deleteOrder = async (orderId: string) => { await deleteOrderDb(orderId); showToast('Order deleted'); setDeleteConfirmId(null); };

  const submitSupportTicket = async (subject: string, message: string) => {
    if (!profile) return;
    await insertSupportTicket({ id: crypto.randomUUID(), user_id: profile.uid, subject, message, status: 'open', created_at: new Date().toISOString() });
    showToast('Support ticket submitted!');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-crimson-dark overflow-hidden">
      <div className="relative">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 bg-klu-red rounded-full flex items-center justify-center z-10 relative shadow-[0_0_40px_rgba(200,16,46,0.6)]">
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </motion.div>
        {[1, 2, 3].map(i => (
          <motion.div key={i} initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            className="absolute inset-0 border-2 border-klu-red rounded-full" />
        ))}
      </div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mt-12 text-display text-4xl font-black text-white tracking-tighter">KL ONE</motion.h1>
    </div>
  );

  if (!profile && !isSkipped) return (
    <LoginPage
      onSkip={() => setIsSkipped(true)}
      onMagicLinkComplete={async (uid, email, phone) => {
        try {
          const p = await saveUserProfile(uid, email, phone, {});
          persistProfile(p);
          if (p.role === 'merchant') setView('merchant');
          else if (p.role === 'admin') setView('admin');
          else setView('home');
        } catch (e) {
          console.warn('onMagicLinkComplete:', e);
        }
      }}
      onDevLogin={devLogin}
      onMerchantCodeLogin={merchantCodeLogin}
    />
  );

  const merchantOutlet = outlets.find(o => o.merchantId === profile?.uid)
    || (profile?.merchantOutletId ? outlets.find(o => o.id === profile.merchantOutletId) || null : null);

  return (
    <div className="min-h-screen bg-crimson-dark font-sans selection:bg-klu-red selection:text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[-20%] w-[80%] h-[80%] radial-glow opacity-10" />
        <div className="absolute bottom-[10%] left-[-20%] w-[80%] h-[80%] radial-glow opacity-10" />
      </div>

      {/* Desktop layout: sidebar nav + content area */}
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-0 bottom-0 z-50 p-6 border-r border-white/5 bg-crimson-dark/80 backdrop-blur-xl">
          <div className="mb-8">
            <p className="text-[10px] font-black text-klu-red uppercase tracking-[0.2em] mb-1">KL ONE</p>
            <p className="text-white font-black text-lg truncate">{profile?.displayName || 'Guest'}</p>
            <p className="text-white/30 text-xs truncate">{profile?.email}</p>
          </div>
          <DesktopNav activeView={view} onViewChange={setView} role={profile?.role || 'student'} cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)} />
          <button onClick={logout} className="mt-auto flex items-center gap-3 p-3 rounded-2xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-bold">Logout</span>
          </button>
        </aside>

        {/* Main content */}
        <div className="flex-1 lg:ml-64 flex flex-col">
          {/* Mobile header */}
          <header className="lg:hidden p-6 pt-14 flex items-center justify-between sticky top-0 z-50 bg-crimson-dark/60 backdrop-blur-xl">
            <div>
              <h2 className="text-[10px] font-black text-klu-red uppercase tracking-[0.2em] mb-1">Welcome back</h2>
              <h1 className="text-2xl font-black text-white tracking-tight">{profile?.displayName || 'Guest'}</h1>
            </div>
            <button onClick={logout} className="w-12 h-12 rounded-2xl glass-frosted flex items-center justify-center text-white/60 hover:text-klu-red transition-all active:scale-90">
              <LogOut className="w-5 h-5" />
            </button>
          </header>

          {/* Desktop header */}
          <header className="hidden lg:flex p-8 items-center justify-between border-b border-white/5">
            <div>
              <h2 className="text-[10px] font-black text-klu-red uppercase tracking-[0.2em] mb-1">Welcome back</h2>
              <h1 className="text-2xl font-black text-white tracking-tight">{profile?.displayName || 'Guest'}</h1>
            </div>
          </header>

          <DynamicIsland />
          {/* DB missing banner — app still loads, just shows a warning */}
          {dbMissing && (
            <div className="mx-6 lg:mx-10 mt-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <span className="text-amber-400 text-lg">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-amber-400 text-xs font-black">Database tables missing</p>
                <p className="text-white/30 text-[10px]">Run <span className="text-white font-bold">scripts/create-tables.sql</span> in Supabase SQL Editor, then refresh.</p>
              </div>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
                className="text-[10px] font-black text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg whitespace-nowrap">
                Open →
              </a>
            </div>
          )}
          <main className="flex-1 p-6 lg:p-10 max-w-3xl w-full mx-auto pb-28 lg:pb-10">
            <AnimatePresence mode="wait">
              {view === 'home' && <HomeView outlets={outlets} onSelectOutlet={o => { setSelectedOutlet(o); setView('outlet'); }} searchQuery="" setSearchQuery={() => {}} blockFilter="All" setBlockFilter={() => {}} categoryFilter="All" setCategoryFilter={() => {}} />}
              {view === 'outlet' && selectedOutlet && <OutletDetailView outlet={selectedOutlet} menuItems={menuItems} onBack={() => setView('home')} onAddToCart={addToCart} />}
              {view === 'cart' && <CartView cart={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeItemFromCart} onCheckout={handleCheckout} onBack={() => setView('home')} />}
              {view === 'orders' && <OrdersView orders={orders} onReorder={o => reorder(o.items)} onBack={() => setView('home')} />}
              {view === 'profile' && <ProfileView profile={profile} user={null} onLogout={logout} onUpdateProfile={updateProfile} onSwitchView={setView} outlets={outlets} onAssignOutlet={assignOutlet} assignedOutlet={merchantOutlet || null} />}
              {view === 'merchant' && <MerchantView orders={merchantOrders} outlets={outlets} merchantOutlet={merchantOutlet || null} onUpdateStatus={updateOrderStatus} onSwitchView={setView} menu={merchantMenu} onSaveItem={item => saveMenuItem(item)} onDeleteItem={id => deleteMenuItem(id)} onToggleAvailability={toggleMenuItemAvailability} onSaveOutlet={saveOutlet} onAssignOutlet={assignOutlet} />}
              {view === 'merchant_menu' && <MerchantMenuView menu={merchantMenu} onToggleAvailability={toggleMenuItemAvailability} onSaveItem={item => saveMenuItem(item)} onDeleteItem={id => deleteMenuItem(id)} onBack={() => setView('merchant')} />}
              {view === 'support' && <SupportView tickets={supportTickets} onSubmitTicket={submitSupportTicket} onBack={() => setView('profile')} />}
              {view === 'kcoins' && <KCoinsView profile={profile} onBack={() => setView('profile')} />}
              {view === 'direct_pay' && <DirectPayView outlets={outlets} profile={profile} user={null} onSuccess={(amount, outletName) => showToast(`Paying Rs.${amount} to ${outletName}...`)} onBack={() => setView('home')} />}
              {view === 'transactions' && <TransactionHistoryView transactions={transactions} onBack={() => setView('profile')} />}
              {view === 'admin' && <AdminView allOrders={allOrders} outlets={outlets} onSeedData={seedCanteenData} isSeeding={isSeeding} onSaveOutlet={saveOutlet} onDeleteOutlet={deleteOutlet} onSaveMenuItem={(item, outletId) => saveMenuItem(item, outletId)} onDeleteMenuItem={(itemId, outletId) => deleteMenuItem(itemId, outletId)} />}
            </AnimatePresence>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={cn('fixed bottom-24 left-6 right-6 lg:bottom-6 lg:left-auto lg:right-8 lg:w-80 p-4 rounded-2xl shadow-lg z-[100] text-center font-bold text-sm', toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-crimson-dark/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-frosted rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-white/10">
              <div className="w-16 h-16 bg-klu-red/20 text-klu-red rounded-full flex items-center justify-center mx-auto mb-4 border border-klu-red/30">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-display text-xl font-black mb-2">Delete Order?</h3>
              <p className="text-white/40 mb-6 text-sm">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-4 bg-white/5 text-white/60 font-bold rounded-2xl">Cancel</button>
                <ClayButton onClick={() => deleteOrder(deleteConfirmId)} className="flex-1">Delete</ClayButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <Navigation activeView={view} onViewChange={setView} role={profile?.role || 'student'} cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)} />
      </div>
    </div>
  );
}
