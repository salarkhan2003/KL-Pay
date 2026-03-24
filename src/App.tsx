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
import { confirmPayment, awardKCoins, PLATFORM_FEE } from './paymentEngine';

declare global { interface Window { Cashfree: any; } }

const FRIENDS_ID = 'friends-canteen';
const TEST_ID    = 'test-canteen';

const SEED_OUTLETS = [
  { id: FRIENDS_ID, name: "Friend's Canteen", description: 'Authentic biryani and SP Curry specials.', image_url: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg', is_open: true, merchant_id: '', block_name: 'Tulip Hostel', category: 'Meals', upi_id: 'friends.canteen@okaxis', timings: '7am – 10pm', rating: 4.7 },
  { id: TEST_ID,    name: 'Test Canteen',      description: 'Dev testing — Rs.1 items only.',          image_url: 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400', is_open: true, merchant_id: '', block_name: 'CSE', category: 'Snack', upi_id: 'test.canteen@okaxis', timings: '24/7', rating: 5.0 },
];

const SEED_MENU = [
  { id: `${FRIENDS_ID}_biryani`,    outlet_id: FRIENDS_ID, name: 'Biryani',          description: 'Classic aromatic biryani with raita',          price: 80,  image_url: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg', category: 'Main',  is_available: true, prep_time: '15m' },
  { id: `${FRIENDS_ID}_sp_biryani`, outlet_id: FRIENDS_ID, name: 'SP Curry Biryani', description: 'Special SP curry biryani — rich and spicy',      price: 100, image_url: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/sp-biryani.jpeg',    category: 'Main',  is_available: true, prep_time: '20m' },
  { id: `${TEST_ID}_chocolate`,     outlet_id: TEST_ID,    name: 'Chocolate',         description: 'Rs.1 test item for Cashfree payment testing',   price: 1,   image_url: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=400',  category: 'Snack', is_available: true, prep_time: '1m'  },
];

async function ensureCanteensSeeded() {
  try {
    for (const o of SEED_OUTLETS) await upsertOutlet(o);
    for (const m of SEED_MENU) await upsertMenuItem(m);
  } catch (e: any) {
    // Tables don't exist yet — user needs to run the SQL migration
    if (e?.code === 'PGRST205' || e?.message?.includes('schema cache')) return;
    console.warn('seed:', e);
  }
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
  const [outlets, setOutlets] = useState<Outlet[]>([]);
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

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const p = await saveUserProfile(session.user.id, session.user.email || '', '', {});
          setProfile(p);
          if (p.role === 'merchant') setView('merchant');
          else if (p.role === 'admin') setView('admin');
        } catch (e) { console.warn('Profile load:', e); }
      }
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const p = await saveUserProfile(session.user.id, session.user.email || '', '', {});
          setProfile(p); setIsSkipped(false);
          if (p.role === 'merchant') setView('merchant');
          else if (p.role === 'admin') setView('admin');
        } catch (e) { console.warn('Profile save:', e); }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null); setIsSkipped(false); setView('home'); setCart([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    setProfile(null); setIsSkipped(false); setView('home'); setCart([]);
    await signOutUser().catch(() => {});
  };

  const devLogin = async (role: 'student' | 'merchant' | 'admin') => {
    const names = { student: 'Test Student', merchant: 'Test Merchant', admin: 'Salar Khan (Admin)' };
    const p: UserProfile = { uid: `dev_${role}_${Date.now()}`, email: role === 'admin' ? 'salarkhanpatan7861@gmail.com' : `dev_${role}@kluniversity.in`, displayName: names[role], role, kCoins: role === 'student' ? 120 : 0, streak: role === 'student' ? 5 : 0, block: 'CSE', phone: '9999999999' };
    setProfile(p); setIsSkipped(false);
    await ensureCanteensSeeded();
    setView(role === 'merchant' ? 'merchant' : role === 'admin' ? 'admin' : 'home');
  };

  const merchantCodeLogin = async (code: string): Promise<boolean> => {
    const outletId = getMerchantOutletByCode(code);
    if (!outletId) return false;
    const p: UserProfile = { uid: `merchant_${outletId}_${Date.now()}`, email: `merchant_${outletId}@kluniversity.in`, displayName: outletId === FRIENDS_ID ? "Friend's Canteen" : 'Test Canteen', role: 'merchant', kCoins: 0, streak: 0, block: 'CSE', merchantOutletId: outletId };
    setProfile(p); setIsSkipped(false);
    await ensureCanteensSeeded();
    setView('merchant');
    return true;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const fieldMap: Record<string, string> = { displayName: 'display_name', phone: 'phone', kCoins: 'k_coins', streak: 'streak', merchantOutletId: 'merchant_outlet_id' };
    const dbUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) { if (fieldMap[k]) dbUpdates[fieldMap[k]] = v; }
    if (Object.keys(dbUpdates).length) await updateProfileFields(profile.uid, dbUpdates);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const assignOutlet = async (outletId: string) => {
    if (!profile) return;
    await supabase.from('outlets').update({ merchant_id: profile.uid }).eq('id', outletId);
    await updateProfile({ merchantOutletId: outletId });
  };

  // ── Seed canteens ─────────────────────────────────────────────────────────
  const seedCanteenData = async () => {
    setIsSeeding(true);
    await ensureCanteensSeeded();
    setIsSeeding(false);
  };

  // ── Supabase realtime listeners ───────────────────────────────────────────
  useEffect(() => {
    const loadOutlets = async () => {
      const { data, error } = await supabase.from('outlets').select('*');
      if (error) {
        // Table doesn't exist — show setup banner, don't crash
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          setDbMissing(true);
        }
        return;
      }
      setDbMissing(false);
      if (data && data.length > 0) {
        setOutlets(data.map(rowToOutlet));
      } else {
        await ensureCanteensSeeded();
        const { data: seeded } = await supabase.from('outlets').select('*');
        if (seeded) setOutlets(seeded.map(rowToOutlet));
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
    supabase.from('menu_items').select('*').eq('outlet_id', selectedOutlet.id).then(({ data }) => { if (data) setMenuItems(data.map(rowToMenuItem)); });
    const ch = supabase.channel(`menu_view_${selectedOutlet.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${selectedOutlet.id}` }, () => {
      supabase.from('menu_items').select('*').eq('outlet_id', selectedOutlet.id).then(({ data }) => { if (data) setMenuItems(data.map(rowToMenuItem)); });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedOutlet?.id]);

  // Handle Cashfree return URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id') || params.get('dp_order_id');
    if (!orderId || !profile) return;
    (async () => {
      try {
        const kCoins = await confirmPayment(orderId, orderId);
        await awardKCoins(profile.uid, kCoins);
        setProfile(prev => prev ? { ...prev, kCoins: (prev.kCoins || 0) + kCoins } : prev);
        showToast(`Payment confirmed! +${kCoins} K-Coins earned`);
        window.history.replaceState({}, document.title, window.location.pathname);
        setView('transactions');
      } catch (err) { console.error('Payment confirmation:', err); }
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
        body: JSON.stringify({ amount: totalAmount, customerId: profile.uid, orderId, customerEmail: profile.email, customerName: profile.displayName, customerPhone: profile.phone || '9999999999', merchantVpa: selectedOutlet.upiId, outletName: selectedOutlet.name }),
      });
      const sessionData = await res.json();
      if (!sessionData.payment_session_id) throw new Error(sessionData.error || 'Session creation failed');

      await insertOrder({ id: orderId, student_id: profile.uid, outlet_id: selectedOutlet.id, user_name: profile.displayName, user_phone: profile.phone || '', items: cart, total_amount: totalAmount, convenience_fee: PLATFORM_FEE, vendor_amount: cartTotal, status: 'pending', payment_status: 'unpaid', token, created_at: new Date().toISOString() });

      const cashfree = new window.Cashfree({ mode: 'production' });
      await cashfree.checkout({ paymentSessionId: sessionData.payment_session_id, redirectTarget: '_self' });
      setCart([]); setSelectedOutlet(null);
    } catch (err) { console.error('Checkout:', err); showToast('Payment initialization failed', 'error'); }
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
    await upsertOutlet({ id, name: data.name, description: data.description || '', image_url: data.imageUrl || 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400', is_open: data.isOpen ?? true, merchant_id: data.merchantId || profile?.uid || '', block_name: data.blockName || 'CSE', category: data.category || 'Meals', upi_id: data.upiId || '', timings: data.timings || '8am – 9pm', rating: data.rating || 4.0 });
    showToast(data.id ? 'Outlet updated' : 'Outlet added');
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

  if (dbMissing) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-crimson-dark p-8 text-center">
      <div className="w-20 h-20 rounded-[28px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
        <UtensilsCrossed className="w-10 h-10 text-amber-400" />
      </div>
      <h1 className="text-display text-3xl font-black text-white mb-2">Database Setup Required</h1>
      <p className="text-white/40 text-sm mb-6 max-w-sm">
        The Supabase tables don't exist yet. Run the SQL migration to create them.
      </p>
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-4 text-left mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Steps</p>
        <ol className="space-y-2 text-sm text-white/60">
          <li className="flex gap-2"><span className="text-klu-red font-black">1.</span> Open <span className="text-white font-bold">Supabase Dashboard</span></li>
          <li className="flex gap-2"><span className="text-klu-red font-black">2.</span> Go to <span className="text-white font-bold">SQL Editor → New Query</span></li>
          <li className="flex gap-2"><span className="text-klu-red font-black">3.</span> Paste & run <span className="text-white font-bold">scripts/create-tables.sql</span></li>
          <li className="flex gap-2"><span className="text-klu-red font-black">4.</span> Refresh this page</li>
        </ol>
      </div>
      <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
        className="px-6 py-3 bg-klu-red rounded-2xl text-white font-black text-sm shadow-lg shadow-klu-red/30">
        Open Supabase Dashboard →
      </a>
    </div>
  );

  if (!profile && !isSkipped) return (
    <LoginPage
      onSkip={() => setIsSkipped(true)}
      onMagicLinkComplete={async (uid, email, phone) => {
        const p = await saveUserProfile(uid, email, phone, {});
        setProfile(p);
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
          <main className="flex-1 p-6 lg:p-10 max-w-3xl w-full mx-auto pb-28 lg:pb-10">
            <AnimatePresence mode="wait">
              {view === 'home' && <HomeView outlets={outlets} onSelectOutlet={o => { setSelectedOutlet(o); setView('outlet'); }} searchQuery="" setSearchQuery={() => {}} blockFilter="All" setBlockFilter={() => {}} categoryFilter="All" setCategoryFilter={() => {}} />}
              {view === 'outlet' && selectedOutlet && <OutletDetailView outlet={selectedOutlet} menuItems={menuItems} onBack={() => setView('home')} onAddToCart={addToCart} />}
              {view === 'cart' && <CartView cart={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeItemFromCart} onCheckout={handleCheckout} onBack={() => setView('home')} />}
              {view === 'orders' && <OrdersView orders={orders} onReorder={o => reorder(o.items)} onBack={() => setView('home')} />}
              {view === 'profile' && <ProfileView profile={profile} user={null} onLogout={logout} onUpdateProfile={updateProfile} onSwitchView={setView} outlets={outlets} onAssignOutlet={assignOutlet} assignedOutlet={merchantOutlet || null} />}
              {view === 'merchant' && <MerchantView orders={merchantOrders} outlets={outlets} merchantOutlet={merchantOutlet || null} onUpdateStatus={updateOrderStatus} onSwitchView={setView} menu={merchantMenu} onSaveItem={item => saveMenuItem(item)} onDeleteItem={id => deleteMenuItem(id)} onToggleAvailability={toggleMenuItemAvailability} onSaveOutlet={saveOutlet} />}
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
