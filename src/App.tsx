import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  getDocFromServer,
  deleteDoc,
  writeBatch,
  limit,
  increment
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signOut, 
  User,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  Store, 
  ShoppingCart, 
  Clock, 
  User as UserIcon, 
  Search, 
  ChevronRight, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  MapPin,
  Utensils,
  Star,
  Filter,
  LayoutDashboard,
  UtensilsCrossed,
  Settings,
  HelpCircle,
  LogOut,
  BarChart3,
  Users,
  Building2,
  QrCode,
  Phone,
  MessageSquare,
  TrendingUp,
  ChefHat,
  CreditCard,
  Trophy,
  Flame,
  Gift,
  Download,
  History,
  ScanLine,
  Archive,
  Bell,
  Shield
} from 'lucide-react';

import { UserProfile, Outlet, MenuItem, Order, OrderItem, SupportTicket, CartItem } from './types';
import { cn, handleFirestoreError, OperationType } from './utils';

// Theme Components
import { GlassCard } from './components/GlassCard';
import { ClayButton } from './components/ClayButton';
import { DynamicIsland } from './components/DynamicIsland';
import { Navigation } from './components/Navigation';

// Pages
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

// --- Main App ---

declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const [isSkipped, setIsSkipped] = useState(false);
  const [view, setView] = useState<string>('home');
  const [orderFilter, setOrderFilter] = useState<'active' | 'history'>('active');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [blockFilter, setBlockFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  // Data States
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchantOrders, setMerchantOrders] = useState<Order[]>([]);
  const [merchantMenu, setMerchantMenu] = useState<MenuItem[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // For Admin
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // --- Auth & Profile ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsSkipped(false); // Reset skip if logged in
        const docRef = doc(db, 'users', u.uid);
        try {
          const docSnap = await getDoc(docRef);
          
          const isAdmin = u.email?.toLowerCase() === 'salarkhanpatan7861@gmail.com';
          if (docSnap.exists()) {
            const existingProfile = docSnap.data() as UserProfile;
            if (isAdmin && existingProfile.role !== 'admin') {
              await updateDoc(docRef, { role: 'admin' });
              setProfile({ ...existingProfile, role: 'admin' });
            } else {
              setProfile(existingProfile);
            }
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'KLU Student',
              role: isAdmin ? 'admin' : 'student',
              kCoins: 0,
              streak: 0,
              block: 'CSE' // Default block
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`, setAppError);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(docRef, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`, setAppError);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await updateProfile({ displayName: newName });
    setIsEditingName(false);
  };

  // --- Real-time Data Listeners ---

  useEffect(() => {
    // Listen for Outlets
    const q = query(collection(db, 'outlets'));
    const unsub = onSnapshot(q, (snapshot) => {
      setOutlets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Outlet)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'outlets', setAppError);
    });
    return unsub;
  }, []);

  const [isSeeding, setIsSeeding] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const seedCampusData = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      console.log("Starting seeding process...");
      const vendorData = [
        // ... (data omitted for brevity, but I will keep it in the actual edit)
        {
          id: 'rice-spice',
          name: 'Rice & Spice',
          description: 'Biryanis, South Indian meals, Fried Rice.',
          blockName: 'EEE',
          category: 'Meals',
          upiId: 'rice.spice@okaxis',
          imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400',
          menu: [
            { name: 'Chicken Biryani', price: 120, category: 'Main', prepTime: '15m' },
            { name: 'Veg Fried Rice', price: 80, category: 'Main', prepTime: '10m' },
            { name: 'South Indian Meal', price: 100, category: 'Main', prepTime: '5m' }
          ]
        },
        {
          id: 'kl-adda',
          name: 'KL Adda',
          description: 'Burgers, Sandwiches, quick bites, Starters.',
          blockName: 'CSE',
          category: 'Bakery',
          upiId: 'kladda@okicici',
          imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400',
          menu: [
            { name: 'Classic Burger', price: 90, category: 'Snack', prepTime: '12m' },
            { name: 'Club Sandwich', price: 70, category: 'Snack', prepTime: '8m' },
            { name: 'French Fries', price: 50, category: 'Snack', prepTime: '5m' }
          ]
        },
        {
          id: 'hidden-cafe',
          name: 'Hidden Cafe',
          description: 'Coffee, Continental snacks, Rooftop vibes.',
          blockName: 'CSE',
          category: 'Cafe',
          upiId: 'hiddencafe@okaxis',
          imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400',
          menu: [
            { name: 'Cappuccino', price: 60, category: 'Beverage', prepTime: '5m' },
            { name: 'Pasta Alfredo', price: 150, category: 'Main', prepTime: '15m' },
            { name: 'Garlic Bread', price: 80, category: 'Snack', prepTime: '10m' }
          ]
        },
        {
          id: 'nescafe-pp',
          name: 'Nescafe (P&P)',
          description: 'Coffee, Maggi, Shakes, Light snacks.',
          blockName: 'R&D',
          category: 'Cafe',
          upiId: 'nescafe@okicici',
          imageUrl: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?auto=format&fit=crop&w=400',
          menu: [
            { name: 'Hot Coffee', price: 40, category: 'Beverage', prepTime: '3m' },
            { name: 'Masala Maggi', price: 50, category: 'Snack', prepTime: '5m' },
            { name: 'Chocolate Shake', price: 70, category: 'Beverage', prepTime: '7m' }
          ]
        },
        {
          id: 'satish-canteen',
          name: 'Satish Canteen',
          description: 'Breakfast items, Meals, and Chai.',
          blockName: 'R&D',
          category: 'Meals',
          upiId: 'satish@okaxis',
          imageUrl: 'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',
          menu: [
            { name: 'Idli (2pcs)', price: 30, category: 'Breakfast', prepTime: '2m' },
            { name: 'Masala Dosa', price: 50, category: 'Breakfast', prepTime: '7m' },
            { name: 'Full Meal', price: 90, category: 'Main', prepTime: '5m' }
          ]
        },
        {
          id: 'cane-cane',
          name: 'Cane & Cane',
          description: 'Fresh Sugarcane juice and Fruit juices.',
          blockName: 'R&D',
          category: 'Juice',
          upiId: 'canecane@okicici',
          imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=400',
          menu: [
            { name: 'Sugarcane Juice', price: 30, category: 'Juice', prepTime: '3m' },
            { name: 'Orange Juice', price: 50, category: 'Juice', prepTime: '5m' },
            { name: 'Mixed Fruit Juice', price: 60, category: 'Juice', prepTime: '5m' }
          ]
        },
        {
          id: 'us-pizza',
          name: 'US Pizza',
          description: 'Pizzas, Garlic bread, and Pasta.',
          blockName: 'FED',
          category: 'Bakery',
          upiId: 'uspizza@okaxis',
          imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400',
          menu: [
            { name: 'Margherita Pizza', price: 199, category: 'Main', prepTime: '15m' },
            { name: 'Veggie Delight', price: 249, category: 'Main', prepTime: '15m' },
            { name: 'Garlic Bread Sticks', price: 99, category: 'Snack', prepTime: '10m' }
          ]
        },
        {
          id: 'sai-sahithya',
          name: 'Sai Sahithya',
          description: 'Daily meals and tiffins.',
          blockName: 'SDC',
          category: 'Meals',
          upiId: 'sahithya@okicici',
          imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400',
          menu: [
            { name: 'Veg Thali', price: 80, category: 'Main', prepTime: '5m' },
            { name: 'Puri Sabji', price: 40, category: 'Breakfast', prepTime: '5m' },
            { name: 'Curd Rice', price: 50, category: 'Main', prepTime: '3m' }
          ]
        },
        {
          id: 'sri-mithra',
          name: 'Sri Mithra Hospitality',
          description: 'Full meals and multi-cuisine options.',
          blockName: 'C',
          category: 'Meals',
          upiId: 'srimithra@okaxis',
          imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400',
          menu: [
            { name: 'North Indian Thali', price: 150, category: 'Main', prepTime: '10m' },
            { name: 'Veg Manchurian', price: 100, category: 'Snack', prepTime: '12m' },
            { name: 'Jeera Rice', price: 80, category: 'Main', prepTime: '8m' }
          ]
        },
        {
          id: 'naturals-to-go',
          name: 'Naturals to Go',
          description: 'Healthy juices and quick fruit salads.',
          blockName: 'C',
          category: 'Juice',
          upiId: 'naturals@okicici',
          imageUrl: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=400',
          menu: [
            { name: 'Fruit Salad', price: 60, category: 'Snack', prepTime: '5m' },
            { name: 'Watermelon Juice', price: 40, category: 'Juice', prepTime: '3m' },
            { name: 'Avocado Shake', price: 90, category: 'Beverage', prepTime: '7m' }
          ]
        }
      ];

      for (const vendor of vendorData) {
        const { menu, ...outletData } = vendor;
        try {
          await setDoc(doc(db, 'outlets', vendor.id), {
            ...outletData,
            isOpen: true,
            merchantId: user?.uid // For demo
          });
          
          for (const item of menu) {
            const itemId = `${vendor.id}_${item.name.toLowerCase().replace(/\s+/g, '_')}`;
            await setDoc(doc(db, 'outlets', vendor.id, 'menu', itemId), { 
              ...item, 
              outletId: vendor.id, 
              id: itemId, 
              isAvailable: true,
              imageUrl: `https://picsum.photos/seed/${item.name}/100`
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `outlets/${vendor.id}`, setAppError);
        }
      }
      console.log("Seeding completed successfully.");
      showToast("Campus data seeded successfully!");
    } catch (error) {
      console.error("Error seeding data:", error);
      showToast("Failed to seed data. Check console.", "error");
    } finally {
      setIsSeeding(false);
    }
  };


  useEffect(() => {
    const isAdmin = user?.email?.toLowerCase() === 'salarkhanpatan7861@gmail.com';
    if (outlets.length === 0 && (profile?.role === 'admin' || isAdmin)) {
      console.log("Seeding data for admin...");
      seedCampusData();
    }
  }, [outlets, profile, user]);


  useEffect(() => {
    if (!user) return;
    
    // Listen for Student Orders
    const q = query(
      collection(db, 'orders'), 
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders', setAppError);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!profile || profile.role !== 'merchant' || !user) return;
    
    // Find the outlet owned by this merchant
    const merchantOutlet = outlets.find(o => o.merchantId === user.uid);
    if (!merchantOutlet) return;

    // Listen for Merchant Orders (orders for their outlet)
    const q = query(
      collection(db, 'orders'),
      where('outletId', '==', merchantOutlet.id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMerchantOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders', setAppError);
    });
    return unsub;
  }, [profile, user, outlets]);

  // Fetch Merchant Menu
  useEffect(() => {
    if (!profile || profile.role !== 'merchant' || !user) return;

    const merchantOutlet = outlets.find(o => o.merchantId === user.uid);
    if (!merchantOutlet) return;

    const q = query(
      collection(db, `outlets/${merchantOutlet.id}/menu`),
      orderBy('name')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMerchantMenu(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `outlets/${merchantOutlet.id}/menu`, setAppError);
    });
    return unsub;
  }, [profile, user, outlets]);

  // Fetch Support Tickets
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'support'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setSupportTickets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support', setAppError);
    });
    return unsub;
  }, [user]);

  // Fetch All Orders (Admin only)
  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setAllOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders', setAppError);
    });
    return unsub;
  }, [profile]);

  useEffect(() => {
    if (!selectedOutlet) return;
    const q = query(collection(db, `outlets/${selectedOutlet.id}/menu`));
    const unsub = onSnapshot(q, (snapshot) => {
      setMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `outlets/${selectedOutlet.id}/menu`, setAppError);
    });
    return unsub;
  }, [selectedOutlet]);

  // --- Cart Logic ---

  const addToCart = (item: MenuItem | CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price: item.price, 
        quantity: 1,
        imageUrl: (item as MenuItem).imageUrl || (item as CartItem).imageUrl || ''
      }];
    });
  };

  const reorder = (orderItems: OrderItem[]) => {
    setCart(prev => {
      const newCart = [...prev];
      orderItems.forEach(item => {
        const existing = newCart.find(i => i.id === item.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          // For reorder, we might not have imageUrl, so we use a placeholder or fetch it
          newCart.push({ ...item, imageUrl: `https://picsum.photos/seed/${item.id}/100` });
        }
      });
      return newCart;
    });
    setView('cart');
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  };

  const removeItemFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const toggleMenuItemAvailability = async (itemId: string, isAvailable: boolean) => {
    const merchantOutlet = outlets.find(o => o.merchantId === user?.uid);
    if (!merchantOutlet) return;
    try {
      await updateDoc(doc(db, 'outlets', merchantOutlet.id, 'menu', itemId), {
        isAvailable
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `outlets/${merchantOutlet.id}/menu/${itemId}`, setAppError);
    }
  };

  const submitSupportTicket = async (subject: string, message: string) => {
    if (!user) return;
    try {
      const ticketId = Math.random().toString(36).substring(2, 15);
      const newTicket: SupportTicket = {
        id: ticketId,
        userId: user.uid,
        subject,
        message,
        status: 'open',
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'support', ticketId), newTicket);
      showToast('Support ticket submitted!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'support', setAppError);
      throw error;
    }
  };

  const filteredOutlets = useMemo(() => {
    return outlets.filter(outlet => {
      const matchesSearch = outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           outlet.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBlock = blockFilter === 'All' || outlet.blockName === blockFilter;
      const matchesCategory = categoryFilter === 'All' || outlet.category === categoryFilter;
      return matchesSearch && matchesBlock && matchesCategory;
    });
  }, [outlets, searchQuery, blockFilter, categoryFilter]);

  const blocks = useMemo(() => ['All', ...new Set(outlets.map(o => o.blockName))], [outlets]);
  const categories = useMemo(() => ['All', ...new Set(outlets.map(o => o.category))], [outlets]);

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);

  // --- Checkout Logic ---

  const handleCheckout = async () => {
    if (!user || !selectedOutlet || cart.length === 0) return;

    const orderId = `KLP_${Date.now()}`;
    const convenienceFee = 1;
    const totalAmount = cartTotal + convenienceFee;
    const vendorAmount = cartTotal;

    try {
      // 1. Create Payment Session in Backend
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          customerId: user.uid,
          orderId: orderId,
          customerEmail: user.email,
          customerName: profile?.displayName || user.displayName,
          customerPhone: "9999999999" // Fallback or get from profile
        })
      });

      const sessionData = await response.json();
      
      if (!sessionData.payment_session_id) {
        throw new Error("Failed to create payment session");
      }

      // 2. Initialize Cashfree
      const cashfree = new window.Cashfree({
        mode: "production" // or "sandbox"
      });

      // 3. Open Checkout
      await cashfree.checkout({
        paymentSessionId: sessionData.payment_session_id,
        redirectTarget: "_self" 
      });

      // Note: The actual order creation in Firestore should ideally happen 
      // after payment verification via webhook or return URL.
      // For this demo, we'll assume the user will be redirected back.
      
      const orderData: Omit<Order, 'id'> = {
        studentId: user.uid,
        outletId: selectedOutlet.id,
        items: cart,
        totalAmount,
        convenienceFee,
        vendorAmount,
        status: 'pending',
        paymentStatus: 'unpaid', // Initially unpaid
        token: Math.floor(1000 + Math.random() * 9000).toString(),
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'orders', orderId), orderData);
      
      // Clear cart
      setCart([]);
      setSelectedOutlet(null);

    } catch (err) {
      console.error("Checkout failed:", err);
      showToast("Payment initialization failed", "error");
    }
  };

  // --- Merchant Actions ---

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`, setAppError);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      showToast("Order deleted successfully");
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`, setAppError);
    }
  };

  // --- Views ---

  if (appError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 rotate-45" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-slate-600 mb-6">{appError}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-crimson-dark overflow-hidden">
      <div className="relative">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 bg-klu-red rounded-full flex items-center justify-center z-10 relative shadow-[0_0_40px_rgba(200,16,46,0.6)]"
        >
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </motion.div>
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            className="absolute inset-0 border-2 border-klu-red rounded-full"
          />
        ))}
      </div>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-12 text-display text-4xl font-black text-white tracking-tighter"
      >
        KL ONE
      </motion.h1>
    </div>
  );

  if (!user && !isSkipped) return <LoginPage onSkip={() => setIsSkipped(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-crimson-dark relative pb-24 font-sans selection:bg-klu-red selection:text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[-20%] w-[80%] h-[80%] radial-glow opacity-10" />
        <div className="absolute bottom-[10%] left-[-20%] w-[80%] h-[80%] radial-glow opacity-10" />
      </div>

      <DynamicIsland />

      {/* Header */}
      <header className="p-8 pt-16 flex items-center justify-between sticky top-0 z-50 bg-crimson-dark/60 backdrop-blur-xl">
        <div>
          <h2 className="text-[10px] font-black text-klu-red uppercase tracking-[0.2em] mb-1">Welcome back</h2>
          <h1 className="text-2xl font-black text-white tracking-tight">{profile?.displayName}</h1>
        </div>
        <button onClick={logout} className="w-12 h-12 rounded-2xl glass-frosted flex items-center justify-center text-white/60 hover:text-klu-red transition-all active:scale-90">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <HomeView 
              outlets={outlets}
              onSelectOutlet={(outlet) => { setSelectedOutlet(outlet); setView('outlet'); }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              blockFilter={blockFilter}
              setBlockFilter={setBlockFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
            />
          )}

          {view === 'outlet' && selectedOutlet && (
            <OutletDetailView 
              outlet={selectedOutlet}
              menuItems={menuItems}
              onBack={() => setView('home')}
              onAddToCart={addToCart}
            />
          )}

          {view === 'cart' && (
            <CartView 
              cart={cart}
              onUpdateQuantity={updateCartQuantity}
              onRemove={removeItemFromCart}
              onCheckout={handleCheckout}
            />
          )}

          {view === 'orders' && (
            <OrdersView 
              orders={orders}
              onReorder={(order) => reorder(order.items)}
            />
          )}

          {view === 'profile' && (
            <ProfileView 
              profile={profile}
              user={user}
              onLogout={logout}
              onUpdateProfile={updateProfile}
              onSwitchView={setView}
            />
          )}

          {view === 'merchant' && (
            <MerchantView 
              orders={merchantOrders}
              onUpdateStatus={updateOrderStatus}
              onSwitchView={setView}
            />
          )}

          {view === 'merchant_menu' && (
            <MerchantMenuView 
              menu={merchantMenu}
              onToggleAvailability={toggleMenuItemAvailability}
            />
          )}

          {view === 'support' && (
            <SupportView 
              tickets={supportTickets}
              onSubmitTicket={submitSupportTicket}
            />
          )}

          {view === 'admin' && (
            <AdminView 
              allOrders={allOrders}
              outlets={outlets}
              onSeedData={seedCampusData}
              isSeeding={isSeeding}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-24 left-6 right-6 p-4 rounded-2xl shadow-lg z-[100] text-center font-bold text-sm",
              toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-crimson-dark/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-frosted rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-white/10"
            >
              <div className="w-16 h-16 bg-klu-red/20 text-klu-red rounded-full flex items-center justify-center mx-auto mb-4 border border-klu-red/30">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-display text-xl font-black mb-2">Delete Order?</h3>
              <p className="text-white/40 mb-6 text-sm font-medium">
                This action cannot be undone. Are you sure you want to remove this order?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 bg-white/5 text-white/60 font-bold rounded-2xl hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <ClayButton 
                  onClick={() => deleteOrder(deleteConfirmId)}
                  className="flex-1"
                >
                  Delete
                </ClayButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Navigation 
        activeView={view} 
        onViewChange={setView} 
        role={profile?.role || 'student'} 
      />
    </div>
  );
}
