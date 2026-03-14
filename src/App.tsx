import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
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
  deleteDoc
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null, setAppError?: (msg: string | null) => void) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (setAppError) {
    setAppError(`Firestore Permission Denied: ${operationType} on ${path}`);
  }
  throw new Error(JSON.stringify(errInfo));
};
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  LogOut, 
  ChevronRight, 
  Plus, 
  Minus, 
  Search,
  QrCode,
  ArrowLeft,
  CreditCard,
  Store,
  User as UserIcon,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserProfile, Outlet, MenuItem, Order, OrderItem } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- UI Components ---

const GlassCard: React.FC<{ children: React.ReactNode, className?: string, delay?: number }> = ({ children, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={cn("liquid-glass rounded-3xl p-6 overflow-hidden", className)}
  >
    {children}
  </motion.div>
);

const ClayButton = ({ children, onClick, className, variant = 'primary', disabled = false }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'secondary' | 'danger' | 'emerald' | 'slate', disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "px-6 py-3 font-bold text-sm transition-all active:scale-95 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed",
      variant === 'primary' && "liquid-glass-blue",
      variant === 'secondary' && "bg-white text-blue-600 shadow-lg",
      variant === 'danger' && "bg-red-600 text-white shadow-lg shadow-red-200",
      variant === 'emerald' && "liquid-glass-emerald",
      variant === 'slate' && "liquid-glass-slate",
      className
    )}
  >
    {children}
  </button>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'outlet' | 'cart' | 'orders' | 'merchant' | 'profile'>('home');
  const [orderFilter, setOrderFilter] = useState<'active' | 'history'>('active');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [blockFilter, setBlockFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  
  // Data States
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchantOrders, setMerchantOrders] = useState<Order[]>([]);

  // --- Auth & Profile ---

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
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
              role: isAdmin ? 'admin' : 'student'
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
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

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
    if (!profile || profile.role !== 'merchant') return;
    
    // Listen for Merchant Orders (orders for their outlet)
    // In a real app, we'd fetch the outletId for this merchant first
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMerchantOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
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

  const addToCart = (item: MenuItem | OrderItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
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
          newCart.push({ ...item });
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

    // 1. Create Order in Firestore
    const orderData: Omit<Order, 'id'> = {
      studentId: user.uid,
      outletId: selectedOutlet.id,
      items: cart,
      totalAmount,
      convenienceFee,
      vendorAmount,
      status: 'pending',
      paymentStatus: 'paid', // Simulating successful UPI payment
      token: Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'orders', orderId), orderData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`, setAppError);
    }
      
    try {
      // 2. Call Backend for Split Settlement simulation
      await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          customerId: user.uid,
          orderId: orderId,
          outletId: selectedOutlet.id
        })
      });

      setCart([]);
      setSelectedOutlet(null);
      setView('orders');
    } catch (err) {
      console.error("Checkout failed:", err);
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
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
      />
    </div>
  );

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <CreditCard className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">KL Pay</h1>
        <p className="text-slate-600 mb-8">Premium Campus Dining Experience</p>
        <ClayButton onClick={login} className="w-64 py-4 text-lg">
          Sign in with KLU Email
        </ClayButton>
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative pb-24 font-sans">
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 z-50 bg-slate-50/80 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-medium text-slate-500">Welcome back,</h2>
          <h1 className="text-xl font-bold text-slate-900">{profile?.displayName}</h1>
        </div>
        <button onClick={logout} className="p-2 rounded-full bg-white shadow-sm text-slate-400 hover:text-red-500 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search for food or outlets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {blocks.map(block => (
                    <button
                      key={block}
                      onClick={() => setBlockFilter(block)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                        blockFilter === block ? "liquid-glass-blue shadow-md" : "bg-white text-slate-500"
                      )}
                    >
                      {block} Block
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                        categoryFilter === cat ? "liquid-glass-blue shadow-md" : "bg-white text-slate-500"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Campus Outlets</h3>
                <span className="text-slate-400 text-xs font-medium">{filteredOutlets.length} found</span>
              </div>

              <div className="grid gap-4">
                {filteredOutlets.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-slate-100">
                    <Store className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400">No outlets found matching your criteria.</p>
                    <ClayButton 
                      onClick={() => {
                        setSearchQuery('');
                        setBlockFilter('All');
                        setCategoryFilter('All');
                      }}
                      className="mt-4"
                    >
                      Clear all filters
                    </ClayButton>
                  </div>
                ) : (
                  filteredOutlets.map((outlet, idx) => (
                    <GlassCard 
                      key={outlet.id} 
                      delay={idx * 0.1}
                      className="cursor-pointer hover:scale-[1.02] transition-transform"
                    >
                      <div onClick={() => { setSelectedOutlet(outlet); setView('outlet'); }} className="flex gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-200 overflow-hidden flex-shrink-0">
                          <img src={outlet.imageUrl || `https://picsum.photos/seed/${outlet.id}/200`} alt={outlet.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-lg">{outlet.name}</h4>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                              {outlet.blockName}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-1">{outlet.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              outlet.isOpen ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                            )}>
                              {outlet.isOpen ? 'Open' : 'Closed'}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> 15-20 mins
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 self-center" />
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'outlet' && selectedOutlet && (
            <motion.div 
              key="outlet"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-500 font-medium">
                <ArrowLeft className="w-5 h-5" /> Back to Campus
              </button>

              <div className="relative h-48 rounded-3xl overflow-hidden shadow-lg">
                <img src={selectedOutlet.imageUrl || `https://picsum.photos/seed/${selectedOutlet.id}/400`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                  <h2 className="text-2xl font-bold text-white">{selectedOutlet.name}</h2>
                  <p className="text-white/80 text-sm">{selectedOutlet.description}</p>
                </div>
              </div>

              <div className="space-y-4 pb-24">
                <h3 className="text-lg font-bold">Menu</h3>
                {menuItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden">
                        <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100`} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold">{item.name}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-slate-500">₹{item.price}</p>
                          {item.prepTime && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-2 h-2" /> {item.prepTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {cart.find(i => i.id === item.id) ? (
                        <div className="flex items-center gap-3 bg-blue-50 rounded-full px-2 py-1">
                          <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-blue-600">{cart.find(i => i.id === item.id)?.quantity}</span>
                          <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full liquid-glass-blue shadow-sm flex items-center justify-center text-white">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(item)} className="w-10 h-10 rounded-full liquid-glass-blue text-white flex items-center justify-center shadow-lg">
                          <Plus className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <motion.div 
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  className="fixed bottom-28 left-6 right-6 z-40"
                >
                  <ClayButton 
                    onClick={() => setView('cart')}
                    className="w-full py-4 flex items-center justify-between px-8 shadow-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <span className="font-bold">{cart.length} Items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">₹{cartTotal}</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </ClayButton>
                </motion.div>
              )}
            </motion.div>
          )}

          {view === 'cart' && (
            <motion.div 
              key="cart"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Your Tray</h2>
              
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ChefHat className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400">Your tray is empty. Grab some food!</p>
                  <ClayButton onClick={() => setView('home')} variant="primary" className="mt-6">Browse Outlets</ClayButton>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
                        <div>
                          <h4 className="font-bold">{item.name}</h4>
                          <p className="text-sm text-slate-500">₹{item.price} x {item.quantity}</p>
                        </div>
                        <p className="font-bold text-blue-600">₹{item.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>

                  <GlassCard className="space-y-3">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>₹{cartTotal}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Convenience Fee</span>
                      <span>₹1</span>
                    </div>
                    <div className="pt-3 border-t border-white/20 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-blue-600">₹{cartTotal + 1}</span>
                    </div>
                  </GlassCard>

                  <ClayButton onClick={handleCheckout} className="w-full py-4 text-lg">
                    Pay via UPI (Cashfree)
                  </ClayButton>
                </>
              )}
            </motion.div>
          )}

          {view === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Orders</h2>
                <div className="flex gap-2 bg-white p-1 rounded-full shadow-sm">
                  <button 
                    onClick={() => setOrderFilter('active')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      orderFilter === 'active' ? "bg-blue-600 text-white shadow-md" : "text-slate-400"
                    )}
                  >
                    Active
                  </button>
                  <button 
                    onClick={() => setOrderFilter('history')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      orderFilter === 'history' ? "bg-blue-600 text-white shadow-md" : "text-slate-400"
                    )}
                  >
                    History
                  </button>
                </div>
              </div>
              
              {orders.filter(o => 
                orderFilter === 'active' 
                  ? ['pending', 'preparing', 'ready'].includes(o.status)
                  : ['picked_up', 'cancelled'].includes(o.status)
              ).length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400">No {orderFilter} orders found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders
                    .filter(o => 
                      orderFilter === 'active' 
                        ? ['pending', 'preparing', 'ready'].includes(o.status)
                        : ['picked_up', 'cancelled'].includes(o.status)
                    )
                    .map(order => (
                      <GlassCard key={order.id} className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-lg">Token: #{order.token}</h4>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">
                              {outlets.find(o => o.id === order.outletId)?.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Just now'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold uppercase",
                              order.status === 'pending' && "bg-amber-100 text-amber-600",
                              order.status === 'preparing' && "bg-blue-100 text-blue-600",
                              order.status === 'ready' && "bg-emerald-100 text-emerald-600",
                              order.status === 'picked_up' && "bg-slate-100 text-slate-600",
                              order.status === 'cancelled' && "bg-red-100 text-red-600"
                            )}>
                              {order.status.replace('_', ' ')}
                            </span>
                            {(order.status === 'pending' || orderFilter === 'history') && (
                              <button 
                                onClick={() => setDeleteConfirmId(order.id)}
                                className="text-red-500 p-1 hover:bg-red-50 rounded-full transition-colors"
                                title={order.status === 'pending' ? "Delete Pending Order" : "Delete Order from History"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {(order.status === 'picked_up' || order.status === 'cancelled') && (
                              <button 
                                onClick={() => reorder(order.items)}
                                className="text-blue-600 text-[10px] font-bold flex items-center gap-1 hover:underline"
                              >
                                <Plus className="w-3 h-3" /> Reorder
                              </button>
                            )}
                          </div>
                        </div>

                        {order.status !== 'picked_up' && order.status !== 'cancelled' && (
                          <div className="flex items-center justify-center p-4 bg-white rounded-2xl">
                            <QRCodeSVG value={order.id} size={120} />
                          </div>
                        )}

                        <div className="space-y-2">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-slate-600">{item.name} x {item.quantity}</span>
                              <span className="font-medium">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-white/20 flex justify-between items-center">
                          <span className="text-xs text-slate-400">Total: ₹{order.totalAmount}</span>
                          {order.status === 'ready' && (
                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                              <CheckCircle2 className="w-4 h-4" /> Ready for Pickup
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Profile & Settings</h2>
              
              <GlassCard className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-12 h-12 text-blue-500" />
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="w-full">
                  {isEditingName ? (
                    <div className="flex flex-col items-center gap-3">
                      <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter new name"
                        className="w-full max-w-[200px] px-4 py-2 bg-white rounded-xl shadow-inner border border-slate-200 text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <ClayButton 
                          onClick={handleSaveName}
                          className="px-4 py-1.5 text-xs"
                        >
                          Save
                        </ClayButton>
                        <ClayButton 
                          onClick={() => setIsEditingName(false)}
                          variant="secondary"
                          className="px-4 py-1.5 text-xs"
                        >
                          Cancel
                        </ClayButton>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold">{profile?.displayName}</h3>
                      <p className="text-slate-500 text-sm">{profile?.email}</p>
                    </>
                  )}
                  <span className="mt-2 inline-block px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    {profile?.role}
                  </span>
                </div>
              </GlassCard>

              <div className="space-y-4">
                <h3 className="text-lg font-bold">Account Settings</h3>
                <div className="bg-white rounded-3xl p-2 shadow-sm space-y-1">
                  <button 
                    onClick={() => {
                      setNewName(profile?.displayName || '');
                      setIsEditingName(true);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <span className="font-medium">Edit Profile</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>

                  {profile?.role === 'admin' && (
                    <button 
                      onClick={seedCampusData}
                      disabled={isSeeding}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          {isSeeding ? (
                            <motion.div 
                              animate={{ rotate: 360 }} 
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full"
                            />
                          ) : (
                            <Store className="w-5 h-5" />
                          )}
                        </div>
                        <span className="font-medium">{isSeeding ? 'Seeding...' : 'Seed Campus Data'}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                  )}
                  <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <span className="font-medium">Payment Methods</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <ChefHat className="w-5 h-5" />
                      </div>
                      <span className="font-medium">Merchant Mode</span>
                    </div>
                    <button 
                      onClick={() => updateProfile({ role: profile?.role === 'merchant' ? 'student' : 'merchant' })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        profile?.role === 'merchant' ? "bg-blue-600" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        profile?.role === 'merchant' ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold">Support</h3>
                <div className="bg-white rounded-3xl p-2 shadow-sm space-y-1">
                  <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                    <span className="font-medium">Help Center</span>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors text-red-500" onClick={logout}>
                    <span className="font-medium">Sign Out</span>
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'merchant' && (
            <motion.div 
              key="merchant"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Merchant Dashboard</h2>
                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">Live</span>
              </div>

              <div className="grid gap-4">
                {merchantOrders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-bold text-lg">Token: #{order.token}</h4>
                        <p className="text-sm text-slate-500">{order.items.length} items • ₹{order.vendorAmount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Order ID</p>
                        <p className="text-xs font-mono">{order.id.slice(-6)}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                      {order.items.map(item => (
                        <p key={item.id} className="text-sm font-medium">{item.quantity}x {item.name}</p>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <ClayButton onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-1">
                          Start Preparing
                        </ClayButton>
                      )}
                      {order.status === 'preparing' && (
                        <ClayButton onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1" variant="emerald">
                          Mark Ready
                        </ClayButton>
                      )}
                      {order.status === 'ready' && (
                        <ClayButton onClick={() => updateOrderStatus(order.id, 'picked_up')} className="flex-1" variant="slate">
                          Confirm Pickup
                        </ClayButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete Order?</h3>
              <p className="text-slate-500 mb-6 text-sm">
                This action cannot be undone. Are you sure you want to remove this order?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteOrder(deleteConfirmId)}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 glass rounded-full flex items-center justify-around px-4 shadow-2xl z-50">
        <button 
          onClick={() => setView('home')} 
          className={cn("p-3 rounded-full transition-all", view === 'home' ? "liquid-glass-blue shadow-lg scale-110" : "text-slate-400")}
        >
          <Store className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('orders')} 
          className={cn("p-3 rounded-full transition-all", view === 'orders' ? "liquid-glass-blue shadow-lg scale-110" : "text-slate-400")}
        >
          <Clock className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('cart')} 
          className={cn("p-3 rounded-full transition-all relative", view === 'cart' ? "liquid-glass-blue shadow-lg scale-110" : "text-slate-400")}
        >
          <ShoppingCart className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {cart.length}
            </span>
          )}
        </button>
        {profile?.role === 'merchant' && (
          <button 
            onClick={() => setView('merchant')} 
            className={cn("p-3 rounded-full transition-all", view === 'merchant' ? "liquid-glass-blue shadow-lg scale-110" : "text-slate-400")}
          >
            <ChefHat className="w-6 h-6" />
          </button>
        )}
        <button 
          onClick={() => setView('profile')} 
          className={cn("p-3 rounded-full transition-all", view === 'profile' ? "liquid-glass-blue shadow-lg scale-110" : "text-slate-400")}
        >
          <UserIcon className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
