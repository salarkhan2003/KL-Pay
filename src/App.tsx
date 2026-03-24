import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  supabase, rowToOutlet, rowToMenuItem, rowToOrder, rowToTransaction,
  rowToSupportTicket, upsertOutlet, deleteOutletDb, upsertMenuItem,
  deleteMenuItemDb, insertOrder, updateOrderStatusDb, deleteOrderDb,
  insertSupportTicket, updateProfileFields, awardKCoinsSupabase,
} from './supabase';
import { saveUserProfile, signOutUser, getMerchantOutletByCode } from './auth';
import {
  Trash2, UtensilsCrossed, LogOut,
} from 'lucide-react';
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

// ── Seed data ─────────────────────────────────────────────────────────────────
const FRIENDS_CANTEEN_ID = 'friends-canteen';
const TEST_CANTEEN_ID    = 'test-canteen';

const SEED_OUTLETS: Outlet[] = [
  {
    id: FRIENDS_CANTEEN_ID, name: "Friend's Canteen",
    description: 'Authentic biryani and SP Curry specials, freshly made every day.',
    imageUrl: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg',
    isOpen: true, merchantId: '', blockName: 'Tulip Hostel', category: 'Meals',
    upiId: 'friends.canteen@okaxis', timings: '7am – 10pm', rating: 4.7,
  },
  {
    id: TEST_CANTEEN_ID, name: 'Test Canteen',
    description: 'Dev testing canteen — Rs.1 items only.',
    imageUrl: 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',
    isOpen: true, merchantId: '', blockName: 'CSE', category: 'Snack',
    upiId: 'test.canteen@okaxis', timings: '24/7', rating: 5.0,
  },
];

