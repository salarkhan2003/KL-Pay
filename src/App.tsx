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
  Trash2,
  BarChart3,
  TrendingUp,
  Users,
  Settings,
  HelpCircle,
  Trophy,
  Flame,
  Gift,
  Star,
  Download,
  History,
  MapPin,
  ScanLine,
  LayoutDashboard,
  Archive,
  Store as StoreIcon,
  AlertCircle,
  Shield,
  UtensilsCrossed,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserProfile, Outlet, MenuItem, Order, OrderItem, SupportTicket } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- UI Components ---

const GlassCard: React.FC<{ children: React.ReactNode, className?: string, delay?: number }> = ({ children, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
    className={cn("glass-frosted rounded-[32px] p-6 relative overflow-hidden", className)}
  >
    <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />
    {children}
  </motion.div>
);

const ClayButton = ({ children, onClick, className, variant = 'primary', disabled = false }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'secondary' | 'danger' | 'emerald' | 'slate', disabled?: boolean }) => (
  <button
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

const DynamicIsland = () => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200]">
    <motion.div 
      initial={{ width: 120, height: 36 }}
      animate={{ width: 140 }}
      className="bg-black rounded-full flex items-center justify-center px-4 gap-2 shadow-2xl border border-white/10"
    >
      <motion.div 
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-2 h-2 rounded-full bg-klu-red shadow-[0_0_8px_rgba(200,16,46,0.8)]"
      />
      <span className="text-[10px] font-bold tracking-widest uppercase text-white/60">KL ONE</span>
    </motion.div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'outlet' | 'cart' | 'orders' | 'merchant' | 'profile' | 'support' | 'admin' | 'merchant_archive' | 'merchant_profile' | 'merchant_menu'>('home');
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
  const [merchantMenu, setMerchantMenu] = useState<MenuItem[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // For Admin
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

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

  const submitTicket = async () => {
    if (!user || !supportSubject || !supportMessage) return;
    setIsSubmittingTicket(true);
    try {
      const ticketId = Math.random().toString(36).substring(2, 15);
      const newTicket: SupportTicket = {
        id: ticketId,
        userId: user.uid,
        subject: supportSubject,
        message: supportMessage,
        status: 'open',
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'support', ticketId), newTicket);
      setSupportSubject('');
      setSupportMessage('');
      setToast({ message: 'Support ticket submitted!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'support', setAppError);
    } finally {
      setIsSubmittingTicket(false);
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

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-crimson-dark relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] radial-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] radial-glow" />
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center z-10"
      >
        <div className="w-24 h-24 bg-klu-red rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_40px_rgba(200,16,46,0.4)]">
          <UtensilsCrossed className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-display text-6xl font-black text-white mb-4 leading-none">KL<br/>ONE</h1>
        <p className="text-white/50 mb-12 font-medium tracking-wide">Premium Campus Dining</p>
        <ClayButton onClick={login} className="w-72">
          Enter the Soul
        </ClayButton>
      </motion.div>
    </div>
  );

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
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input 
                  type="text" 
                  placeholder="Search for food or outlets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-5 bg-white/5 rounded-[24px] border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-klu-red/50 transition-all outline-none"
                />
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {blocks.map(block => (
                    <button
                      key={block}
                      onClick={() => setBlockFilter(block)}
                      className={cn(
                        "px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        blockFilter === block ? "clay-red shadow-lg" : "glass-frosted text-white/40"
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
                        "px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        categoryFilter === cat ? "clay-red shadow-lg" : "glass-frosted text-white/40"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-display text-lg font-black">Campus Outlets</h3>
                <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">{filteredOutlets.length} found</span>
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
                        <div className="w-20 h-20 rounded-2xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                          <img src={outlet.imageUrl || `https://picsum.photos/seed/${outlet.id}/200`} alt={outlet.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-display text-base font-black leading-tight">{outlet.name}</h4>
                            <span className="text-[8px] font-black text-klu-red bg-klu-red/10 border border-klu-red/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                              {outlet.blockName}
                            </span>
                          </div>
                          <p className="text-xs text-white/40 line-clamp-1 mt-1">{outlet.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em]",
                              outlet.isOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            )}>
                              {outlet.isOpen ? 'Open' : 'Closed'}
                            </span>
                            <div className="flex items-center gap-1 text-white/20 text-[8px] font-black">
                              <Star className="w-2.5 h-2.5 text-klu-red fill-klu-red" />
                              <span>4.5</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/10 self-center" />
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
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-white/40 font-medium">
                <ArrowLeft className="w-5 h-5" /> Back to Campus
              </button>

              <div className="relative h-56 rounded-[40px] overflow-hidden shadow-2xl border border-white/10">
                <img src={selectedOutlet.imageUrl || `https://picsum.photos/seed/${selectedOutlet.id}/400`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-crimson-dark/90 via-crimson-dark/40 to-transparent flex flex-col justify-end p-8">
                  <h2 className="text-display text-3xl font-black text-white">{selectedOutlet.name}</h2>
                  <p className="text-white/60 text-sm font-medium">{selectedOutlet.description}</p>
                </div>
              </div>

              <div className="space-y-4 pb-32">
                <h3 className="text-display text-xl font-black">Menu</h3>
                {menuItems.map((item, idx) => (
                  <GlassCard key={item.id} className="flex items-center justify-between p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                        <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100`} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <h4 className="text-display font-black text-lg">{item.name}</h4>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-black text-klu-red">₹{item.price}</p>
                          {item.prepTime && (
                            <span className="text-[10px] text-white/30 font-black uppercase tracking-widest flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {item.prepTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {cart.find(i => i.id === item.id) ? (
                        <div className="flex items-center gap-3 bg-white/5 rounded-full p-1 border border-white/10">
                          <button onClick={() => removeFromCart(item.id)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-black text-white px-1">{cart.find(i => i.id === item.id)?.quantity}</span>
                          <button onClick={() => addToCart(item)} className="w-10 h-10 rounded-full clay-red flex items-center justify-center text-white">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(item)} className="w-12 h-12 rounded-full clay-red text-white flex items-center justify-center shadow-lg">
                          <Plus className="w-7 h-7" />
                        </button>
                      )}
                    </div>
                  </GlassCard>
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
                    className="w-full py-5 flex items-center justify-between px-8 shadow-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <span className="text-display font-black text-lg">{cart.length} Items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-display font-black text-2xl">₹{cartTotal}</span>
                      <ChevronRight className="w-6 h-6" />
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
              <h2 className="text-display text-4xl font-black">Your Tray</h2>
              
              {cart.length === 0 ? (
                <div className="text-center py-20 glass-frosted rounded-[40px] border border-white/10">
                  <ChefHat className="w-20 h-20 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 font-medium">Your tray is empty. Grab some food!</p>
                  <ClayButton onClick={() => setView('home')} className="mt-8">Browse Outlets</ClayButton>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.map(item => (
                      <GlassCard key={item.id} className="flex items-center justify-between p-5">
                        <div>
                          <h4 className="text-display font-black text-lg">{item.name}</h4>
                          <p className="text-sm text-white/40 font-medium">₹{item.price} x {item.quantity}</p>
                        </div>
                        <p className="text-display font-black text-xl text-klu-red">₹{item.price * item.quantity}</p>
                      </GlassCard>
                    ))}
                  </div>

                  <GlassCard className="space-y-4 p-6">
                    <div className="flex justify-between text-white/60 font-medium">
                      <span>Subtotal</span>
                      <span className="font-bold">₹{cartTotal}</span>
                    </div>
                    <div className="flex justify-between text-white/60 font-medium">
                      <span>Convenience Fee</span>
                      <span className="font-bold">₹1</span>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                      <span className="text-display font-black text-xl">Total</span>
                      <span className="text-display font-black text-3xl text-klu-red">₹{cartTotal + 1}</span>
                    </div>
                  </GlassCard>

                  <ClayButton onClick={handleCheckout} className="w-full py-5 text-xl">
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
                            {(order.status === 'picked_up' || order.status === 'cancelled') && (
                              <ClayButton 
                                onClick={() => reorder(order.items)}
                                className="px-4 py-1.5 text-[10px]"
                                variant="secondary"
                              >
                                Reorder
                              </ClayButton>
                            )}
                            {(order.status === 'pending' || orderFilter === 'history') && (
                              <button 
                                onClick={() => setDeleteConfirmId(order.id)}
                                className="text-red-500 p-1 hover:bg-red-50 rounded-full transition-colors"
                                title={order.status === 'pending' ? "Delete Pending Order" : "Delete Order from History"}
                              >
                                <Trash2 className="w-4 h-4" />
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <h2 className="text-display text-4xl font-black">Profile</h2>
              <GlassCard className="flex flex-col items-center p-8 text-center">
                <div className="w-24 h-24 rounded-full bg-klu-red/20 p-1 border-2 border-klu-red/30 mb-4">
                  <img src={profile?.photoURL || `https://picsum.photos/seed/${profile?.uid}/200`} className="w-full h-full rounded-full object-cover" />
                </div>
                <div className="w-full">
                  {isEditingName ? (
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center font-bold outline-none focus:ring-2 focus:ring-klu-red"
                        placeholder="Enter your name"
                      />
                      <div className="flex gap-2">
                        <ClayButton 
                          onClick={() => updateProfile({ displayName: newName }).then(() => setIsEditingName(false))}
                          className="flex-1 py-3"
                        >
                          Save
                        </ClayButton>
                        <button 
                          onClick={() => setIsEditingName(false)}
                          className="flex-1 py-3 bg-white/5 text-white/60 font-bold rounded-2xl hover:bg-white/10 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-display text-2xl font-black">{profile?.displayName}</h3>
                      <p className="text-white/40 font-medium">{profile?.email}</p>
                    </>
                  )}
                  <span className="mt-4 inline-block px-4 py-1.5 rounded-full bg-klu-red text-white text-[10px] font-black uppercase tracking-widest">
                    {profile?.role}
                  </span>
                </div>
              </GlassCard>

              <div className="space-y-4">
                <h3 className="text-display text-xl font-black">Account Settings</h3>
                <div className="glass-frosted rounded-[32px] p-2 border border-white/10 space-y-1">
                  <button 
                    onClick={() => {
                      setNewName(profile?.displayName || '');
                      setIsEditingName(true);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-klu-red/20 flex items-center justify-center text-klu-red border border-klu-red/30">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <span className="font-bold">Edit Profile</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </button>

                  {profile?.role === 'admin' && (
                    <button 
                      onClick={seedCampusData}
                      disabled={isSeeding}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                          {isSeeding ? (
                            <motion.div 
                              animate={{ rotate: 360 }} 
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full"
                            />
                          ) : (
                            <Store className="w-5 h-5" />
                          )}
                        </div>
                        <span className="font-bold">{isSeeding ? 'Seeding...' : 'Seed Campus Data'}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/20" />
                    </button>
                  )}
                  <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/30">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <span className="font-bold">Payment Methods</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </button>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500 border border-purple-500/30">
                        <Shield className="w-5 h-5" />
                      </div>
                      <span className="font-bold">Account Role</span>
                    </div>
                    <select 
                      value={profile?.role} 
                      onChange={(e) => updateProfile({ role: e.target.value as any })}
                      className="bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase px-3 py-2 outline-none focus:ring-2 focus:ring-klu-red text-white"
                    >
                      <option value="student" className="bg-crimson-dark">Student</option>
                      <option value="merchant" className="bg-crimson-dark">Merchant</option>
                      <option value="admin" className="bg-crimson-dark">Admin</option>
                    </select>
                  </div>
                </div>

                <h3 className="text-display text-xl font-black">Support</h3>
                <div className="glass-frosted rounded-[32px] p-2 border border-white/10 space-y-1">
                  <button 
                    onClick={() => setView('support')}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <span className="font-bold">Help Center</span>
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors text-klu-red" onClick={logout}>
                    <span className="font-bold">Sign Out</span>
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
                <h2 className="text-display text-3xl font-black">Active Orders</h2>
                <div className="flex gap-2">
                  <button onClick={() => setView('merchant_archive')} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-klu-red transition-colors">
                    <Archive className="w-5 h-5" />
                  </button>
                  <button onClick={() => setView('merchant_profile')} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-klu-red transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {merchantOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length === 0 ? (
                  <div className="text-center py-16 glass-frosted rounded-[40px] border border-dashed border-white/10">
                    <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 font-medium">No active orders right now.</p>
                  </div>
                ) : (
                  merchantOrders
                    .filter(o => ['pending', 'preparing', 'ready'].includes(o.status))
                    .map(order => (
                      <GlassCard key={order.id} className="p-6 space-y-4">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="text-display text-lg font-black">Token: #{order.token}</h4>
                            <p className="text-sm text-white/40 font-medium">{order.items.length} items • ₹{order.vendorAmount}</p>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              order.status === 'pending' && "bg-amber-500/20 text-amber-500 border border-amber-500/30",
                              order.status === 'preparing' && "bg-klu-red/20 text-klu-red border border-klu-red/30",
                              order.status === 'ready' && "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                            )}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                          {order.items.map(item => (
                            <p key={item.id} className="text-sm font-bold flex justify-between">
                              <span className="text-white/60">{item.quantity}x</span>
                              <span>{item.name}</span>
                            </p>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <ClayButton onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-1">
                              Start Preparing
                            </ClayButton>
                          )}
                          {order.status === 'preparing' && (
                            <ClayButton onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1">
                              Mark Ready
                            </ClayButton>
                          )}
                          {order.status === 'ready' && (
                            <ClayButton onClick={() => updateOrderStatus(order.id, 'picked_up')} className="flex-1">
                              Confirm Pickup
                            </ClayButton>
                          )}
                        </div>
                      </GlassCard>
                    ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'merchant_archive' && (
            <motion.div 
              key="merchant_archive"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <button onClick={() => setView('merchant')} className="flex items-center gap-2 text-white/40 font-medium">
                <ArrowLeft className="w-5 h-5" /> Back to Dashboard
              </button>
              <h2 className="text-display text-3xl font-black">Order Archive</h2>
              <div className="space-y-4">
                {merchantOrders.filter(o => ['picked_up', 'cancelled'].includes(o.status)).map(order => (
                  <div key={order.id} className="glass-frosted p-5 rounded-[32px] border border-white/10 flex justify-between items-center">
                    <div>
                      <h4 className="text-display font-black">Token: #{order.token}</h4>
                      <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'Recently'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">₹{order.vendorAmount}</p>
                      <span className={cn(
                        "text-[10px] uppercase font-black tracking-widest",
                        order.status === 'picked_up' ? "text-emerald-500" : "text-klu-red"
                      )}>{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'merchant_profile' && (
            <motion.div 
              key="merchant_profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <button onClick={() => setView('merchant')} className="flex items-center gap-2 text-white/40 font-medium">
                <ArrowLeft className="w-5 h-5" /> Back to Dashboard
              </button>
              <h2 className="text-display text-3xl font-black">Store Profile</h2>
              <GlassCard className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                    <img src={`https://picsum.photos/seed/${profile?.uid}/200`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-display font-black text-lg">{profile?.displayName}</h3>
                    <p className="text-sm text-white/40 font-medium">Merchant Account</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-white/30 uppercase font-black mb-1">Store Name</p>
                    <p className="font-bold">Rice & Spice (Sample)</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-white/30 uppercase font-black mb-1">UPI ID</p>
                    <p className="font-bold">merchant@upi</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-white/30 uppercase font-black mb-1">Timings</p>
                    <p className="font-bold">8:00 AM - 9:00 PM</p>
                  </div>
                </div>
                <ClayButton className="w-full">Update Store Info</ClayButton>
              </GlassCard>
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-display text-3xl font-black">Admin Analytics</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-4">
                  <BarChart3 className="w-6 h-6 text-klu-red mb-2" />
                  <p className="text-[10px] text-white/30 font-black uppercase">Total Revenue</p>
                  <p className="text-xl font-black">₹{allOrders.reduce((acc, o) => acc + o.totalAmount, 0)}</p>
                </GlassCard>
                <GlassCard className="p-4">
                  <TrendingUp className="w-6 h-6 text-emerald-500 mb-2" />
                  <p className="text-[10px] text-white/30 font-black uppercase">Platform Fee</p>
                  <p className="text-xl font-black">₹{allOrders.reduce((acc, o) => acc + o.convenienceFee, 0)}</p>
                </GlassCard>
              </div>

              <GlassCard>
                <h3 className="text-display font-black mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-klu-red" /> Block Analytics
                </h3>
                <div className="space-y-3">
                  {['CSE', 'EEE', 'MECH', 'CIVIL'].map(block => {
                    const count = allOrders.filter(o => o.block === block).length;
                    const total = allOrders.length || 1;
                    const percentage = (count / total) * 100;
                    return (
                      <div key={block} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase text-white/40">
                          <span>{block} Block</span>
                          <span>{count} Orders</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className="h-full bg-klu-red"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              <div className="space-y-4">
                <h3 className="text-lg font-bold">Merchant Management</h3>
                <div className="space-y-2">
                  {outlets.map(outlet => (
                    <div key={outlet.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden">
                          <img src={outlet.imageUrl} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{outlet.name}</h4>
                          <p className="text-[10px] text-slate-400">{outlet.blockName} Block</p>
                        </div>
                      </div>
                      <button className="text-blue-600 text-xs font-bold">Manage</button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'merchant_menu' && (
            <motion.div 
              key="merchant_menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Menu Manager</h2>
                <ClayButton className="flex items-center gap-2 px-4 py-2 text-xs">
                  <Plus className="w-4 h-4" /> Add Item
                </ClayButton>
              </div>

              <div className="grid gap-4">
                {merchantMenu.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden">
                      <img src={item.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">{item.name}</h4>
                      <p className="text-xs text-slate-500">₹{item.price} • {item.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={async () => {
                          const merchantOutlet = outlets.find(o => o.merchantId === user?.uid);
                          if (!merchantOutlet) return;
                          try {
                            await updateDoc(doc(db, 'outlets', merchantOutlet.id, 'menu', item.id), {
                              isAvailable: !item.isAvailable
                            });
                          } catch (error) {
                            handleFirestoreError(error, OperationType.UPDATE, `outlets/${merchantOutlet.id}/menu/${item.id}`, setAppError);
                          }
                        }}
                        className={cn(
                          "w-10 h-5 rounded-full transition-colors relative",
                          item.isAvailable ? "bg-emerald-500" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                          item.isAvailable ? "right-0.5" : "left-0.5"
                        )} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-blue-600">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'support' && (
            <motion.div 
              key="support"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Help Center</h2>
              <GlassCard className="space-y-4">
                <h3 className="font-bold">Report an Issue</h3>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Subject (e.g. Payment Failed)" 
                    className="w-full p-4 bg-white rounded-2xl shadow-sm border-none"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                  />
                  <textarea 
                    placeholder="Describe your problem..." 
                    className="w-full p-4 bg-white rounded-2xl shadow-sm border-none h-32"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                  />
                  <ClayButton 
                    className="w-full"
                    onClick={submitTicket}
                    disabled={isSubmittingTicket || !supportSubject || !supportMessage}
                  >
                    {isSubmittingTicket ? 'Submitting...' : 'Submit Ticket'}
                  </ClayButton>
                </div>
              </GlassCard>

              <div className="space-y-4">
                <h3 className="text-lg font-bold">Your Tickets</h3>
                {supportTickets.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No tickets found.</p>
                ) : (
                  supportTickets.map(ticket => (
                    <div key={ticket.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-sm">{ticket.subject}</h4>
                        <p className="text-[10px] text-slate-400">{ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'Just now'}</p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        ticket.status === 'open' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                      )}>
                        {ticket.status}
                      </span>
                    </div>
                  ))
                )}
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 glass-frosted rounded-full flex items-center justify-around px-4 shadow-2xl z-50 border border-white/10">
        <button 
          onClick={() => setView('home')} 
          className={cn("p-3 rounded-full transition-all", view === 'home' ? "clay-red shadow-lg scale-110" : "text-white/30")}
        >
          <Store className="w-6 h-6" />
        </button>

        {profile?.role === 'student' && (
          <>
            <button 
              onClick={() => setView('orders')} 
              className={cn("p-3 rounded-full transition-all", view === 'orders' ? "clay-red shadow-lg scale-110" : "text-white/30")}
            >
              <Clock className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setView('cart')} 
              className={cn("p-3 rounded-full transition-all relative", view === 'cart' ? "clay-red shadow-lg scale-110" : "text-white/30")}
            >
              <ShoppingCart className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-klu-red text-[10px] font-black rounded-full flex items-center justify-center border-2 border-klu-red">
                  {cart.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setView('support')} 
              className={cn("p-3 rounded-full transition-all", view === 'support' ? "clay-red shadow-lg scale-110" : "text-white/30")}
            >
              <HelpCircle className="w-6 h-6" />
            </button>
          </>
        )}

        {profile?.role === 'merchant' && (
          <>
            <button 
              onClick={() => setView('merchant')} 
              className={cn("p-3 rounded-full transition-all", ['merchant', 'merchant_archive', 'merchant_profile'].includes(view) ? "clay-red shadow-lg scale-110" : "text-white/30")}
            >
              <LayoutDashboard className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setView('merchant_menu')} 
              className={cn("p-3 rounded-full transition-all", view === 'merchant_menu' ? "clay-red shadow-lg scale-110" : "text-white/30")}
            >
              <UtensilsCrossed className="w-6 h-6" />
            </button>
          </>
        )}

        {profile?.role === 'admin' && (
          <button 
            onClick={() => setView('admin')} 
            className={cn("p-3 rounded-full transition-all", view === 'admin' ? "clay-red shadow-lg scale-110" : "text-white/30")}
          >
            <BarChart3 className="w-6 h-6" />
          </button>
        )}

        <button 
          onClick={() => setView('profile')} 
          className={cn("p-3 rounded-full transition-all", view === 'profile' ? "clay-red shadow-lg scale-110" : "text-white/30")}
        >
          <UserIcon className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
