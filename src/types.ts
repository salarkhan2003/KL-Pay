export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'merchant' | 'admin';
  studentId?: string;
  kCoins?: number;
  streak?: number;
  lastOrderDate?: any;
  block?: string;
  phone?: string;
  createdAt?: any;
  savedPaymentMethods?: string[];
  photoURL?: string;
  merchantOutletId?: string; // which outlet this user manages (dev testing)
}

export interface Outlet {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  isOpen: boolean;
  merchantId: string;
  blockName: string;
  category: string;
  upiId: string;
  timings?: string;
  rating?: number;
  totalOrders?: number;
}

export interface MenuItem {
  id: string;
  outletId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  prepTime?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem extends OrderItem {
  imageUrl: string;
}

export interface Order {
  id: string;
  studentId: string;
  outletId: string;
  userName?: string;
  userPhone?: string;
  items: OrderItem[];
  totalAmount: number;
  convenienceFee: number;
  vendorAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'failed';
  paymentId?: string;
  token: string;
  createdAt: any;
  rating?: number;
  review?: string;
  block?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  orderId?: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved' | 'closed';
  createdAt: any;
}

// ── Unified Transaction (Food_Order + Peer_to_Merchant_Pay) ──────────────────
export type PaymentFlow = 'Food_Order' | 'Peer_to_Merchant_Pay';

export interface Transaction {
  id: string;                    // Cashfree order_id
  flow: PaymentFlow;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  outletId: string;
  outletName: string;
  merchantVpa: string;           // merchant UPI VPA
  totalAmount: number;           // what student paid
  platformFee: number;           // always ₹1 → admin
  vendorAmount: number;          // totalAmount - platformFee
  paymentStatus: 'pending' | 'paid' | 'failed';
  cashfreeOrderId: string;
  cashfreePaymentId?: string;
  kCoinsAwarded: number;
  createdAt: any;
  // Food_Order specific
  orderId?: string;
  token?: string;
  // Peer_to_Merchant_Pay specific
  note?: string;
}

// Merchant real-time alert pushed via Firestore + Socket.io
export interface MerchantAlert {
  id: string;
  outletId: string;
  type: 'Food_Order' | 'Direct_Pay';
  amount: number;
  fromName: string;
  token?: string;
  note?: string;
  createdAt: any;
  read: boolean;
}
