import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection, doc, onSnapshot, setDoc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp, deleteDoc, increment
} from 'firebase/firestore';
import { db } from './firebase';
import { supabase } from './supabase';
import { saveUserProfile, signOutUser, getMerchantOutletByCode } from './auth';
import { Trash2, UtensilsCrossed, LogOut } from 'lucide-react';
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

const SEED_OUTLETS: Omit<Outlet, 'merchantId'>[] = [
  { id: FRIENDS_ID, name: "Friend's Canteen", description: 'Authentic biryani and SP Curry specials.',
    imageUrl: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg',
    isOpen: true, blockName: 'Tulip Hostel', category: 'Meals', upiId: 'friends.canteen@okaxis', timings: '7am – 10pm', rating: 4.7 },
  { id: TEST_ID, name: 'Test Canteen', description: 'Dev testing — Rs.1 items only.',
    imageUrl: 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',
    isOpen: true, blockName: 'CSE', category: 'Snack', upiId: 'test.canteen@okaxis', timings: '24/7', rating: 5.0 },
];

const SEED_MENU: MenuItem[] = [
  { id: `${FRIENDS_ID}_biryani`, outletId: FRIENDS_ID, name: 'Biryani', description: 'Classic aromatic biryani with raita',
    price: 80, imageUrl: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg',
    category: 'Main', isAvailable: true, prepTime: '15m' },
  { id: `${FRIENDS_ID}_sp_biryani`, outletId: FRIENDS_ID, name: 'SP Curry Biryani', description: 'Special SP curry biryani — rich and spicy',
    price: 100, imageUrl: 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/sp-biryani.jpeg',
    category: 'Main', isAvailable: true, prepTime: '20m' },
  { id: `${TEST_ID}_chocolate`, outletId: TEST_ID, name: 'Chocolate', description: 'Rs.1 test item for Cashfree testing',
    price: 1, imageUrl: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=400',
    category: 'Snack', isAvailable: true, prepTime: '1m' },
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

  // ── Supabase auth ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = session.user;
        const phone = localStorage.getItem('klone_phone') || '';
        localStorage.removeItem('klone_phone');
        try {
          const p = await saveUserProfile(u.id, u.email || '', phone, 'salarkhanpatan7861@gmail.com');
          setProfile(p);
          if (p.role === 'merchant') setView('merchant');
          else if (p.role === 'admin') setView('admin');
        } catch (e) { console.warn('Profile load:', e); }
      }
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        const phone = localStorage.getItem('klone_phone') || '';
        localStorage.removeItem('klone_phone');
        try {
          const p = await saveUserProfile(u.id, u.email || '', phone, 'salarkhanpatan7861@gmail.com');
          setProfile(p);
          setIsSkipped(false);
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
    const p: UserProfile = {
      uid: `dev_${role}_${Date.now()}`,
      email: role === 'admin' ? 'salarkhanpatan7861@gmail.com' : `dev_${role}@kluniversity.in`,
      displayName: names[role], role, kCoins: role === 'student' ? 120 : 0,
      streak: role === 'student' ? 5 : 0, block: 'CSE', phone: '9999999999',
    };
    setProfile(p);
    setIsSkipped(false);
    await seedCanteenData(p.uid);
    setView(role === 'merchant' ? 'merchant' : role === 'admin' ? 'admin' : 'home');
  };

  const merchantCodeLogin = async (code: string): Promise<boolean> => {
    const outletId = getMerchantOutletByCode(code);
    if (!outletId) return false;
    const p: UserProfile = {
      uid: `merchant_${outletId}_${Date.now()}`,
      email: `merchant_${outletId}@kluniversity.in`,
      displayName: outletId === FRIENDS_ID ? "Friend's Canteen" : 'Test Canteen',
      role: 'merchant', kCoins: 0, streak: 0, block: 'CSE', merchantOutletId: outletId,
    };
    setProfile(p);
    setIsSkipped(false);
    await seedCanteenData(p.uid);
    setView('merchant');
    return true;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (e) { console.warn('updateProfile:', e); }
  };

  const assignOutlet = async (outletId: string) => {
    if (!profile) return;
    await updateDoc(doc(db, 'outlets', outletId), { merchantId: profile.uid }).catch(console.warn);
    await updateProfile({ merchantOutletId: outletId });
  };

  // ── Seed canteens ─────────────────────────────────────────────────────────
  const seedCanteenData = async (uid?: string) => {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      for (const outlet of SEED_OUTLETS) {
        await setDoc(doc(db, 'outlets', outlet.id), { ...outlet, merchantId: uid || '' }, { merge: true });
      }
      for (const item of SEED_MENU) {
        await setDoc(doc(db, 'outlets', item.outletId, 'menu', item.id), item, { merge: true });
      }
    } catch (e) { console.warn('seedCanteenData:', e); }
    finally { setIsSeeding(false); }
  };

  // ── Firestore listeners ───────────────────────────────────────────────────
  useEffect(() => {
    return onSnapshot(query(collection(db, 'outlets')),
      snap => setOutlets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Outlet))),
      err => console.warn('outlets:', err.code));
  }, []);

  useEffect(() => {
    if (!profile) return;
    return onSnapshot(
      query(collection(db, 'orders'), where('studentId', '==', profile.uid), orderBy('createdAt', 'desc')),
      snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))),
      err => console.warn('orders:', err.code));
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile || profile.role !== 'merchant') return;
    const outletId = profile.merchantOutletId || outlets.find(o => o.merchantId === profile.uid)?.id;
    if (!outletId) return;
    return onSnapshot(
      query(collection(db, 'orders'), where('outletId', '==', outletId), orderBy('createdAt', 'desc')),
      snap => setMerchantOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))),
      err => console.warn('merchantOrders:', err.code));
  }, [profile?.uid, profile?.role, profile?.merchantOutletId, outlets.length]);

  useEffect(() => {
    if (!profile || profile.role !== 'merchant') return;
    const outletId = profile.merchantOutletId || outlets.find(o => o.merchantId === profile.uid)?.id;
    if (!outletId) return;
    return onSnapshot(
      query(collection(db, `outlets/${outletId}/menu`), orderBy('name')),
      snap => setMerchantMenu(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem))),
      err => console.warn('merchantMenu:', err.code));
  }, [profile?.uid, profile?.role, profile?.merchantOutletId, outlets.length]);

  useEffect(() => {
    if (!profile) return;
    return onSnapshot(
      query(collection(db, 'support'), where('userId', '==', profile.uid), orderBy('createdAt', 'desc')),
      snap => setSupportTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket))),
      err => console.warn('support:', err.code));
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile) return;
    return onSnapshot(
      query(collection(db, 'transactions'), where('studentId', '==', profile.uid), orderBy('createdAt', 'desc')),
      snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))),
      err => console.warn('transactions:', err.code));
  }, [profile?.uid]);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    return onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      snap => setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))),
      err => console.warn('allOrders:', err.code));
  }, [profile?.role]);

  useEffect(() => {
    if (!selectedOutlet) return;
    return onSnapshot(
      query(collection(db, `outlets/${selectedOutlet.id}/menu`)),
      snap => setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem))),
      err => console.warn('menuItems:', err.code));
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
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, imageUrl: (item as any).imageUrl || '' }];
    });
  };

  const reorder = (items: OrderItem[]) => {
    setCart(prev => {
      const next = [...prev];
      items.forEach(item => {
        const ex = next.find(i => i.id === item.id);
        if (ex) ex.quantity += item.quantity;
        else next.push({ ...item, imageUrl: `https://picsum.photos/seed/${item.id}/100` });
      });
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
    try {
      const res = await fetch('/api/payments/create-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount, customerId: profile.uid, orderId,
          customerEmail: profile.email, customerName: profile.displayName,
          customerPhone: profile.phone || '9999999999',
          merchantVpa: selectedOutlet.upiId, outletName: selectedOutlet.name,
        }),
      });
      const sessionData = await res.json();
      if (!sessionData.payment_session_id) throw new Error(sessionData.error || 'Session creation failed');

      const token = Math.floor(1000 + Math.random() * 9000).toString();
      await setDoc(doc(db, 'orders', orderId), {
        studentId: profile.uid, outletId: selectedOutlet.id,
        userName: profile.displayName, userPhone: profile.phone || '',
        items: cart, totalAmount, convenienceFee: PLATFORM_FEE,
        vendorAmount: cartTotal, status: 'pending', paymentStatus: 'unpaid',
        token, createdAt: serverTimestamp(),
      });

      const cashfree = new window.Cashfree({ mode: 'production' });
      await cashfree.checkout({ paymentSessionId: sessionData.payment_session_id, redirectTarget: '_self' });
      setCart([]); setSelectedOutlet(null);
    } catch (err) {
      console.error('Checkout failed:', err);
      showToast('Payment initialization failed', 'error');
    }
  };

  // ── Merchant / Admin helpers ──────────────────────────────────────────────
  const getMerchantOutlet = (override?: string) =>
    override ? outlets.find(o => o.id === override)
      : outlets.find(o => o.merchantId === profile?.uid)
          || (profile?.merchantOutletId ? outlets.find(o => o.id === profile.merchantOutletId) : undefined);

  const toggleMenuItemAvailability = async (itemId: string, isAvailable: boolean) => {
    const outlet = getMerchantOutlet();
    if (!outlet) return;
    await updateDoc(doc(db, 'outlets', outlet.id, 'menu', itemId), { isAvailable }).catch(console.warn);
  };

  const saveMenuItem = async (item: Partial<MenuItem> & { name: string; price: number; category: string }, outletIdOverride?: string) => {
    const outlet = getMerchantOutlet(outletIdOverride);
    if (!outlet) { showToast('No outlet assigned', 'error'); return; }
    const itemId = item.id || `${outlet.id}_${item.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const data: MenuItem = {
      id: itemId, outletId: outlet.id, name: item.name, description: item.description || '',
      price: item.price, imageUrl: item.imageUrl || `https://picsum.photos/seed/${itemId}/100`,
      category: item.category, isAvailable: item.isAvailable ?? true, prepTime: item.prepTime || '10m',
    };
    await setDoc(doc(db, 'outlets', outlet.id, 'menu', itemId), data);
    showToast(item.id ? 'Item updated' : 'Item added');
  };

  const deleteMenuItem = async (itemId: string, outletIdOverride?: string) => {
    const outlet = getMerchantOutlet(outletIdOverride);
    if (!outlet) return;
    await deleteDoc(doc(db, 'outlets', outlet.id, 'menu', itemId)).catch(console.warn);
    showToast('Item deleted');
  };

  const saveOutlet = async (data: Partial<Outlet> & { name: string }) => {
    const id = data.id || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const outlet: Outlet = {
      id, name: data.name, description: data.description || '',
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',
      isOpen: data.isOpen ?? true, merchantId: data.merchantId || profile?.uid || '',
      blockName: data.blockName || 'CSE', category: data.category || 'Meals',
      upiId: data.upiId || '', timings: data.timings || '8am – 9pm', rating: data.rating || 4.0,
    };
    await setDoc(doc(db, 'outlets', id), outlet);
    showToast(data.id ? 'Outlet updated' : 'Outlet added');
  };

  const deleteOutlet = async (outletId: string) => {
    await deleteDoc(doc(db, 'outlets', outletId)).catch(console.warn);
    showToast('Outlet deleted');
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) =>
    updateDoc(doc(db, 'orders', orderId), { status }).catch(console.warn);

  const deleteOrder = async (orderId: string) => {
    await deleteDoc(doc(db, 'orders', orderId)).catch(console.warn);
    showToast('Order deleted');
    setDeleteConfirmId(null);
  };

  const submitSupportTicket = async (subject: string, message: string) => {
    if (!profile) return;
    const id = Math.random().toString(36).substring(2, 15);
    await setDoc(doc(db, 'support', id), { id, userId: profile.uid, subject, message, status: 'open', createdAt: serverTimestamp() });
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
        const p = await saveUserProfile(uid, email, phone, 'salarkhanpatan7861@gmail.com');
        setProfile(p);
      }}
      onDevLogin={devLogin}
      onMerchantCodeLogin={merchantCodeLogin}
    />
  );

  const merchantOutlet = outlets.find(o => o.merchantId === profile?.uid)
    || (profile?.merchantOutletId ? outlets.find(o => o.id === profile.merchantOutletId) || null : null);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-crimson-dark relative pb-24 font-sans selection:bg-klu-red selection:text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[-20%] w-[80%] h-[80%] radial-glow opacity-10" />
        <div className="absolute bottom-[10%] left-[-20%] w-[80%] h-[80%] radial-glow opacity-10" />
      </div>
      <DynamicIsland />
      <header className="p-8 pt-16 flex items-center justify-between sticky top-0 z-50 bg-crimson-dark/60 backdrop-blur-xl">
        <div>
          <h2 className="text-[10px] font-black text-klu-red uppercase tracking-[0.2em] mb-1">Welcome back</h2>
          <h1 className="text-2xl font-black text-white tracking-tight">{profile?.displayName || 'Guest'}</h1>
        </div>
        <button onClick={logout} className="w-12 h-12 rounded-2xl glass-frosted flex items-center justify-center text-white/60 hover:text-klu-red transition-all active:scale-90">
          <LogOut className="w-5 h-5" />
        </button>
      </header>
      <main className="p-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <HomeView outlets={outlets} onSelectOutlet={o => { setSelectedOutlet(o); setView('outlet'); }}
              searchQuery="" setSearchQuery={() => {}} blockFilter="All" setBlockFilter={() => {}}
              categoryFilter="All" setCategoryFilter={() => {}} />
          )}
          {view === 'outlet' && selectedOutlet && (
            <OutletDetailView outlet={selectedOutlet} menuItems={menuItems}
              onBack={() => setView('home')} onAddToCart={addToCart} />
          )}
          {view === 'cart' && (
            <CartView cart={cart} onUpdateQuantity={updateCartQuantity}
              onRemove={removeItemFromCart} onCheckout={handleCheckout} />
          )}
          {view === 'orders' && <OrdersView orders={orders} onReorder={o => reorder(o.items)} />}
          {view === 'profile' && (
            <ProfileView profile={profile} user={null} onLogout={logout}
              onUpdateProfile={updateProfile} onSwitchView={setView}
              outlets={outlets} onAssignOutlet={assignOutlet} assignedOutlet={merchantOutlet || null} />
          )}
          {view === 'merchant' && (
            <MerchantView orders={merchantOrders} outlets={outlets} merchantOutlet={merchantOutlet || null}
              onUpdateStatus={updateOrderStatus} onSwitchView={setView} />
          )}
          {view === 'merchant_menu' && (
            <MerchantMenuView menu={merchantMenu} onToggleAvailability={toggleMenuItemAvailability}
              onSaveItem={item => saveMenuItem(item)} onDeleteItem={id => deleteMenuItem(id)} />
          )}
          {view === 'support' && <SupportView tickets={supportTickets} onSubmitTicket={submitSupportTicket} />}
          {view === 'kcoins' && <KCoinsView profile={profile} />}
          {view === 'direct_pay' && (
            <DirectPayView outlets={outlets} profile={profile} user={null}
              onSuccess={(amount, outletName) => showToast(`Paying Rs.${amount} to ${outletName}...`)} />
          )}
          {view === 'transactions' && <TransactionHistoryView transactions={transactions} />}
          {view === 'admin' && (
            <AdminView allOrders={allOrders} outlets={outlets}
              onSeedData={() => seedCanteenData(profile?.uid)} isSeeding={isSeeding}
              onSaveOutlet={saveOutlet} onDeleteOutlet={deleteOutlet}
              onSaveMenuItem={(item, outletId) => saveMenuItem(item, outletId)}
              onDeleteMenuItem={(itemId, outletId) => deleteMenuItem(itemId, outletId)} />
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={cn('fixed bottom-24 left-6 right-6 p-4 rounded-2xl shadow-lg z-[100] text-center font-bold text-sm',
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
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
              <p className="text-white/40 mb-6 text-sm font-medium">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-4 bg-white/5 text-white/60 font-bold rounded-2xl">Cancel</button>
                <ClayButton onClick={() => deleteOrder(deleteConfirmId)} className="flex-1">Delete</ClayButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Navigation activeView={view} onViewChange={setView} role={profile?.role || 'student'}
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)} />
    </div>
  );
}
