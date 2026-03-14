import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePOSStore } from '../store/posStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User as UserIcon, 
  CreditCard, 
  Banknote, 
  QrCode,
  Printer,
  X,
  ArrowLeft,
  ShoppingCart,
  Truck,
  Tag,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Coins
} from 'lucide-react';
import type { Product, Customer } from '@prisma/client';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { apiFetch } from '../lib/api';

export default function POS() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');
  
  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMoneyInput, setShowMoneyInput] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  
  // Local state for modals
  const [tempShipping, setTempShipping] = useState(0);
  const [tempDiscount, setTempDiscount] = useState(0);
  const [tempDiscountType, setTempDiscountType] = useState<'VALUE' | 'PERCENTAGE'>('VALUE');
  const [tempObservation, setTempObservation] = useState('');
  const [tempShowOnReceipt, setTempShowOnReceipt] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState<number | string>('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [lastSale, setLastSale] = useState<any>(null);

  const { 
    cart, addItem, removeItem, updateQuantity, 
    discount, discountType, setDiscount, 
    shipping, setShipping,
    observation, setObservation,
    showObservationOnReceipt, setShowObservationOnReceipt,
    customerId, setCustomerId,
    payments, addPayment, removePayment,
    getTotal, getDiscountAmount, getSubtotal, getRemainingBalance, clearPOS 
  } = usePOSStore();

  // Auto-focus search input
  useEffect(() => {
    const focusSearch = (e: KeyboardEvent) => {
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  useEffect(() => {
    if (!showPaymentModal && !showCustomerModal && !showDiscountModal && !showShippingModal && !showObservationModal) {
      searchInputRef.current?.focus();
    }
  }, [showPaymentModal, showCustomerModal, showDiscountModal, showShippingModal, showObservationModal]);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch('/api/products').then(res => res.json())
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => apiFetch('/api/customers').then(res => res.json())
  });

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['cashier-session'],
    queryFn: () => apiFetch('/api/cashier/session').then(res => res.json())
  });

  const saleMutation = useMutation({
    mutationFn: (saleData: any) => 
      apiFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify(saleData)
      }).then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao finalizar venda');
        return data;
      }),
    onSuccess: (data) => {
      setLastSale(data);
      setShowPaymentModal(false);
      setShowReceipt(true);
      toast.success('Venda finalizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p: Product) => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const selectedCustomer = useMemo(() => {
    if (!Array.isArray(customers)) return null;
    return customers.find((c: Customer) => c.id === customerId);
  }, [customers, customerId]);

  const handleFinalize = () => {
    saleMutation.mutate({
      customerId,
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price
      })),
      payments: payments.map(p => ({
        method: p.method,
        amount: p.amount
      })),
      discount,
      discountType,
      shipping,
      observation,
      showObservationOnReceipt
    });
  };

  const handleMoneyPayment = () => {
    const amount = Number(receivedAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    addPayment({ method: 'DINHEIRO', amount: Math.min(amount, getRemainingBalance()) });
    setShowMoneyInput(false);
    setReceivedAmount('');
  };

  const closeCashierMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/cashier/close', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao fechar caixa');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session'] });
      toast.success('Caixa fechado com sucesso!');
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  if (sessionLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 border-4 border-cherry border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-500 animate-pulse">Carregando PDV...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Caixa Fechado</h2>
        <p className="text-zinc-400 mb-8 max-w-md">
          Você precisa abrir o caixa antes de realizar vendas.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="bg-cherry text-white font-bold px-8 py-3 rounded-xl hover:bg-cherry/90 transition-all"
        >
          Ir para Dashboard
        </button>
      </div>
    );
  }

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden">
      {/* Left Side: Product Selection */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full flex gap-2 lg:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar item (Nome ou SKU)..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 transition-all text-sm lg:text-base"
              />
            </div>
            <div className="flex gap-2">
              {showCloseConfirm ? (
                <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-1">
                  <button 
                    onClick={() => closeCashierMutation.mutate()}
                    disabled={closeCashierMutation.isPending}
                    className="px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    {closeCashierMutation.isPending ? '...' : 'Confirmar Fechamento'}
                  </button>
                  <button 
                    onClick={() => setShowCloseConfirm(false)}
                    className="px-3 py-2 text-zinc-400 text-xs font-bold hover:bg-zinc-800 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button 
                  disabled={closeCashierMutation.isPending}
                  onClick={() => setShowCloseConfirm(true)}
                  className="px-4 lg:px-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-red-500 font-bold hover:bg-red-500/10 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                  <span className="hidden sm:inline">Fechar Caixa</span>
                </button>
              )}
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 lg:px-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          </div>
          <button 
            onClick={() => setActiveTab(activeTab === 'products' ? 'cart' : 'products')}
            className="lg:hidden relative p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-cherry text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-black">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <motion.div 
            layout
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {Array.isArray(filteredProducts) && filteredProducts.map((product: any) => {
                const inCart = cart.find(item => item.product.id === product.id);
                const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={product.id}
                    className={cn(
                      "group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-cherry/50 flex flex-col",
                      product.stock <= 0 && "opacity-60 grayscale pointer-events-none"
                    )}
                  >
                    <div className="aspect-square bg-zinc-800 relative overflow-hidden">
                      {product.photo ? (
                        <img 
                          src={product.photo} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <ShoppingCart className="w-12 h-12" />
                        </div>
                      )}
                      
                      {isLowStock && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                            <AlertCircle className="w-3 h-3" />
                            Estoque Baixo
                          </span>
                        </div>
                      )}

                      {product.stock <= 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">Esgotado</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{product.sku}</p>
                      <h3 className="text-white font-bold text-sm line-clamp-2 mb-2 h-10">{product?.name}</h3>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-cherry font-bold">R$ {product.price.toFixed(2)}</span>
                        
                        <div className="flex items-center gap-2">
                          {inCart ? (
                            <div className="flex items-center bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                              <button 
                                onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                                className="p-1.5 hover:bg-zinc-700 text-zinc-400"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-white px-2 min-w-[24px] text-center">{inCart.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                                disabled={inCart.quantity >= product.stock}
                                className="p-1.5 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => addItem(product)}
                              className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-cherry hover:text-white transition-all border border-zinc-700"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Cart & Summary */}
      <div className={cn(
        "w-full lg:w-[400px] flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all",
        activeTab === 'cart' ? 'fixed inset-0 z-40 lg:relative lg:inset-auto' : 'hidden lg:flex'
      )}>
        <div className="p-4 lg:p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cherry/10 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-cherry" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm lg:text-base">Carrinho</h2>
              <p className="text-[9px] lg:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{cartCount} Itens</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('products')}
            className="lg:hidden p-2 text-zinc-500 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 custom-scrollbar min-h-0">
          <AnimatePresence mode="popLayout">
            {cart.map((item) => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                key={item.product.id} 
                className="flex gap-4 group"
              >
                <div className="w-16 h-16 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-700">
                  {item.product.photo ? (
                    <img src={item.product.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-bold text-sm truncate">{item.product?.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-zinc-500">
                      {item.quantity} x R$ {item.price.toFixed(2)}
                    </p>
                    <p className="text-sm font-bold text-white">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 hover:bg-zinc-700 text-zinc-400"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white px-3">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="p-1 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeItem(item.product.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-20">
              <ShoppingCart className="w-12 h-12 mb-4" />
              <p className="font-bold uppercase tracking-widest text-xs">Carrinho Vazio</p>
            </div>
          )}
        </div>

        <div className="p-4 lg:p-6 bg-zinc-950/50 border-t border-zinc-800 space-y-4 lg:space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setShowDiscountModal(true)}
              className="flex flex-col items-center gap-1.5 p-2 lg:p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-cherry/50 transition-all group"
            >
              <Tag className="w-4 h-4 lg:w-5 lg:h-5 text-zinc-500 group-hover:text-cherry" />
              <span className="text-[9px] lg:text-[10px] font-bold text-zinc-500 uppercase">Desconto</span>
            </button>
            <button 
              onClick={() => setShowObservationModal(true)}
              className="flex flex-col items-center gap-1.5 p-2 lg:p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-cherry/50 transition-all group"
            >
              <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 text-zinc-500 group-hover:text-cherry" />
              <span className="text-[9px] lg:text-[10px] font-bold text-zinc-500 uppercase">Obs</span>
            </button>
            <button 
              onClick={() => {
                if (!customerId) {
                  toast.error('Selecione um cliente para definir a entrega');
                  setShowCustomerModal(true);
                } else {
                  setShowShippingModal(true);
                }
              }}
              className="flex flex-col items-center gap-1.5 p-2 lg:p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-cherry/50 transition-all group"
            >
              <Truck className="w-4 h-4 lg:w-5 lg:h-5 text-zinc-500 group-hover:text-cherry" />
              <span className="text-[9px] lg:text-[10px] font-bold text-zinc-500 uppercase">Entrega</span>
            </button>
          </div>

          {/* Customer Selection */}
          <button 
            onClick={() => setShowCustomerModal(true)}
            className="w-full flex items-center justify-between p-3 lg:p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 font-bold text-xs lg:text-base">
                {selectedCustomer ? selectedCustomer.name.charAt(0) : <UserIcon className="w-4 h-4 lg:w-5 lg:h-5" />}
              </div>
              <div className="text-left">
                <p className="text-[9px] lg:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Cliente</p>
                <p className="text-white font-bold text-xs lg:text-sm truncate max-w-[120px] lg:max-w-[180px]">
                  {selectedCustomer ? selectedCustomer.name : 'Venda Rápida'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-zinc-600" />
          </button>

          {/* Totals */}
          <div className="space-y-1.5 lg:space-y-2">
            <div className="flex justify-between text-xs lg:text-sm text-zinc-500">
              <span>Subtotal</span>
              <span>R$ {getSubtotal().toFixed(2)}</span>
            </div>
            {shipping > 0 && (
              <div className="flex justify-between text-xs lg:text-sm text-zinc-500">
                <span>Entrega</span>
                <span>+ R$ {shipping.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-xs lg:text-sm text-red-500">
                <span>Desconto {discountType === 'PERCENTAGE' ? `(${discount}%)` : ''}</span>
                <span>- R$ {getDiscountAmount().toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-1 lg:pt-2">
              <span className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] lg:text-xs">Total Final</span>
              <span className="text-2xl lg:text-3xl font-black text-white leading-none">R$ {getTotal().toFixed(2)}</span>
            </div>
          </div>

          <button 
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full bg-cherry text-white font-black py-4 lg:py-5 rounded-2xl shadow-lg shadow-cherry/20 hover:bg-cherry/90 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 text-sm lg:text-base"
          >
            AVANÇAR <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modals */}
      
      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Selecionar Cliente</h2>
              <button onClick={() => setShowCustomerModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Buscar cliente..." 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                <button 
                  onClick={() => { setCustomerId(null); setShowCustomerModal(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition-all text-left"
                >
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <span className="text-white font-bold">Venda Rápida (Sem Cliente)</span>
                </button>
                {Array.isArray(customers) && customers.map((c: any) => (
                  <button 
                    key={c.id}
                    onClick={() => { setCustomerId(c.id); setShowCustomerModal(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition-all text-left"
                  >
                    <div className="w-10 h-10 bg-cherry/10 rounded-full flex items-center justify-center text-cherry font-bold">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-bold">{c.name}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{c.code || 'S/C'}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => navigate('/customers')}
                className="w-full flex items-center justify-center gap-2 p-4 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              >
                <Plus className="w-5 h-5" /> Adicionar Novo Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Valor da Entrega</h2>
              <button onClick={() => setShowShippingModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Digite o valor da entrega</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    value={tempShipping}
                    onChange={(e) => setTempShipping(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-white text-xl font-bold focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between text-zinc-400 text-sm">
                  <span>Subtotal</span>
                  <span>R$ {getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold">
                  <span>Total com Entrega</span>
                  <span>R$ {(getSubtotal() - discount + tempShipping).toFixed(2)}</span>
                </div>
              </div>
              <button 
                onClick={() => { setShipping(tempShipping); setShowShippingModal(false); }}
                className="w-full bg-cherry text-white font-bold py-4 rounded-2xl hover:bg-cherry/90 transition-all"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Aplicar Desconto</h2>
              <button onClick={() => setShowDiscountModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex bg-zinc-800 p-1 rounded-xl">
                <button 
                  onClick={() => setTempDiscountType('VALUE')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    tempDiscountType === 'VALUE' ? "bg-zinc-700 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Valor (R$)
                </button>
                <button 
                  onClick={() => setTempDiscountType('PERCENTAGE')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    tempDiscountType === 'PERCENTAGE' ? "bg-zinc-700 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Porcentagem (%)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  {tempDiscountType === 'VALUE' ? 'Valor do Desconto' : 'Porcentagem do Desconto'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">
                    {tempDiscountType === 'VALUE' ? 'R$' : '%'}
                  </span>
                  <input 
                    type="number" 
                    value={tempDiscount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (tempDiscountType === 'PERCENTAGE' && val > 100) return;
                      setTempDiscount(val);
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-cherry/50"
                    autoFocus
                  />
                </div>
              </div>

              <div className="bg-zinc-800/50 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between text-zinc-400 text-sm">
                  <span>Subtotal</span>
                  <span>R$ {getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold">
                  <span>Total com Desconto</span>
                  <span>
                    R$ {(getSubtotal() + shipping - (tempDiscountType === 'PERCENTAGE' ? (getSubtotal() * tempDiscount / 100) : tempDiscount)).toFixed(2)}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => { 
                  setDiscount(tempDiscount, tempDiscountType); 
                  setShowDiscountModal(false); 
                }}
                className="w-full bg-cherry text-white font-bold py-4 rounded-2xl hover:bg-cherry/90 transition-all shadow-lg shadow-cherry/20"
              >
                Aplicar Desconto
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Observation Modal */}
      {showObservationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Observação da Venda</h2>
              <button onClick={() => setShowObservationModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Campo de texto</label>
                <textarea 
                  value={tempObservation}
                  onChange={(e) => setTempObservation(e.target.value)}
                  placeholder="Ex: metade dinheiro, metade pix..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-white text-sm focus:outline-none min-h-[120px]"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                  tempShowOnReceipt ? "bg-cherry border-cherry" : "border-zinc-700 group-hover:border-zinc-500"
                )} onClick={() => setTempShowOnReceipt(!tempShowOnReceipt)}>
                  {tempShowOnReceipt && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <span className="text-sm text-zinc-400">Exibir observação no recibo</span>
              </label>
              <button 
                onClick={() => { 
                  setObservation(tempObservation); 
                  setShowObservationOnReceipt(tempShowOnReceipt);
                  setShowObservationModal(false); 
                }}
                className="w-full bg-cherry text-white font-bold py-4 rounded-2xl hover:bg-cherry/90 transition-all"
              >
                Salvar Observação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            <div className="flex-1 p-8 border-r border-zinc-800">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">Pagamento</h2>
                <button onClick={() => setShowPaymentModal(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => setShowMoneyInput(true)}
                  className="flex flex-col items-center gap-3 p-6 bg-zinc-800 border border-zinc-700 rounded-2xl hover:border-cherry/50 transition-all group"
                >
                  <Banknote className="w-8 h-8 text-zinc-500 group-hover:text-cherry" />
                  <span className="font-bold text-white">Dinheiro</span>
                </button>
                <button 
                  onClick={() => addPayment({ method: 'PIX', amount: getRemainingBalance() })}
                  className="flex flex-col items-center gap-3 p-6 bg-zinc-800 border border-zinc-700 rounded-2xl hover:border-cherry/50 transition-all group"
                >
                  <QrCode className="w-8 h-8 text-zinc-500 group-hover:text-cherry" />
                  <span className="font-bold text-white">Pix</span>
                </button>
                <button 
                  onClick={() => addPayment({ method: 'CARTAO_CREDITO', amount: getRemainingBalance() })}
                  className="flex flex-col items-center gap-3 p-6 bg-zinc-800 border border-zinc-700 rounded-2xl hover:border-cherry/50 transition-all group"
                >
                  <CreditCard className="w-8 h-8 text-zinc-500 group-hover:text-cherry" />
                  <span className="font-bold text-white text-xs">Crédito</span>
                </button>
                <button 
                  onClick={() => addPayment({ method: 'CARTAO_DEBITO', amount: getRemainingBalance() })}
                  className="flex flex-col items-center gap-3 p-6 bg-zinc-800 border border-zinc-700 rounded-2xl hover:border-cherry/50 transition-all group"
                >
                  <CreditCard className="w-8 h-8 text-zinc-500 group-hover:text-cherry" />
                  <span className="font-bold text-white text-xs">Débito</span>
                </button>
              </div>
            </div>

            <div className="w-full md:w-[350px] bg-zinc-950/50 p-8 flex flex-col">
              <div className="flex-1 space-y-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Resumo</h3>
                
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {payments.map((p, i) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        key={i} 
                        className="flex justify-between items-center bg-zinc-900 p-4 rounded-2xl border border-zinc-800"
                      >
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">{p.method}</p>
                          <p className="text-white font-bold">R$ {p.amount.toFixed(2)}</p>
                        </div>
                        <button onClick={() => removePayment(i)} className="text-zinc-600 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {payments.length === 0 && (
                    <p className="text-zinc-600 text-sm italic text-center py-8">Nenhum pagamento</p>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-zinc-800 space-y-4">
                <div className="flex justify-between text-zinc-500">
                  <span>Total</span>
                  <span>R$ {getTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-cherry font-bold uppercase tracking-widest text-xs">Faltam</span>
                  <span className="text-3xl font-black text-white">R$ {getRemainingBalance().toFixed(2)}</span>
                </div>
                
                <button 
                  onClick={handleFinalize}
                  disabled={getRemainingBalance() > 0 || saleMutation.isPending}
                  className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                >
                  {saleMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      PROCESSANDO...
                    </>
                  ) : 'CONCLUIR VENDA'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Money Input Modal */}
      {showMoneyInput && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Valor Recebido</h2>
              <button onClick={() => setShowMoneyInput(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="text-center">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total a Pagar</p>
                <p className="text-4xl font-black text-white">R$ {getTotal().toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Digite o valor recebido</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    value={receivedAmount}
                    onFocus={e => e.target.select()}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-12 pr-4 py-5 text-white text-3xl font-black focus:outline-none focus:ring-2 focus:ring-cherry/50"
                    autoFocus
                  />
                </div>
              </div>

              {Number(receivedAmount) > 0 && (
                <div className="bg-zinc-800/50 p-6 rounded-2xl text-center">
                  {Number(receivedAmount) >= getRemainingBalance() ? (
                    <div>
                      <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Troco</p>
                      <p className="text-3xl font-black text-emerald-500">R$ {(Number(receivedAmount) - getRemainingBalance()).toFixed(2)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Faltam</p>
                      <p className="text-3xl font-black text-red-500">R$ {(getRemainingBalance() - Number(receivedAmount)).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleMoneyPayment}
                className="w-full bg-cherry text-white font-bold py-5 rounded-2xl hover:bg-cherry/90 transition-all shadow-lg shadow-cherry/20"
              >
                Confirmar Recebimento
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[70]">
          <div className="bg-white text-black p-10 rounded-sm w-full max-w-sm shadow-2xl print:shadow-none print:p-0">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-900">CEREJEIRA</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-500 -mt-1 mb-4">Lash Store & Care</p>
              <div className="h-px bg-zinc-100 w-full mb-4" />
              <p className="text-[10px] font-bold">Rua das Extensões, 123 - Centro</p>
              <p className="text-[10px] font-bold">CNPJ: 00.000.000/0001-00</p>
            </div>

            <div className="border-y border-dashed border-black/20 py-4 mb-6 space-y-1">
              <p className="text-[10px] flex justify-between font-bold"><span>VENDA:</span> <span>#{lastSale.id.substring(0, 8).toUpperCase()}</span></p>
              <p className="text-[10px] flex justify-between font-bold"><span>DATA:</span> <span>{new Date(lastSale.createdAt).toLocaleString()}</span></p>
              <p className="text-[10px] flex justify-between font-bold"><span>CLIENTE:</span> <span>{lastSale.customer?.name || 'CONSUMIDOR FINAL'}</span></p>
            </div>

            <div className="space-y-3 mb-8">
              <p className="text-[10px] font-black border-b border-zinc-100 pb-1 mb-2">ITENS DA VENDA</p>
              {Array.isArray(lastSale.items) && lastSale.items.map((item: any, i: number) => (
                <div key={i} className="text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span className="uppercase">{item.product?.name}</span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="text-[9px] text-black/60">
                    {item.quantity} UN x R$ {item.price.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black/20 pt-4 space-y-2">
              <div className="flex justify-between text-[10px]">
                <span>SUBTOTAL</span>
                <span>R$ {(lastSale.total + lastSale.discount - lastSale.shipping).toFixed(2)}</span>
              </div>
              {lastSale.shipping > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>ENTREGA</span>
                  <span>R$ {lastSale.shipping.toFixed(2)}</span>
                </div>
              )}
              {lastSale.discount > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>DESCONTO</span>
                  <span>- R$ {lastSale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-2 border-t border-black/5">
                <span>TOTAL</span>
                <span>R$ {lastSale.total.toFixed(2)}</span>
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-[10px] font-black border-b border-zinc-100 pb-1 mb-2 uppercase">Pagamento</p>
                {Array.isArray(lastSale.payments) && lastSale.payments.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between text-[10px] font-bold">
                    <span className="uppercase">{p.method.replace('_', ' ')}</span>
                    <span>R$ {p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              {lastSale.showObservationOnReceipt && lastSale.observation && (
                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <p className="text-[9px] font-bold uppercase mb-1">Observação:</p>
                  <p className="text-[9px] italic text-zinc-600">{lastSale.observation}</p>
                </div>
              )}

              <div className="text-[10px] text-center mt-10 font-bold">
                OBRIGADO PELA PREFERÊNCIA!<br/>
                VOLTE SEMPRE.
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 print:hidden">
              <button 
                onClick={() => window.print()}
                className="w-full bg-zinc-900 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-black transition-all"
              >
                <Printer className="w-5 h-5" /> IMPRIMIR RECIBO
              </button>
              <button 
                onClick={() => {
                  setShowReceipt(false);
                  clearPOS();
                }}
                className="w-full border-2 border-zinc-200 py-4 rounded-xl font-bold hover:bg-zinc-50 transition-all"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
