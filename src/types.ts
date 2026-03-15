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
  savedPaymentMethods?: string[];
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

export interface Order {
  id: string;
  studentId: string;
  outletId: string;
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
  block?: string; // The block of the student who ordered
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
