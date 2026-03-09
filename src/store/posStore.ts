import { create } from 'zustand';
import { Product } from '@prisma/client';

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

interface Payment {
  method: 'DINHEIRO' | 'PIX' | 'CARTAO';
  amount: number;
}

interface POSState {
  cart: CartItem[];
  discount: number;
  customerId: string | null;
  payments: Payment[];
  
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  setCustomerId: (id: string | null) => void;
  addPayment: (payment: Payment) => void;
  removePayment: (index: number) => void;
  clearPOS: () => void;
  
  getTotal: () => number;
  getSubtotal: () => number;
  getRemainingBalance: () => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  discount: 0,
  customerId: null,
  payments: [],

  addItem: (product, quantity = 1) => {
    const { cart } = get();
    const existing = cart.find((item) => item.product.id === product.id);

    if (existing) {
      set({
        cart: cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      });
    } else {
      set({ cart: [...cart, { product, quantity, price: product.price }] });
    }
  },

  removeItem: (productId) => {
    set({ cart: get().cart.filter((item) => item.product.id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      cart: get().cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    });
  },

  setDiscount: (discount) => set({ discount }),
  setCustomerId: (id) => set({ customerId: id }),

  addPayment: (payment) => {
    set({ payments: [...get().payments, payment] });
  },

  removePayment: (index) => {
    set({ payments: get().payments.filter((_, i) => i !== index) });
  },

  clearPOS: () => set({ cart: [], discount: 0, customerId: null, payments: [] }),

  getSubtotal: () => {
    return get().cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  },

  getTotal: () => {
    return get().getSubtotal() - get().discount;
  },

  getRemainingBalance: () => {
    const total = get().getTotal();
    const paid = get().payments.reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, total - paid);
  },
}));