const SEED_MENU: MenuItem[] = [
  {
    id: `${FRIENDS_CANTEEN_ID}_biryani`, outletId: FRIENDS_CANTEEN_ID, name: 'Biryani',
    description: 'Classic aromatic biryani with raita', price: 80,
    imageUrl: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg',
    category: 'Main', isAvailable: true, prepTime: '15m',
  },
  {
    id: `${FRIENDS_CANTEEN_ID}_sp_biryani`, outletId: FRIENDS_CANTEEN_ID, name: 'SP Curry Biryani',
    description: 'Special SP curry biryani — rich and spicy', price: 100,
    imageUrl: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/sp-biryani.jpeg',
    category: 'Main', isAvailable: true, prepTime: '20m',
  },
  {
    id: `${TEST_CANTEEN_ID}_chocolate`, outletId: TEST_CANTEEN_ID, name: 'Chocolate',
    description: 'Rs.1 test item for Cashfree payment testing', price: 1,
    imageUrl: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=400',
    category: 'Snack', isAvailable: true, prepTime: '1m',
  },
];

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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = session.user;
        const phone = localStorage.getItem('klone_phone') || '';
        localStorage.removeItem('klone_phone');
        try {
          const p = await saveUserProfile(u.id, u.email || '', phone);
          setProfile(p);
          if (p.role === 'merchant') setView('merchant');
          else if (p.role === 'admin') setView('admin');
        } catch (e) { console.warn('Profile load error:', e); }
      }
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        const phone = localStorage.getItem('klone_phone') || '';
        localStorage.removeItem('klone_phone');
        try {
          const p = await saveUserProfile(u.id, u.email || '', phone);
          setProfile(p);
          setIsSkipped(false);
          if (p.role === 'merchant') setView('merchant');
          else if (p.role === 'admin') setView('admin');
        } catch (e) { console.warn('Profile save error:', e); }
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
    const devProfile: UserProfile = {
      uid: `dev_${role}_${Date.now()}`,
      email: role === 'admin' ? 'salarkhanpatan7861@gmail.com' : `dev_${role}@kluniversity.in`,
      displayName: names[role], role,
      kCoins: role === 'student' ? 120 : 0, streak: role === 'student' ? 5 : 0,
      block: 'CSE', phone: '9999999999',
    };
    setProfile(devProfile);
    setIsSkipped(false);
    await seedCanteenData();
    setView(role === 'merchant' ? 'merchant' : role === 'admin' ? 'admin' : 'home');
  };

  const merchantCodeLogin = async (code: string): Promise<boolean> => {
    const outletId = getMerchantOutletByCode(code);
    if (!outletId) return false;
    const merchantProfile: UserProfile = {
      uid: `merchant_${outletId}_${Date.now()}`,
      email: `merchant_${outletId}@kluniversity.in`,
      displayName: outletId === FRIENDS_CANTEEN_ID ? "Friend's Canteen" : 'Test Canteen',
      role: 'merchant', kCoins: 0, streak: 0, block: 'CSE', merchantOutletId: outletId,
    };
    setProfile(merchantProfile);
    setIsSkipped(false);
    await seedCanteenData();
    setView('merchant');
    return true;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    await updateProfileFields(profile.uid, updates);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const assignOutlet = async (outletId: string) => {
    if (!profile) return;
    await supabase.from('outlets').update({ merchant_id: profile.uid }).eq('id', outletId);
    await updateProfile({ merchantOutletId: outletId });
  };

  // ── Seed canteens ─────────────────────────────────────────────────────────
  const seedCanteenData = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      for (const outlet of SEED_OUTLETS) await upsertOutlet(outlet);
      for (const item of SEED_MENU) await upsertMenuItem(item);
    } catch (e) { console.warn('seedCanteenData:', e); }
    finally { setIsSeeding(false); }
  };

  // ── Supabase realtime subscriptions ──────────────────────────────────────
  useEffect(() => {
    // Initial fetch + realtime for outlets
    const fetchOutlets = async () => {
      const { data } = await supabase.from('outlets').select('*').order('name');
      if (data) setOutlets(data.map(rowToOutlet));
    };
    fetchOutlets();

    const channel = supabase.channel('outlets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outlets' }, () => fetchOutlets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selectedOutlet) return;
    const fetchMenu = async () => {
      const { data } = await supabase.from('menu_items').select('*').eq('outlet_id', selectedOutlet.id).order('name');
      if (data) setMenuItems(data.map(rowToMenuItem));
    };
    fetchMenu();
    const channel = supabase.channel(`menu-${selectedOutlet.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${selectedOutlet.id}` }, () => fetchMenu())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedOutlet?.id]);

  useEffect(() => {
    if (!profile) return;
    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').eq('student_id', profile.uid).order('created_at', { ascending: false });
      if (data) setOrders(data.map(rowToOrder));
    };
    fetchOrders();
    const channel = supabase.channel(`orders-student-${profile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `student_id=eq.${profile.uid}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile || profile.role !== 'merchant') return;
    const outletId = profile.merchantOutletId || outlets.find(o => o.merchantId === profile.uid)?.id;
    if (!outletId) return;

    const fetchMerchantOrders = async () => {
      const { data } = await supabase.from('orders').select('*').eq('outlet_id', outletId).order('created_at', { ascending: false });
      if (data) setMerchantOrders(data.map(rowToOrder));
    };
    const fetchMerchantMenu = async () => {
      const { data } = await supabase.from('menu_items').select('*').eq('outlet_id', outletId).order('name');
      if (data) setMerchantMenu(data.map(rowToMenuItem));
    };
    fetchMerchantOrders();
    fetchMerchantMenu();

    const ordersChannel = supabase.channel(`merchant-orders-${outletId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${outletId}` }, () => fetchMerchantOrders())
      .subscribe();
    const menuChannel = supabase.channel(`merchant-menu-${outletId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${outletId}` }, () => fetchMerchantMenu())
      .subscribe();
    return () => { supabase.removeChannel(ordersChannel); supabase.removeChannel(menuChannel); };
  }, [profile?.uid, profile?.role, profile?.merchantOutletId, outlets]);

  useEffect(() => {
    if (!profile) return;
    const fetchTickets = async () => {
      const { data } = await supabase.from('support_tickets').select('*').eq('user_id', profile.uid).order('created_at', { ascending: false });
      if (data) setSupportTickets(data.map(rowToSupportTicket));
    };
    fetchTickets();
    const channel = supabase.channel(`support-${profile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${profile.uid}` }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile) return;
    const fetchTx = async () => {
      const { data } = await supabase.from('transactions').select('*').eq('student_id', profile.uid).order('created_at', { ascending: false });
      if (data) setTransactions(data.map(rowToTransaction));
    };
    fetchTx();
    const channel = supabase.channel(`tx-${profile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `student_id=eq.${profile.uid}` }, () => fetchTx())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.uid]);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const fetchAll = async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (data) setAllOrders(data.map(rowToOrder));
    };
    fetchAll();
    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.role]);

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
      } catch (err) { console.error('Payment confirmation error:', err); }
    })();
  }, [profile?.uid]);
