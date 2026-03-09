import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePOSStore } from '../store/posStore';
import { useNavigate } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { Product } from '@prisma/client';

export default function POS() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [skuSearch, setSkuSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);

  const { 
    cart, addItem, removeItem, updateQuantity, 
    discount, setDiscount, 
    customerId, setCustomerId,
    payments, addPayment, removePayment,
    getTotal, getSubtotal, getRemainingBalance, clearPOS 
  } = usePOSStore();

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(res => res.json())
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/customers').then(res => res.json())
  });

  const { data: session } = useQuery({
    queryKey: ['cashier-session'],
    queryFn: () => fetch('/api/cashier/session').then(res => res.json())
  });

  const saleMutation = useMutation({
    mutationFn: (saleData: any) => 
      fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    }
  });

  const handleSkuSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products?.find((p: Product) => p.sku === skuSearch);
    if (product) {
      addItem(product);
      setSkuSearch('');
    } else {
      alert('Produto não encontrado');
    }
  };

  const handleFinalize = () => {
    if (getRemainingBalance() > 0) {
      alert('O valor pago é inferior ao total da venda');
      return;
    }

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
      discount
    });
  };

  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Caixa Fechado</h2>
        <p className="text-zinc-400 mb-8 max-w-md">
          Você precisa abrir o caixa antes de realizar vendas. Vá para o Dashboard ou clique no botão abaixo.
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

  return (
    <div className="h-full flex gap-8">
      {/* Left Column: Cart */}
      <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800">
          <form onSubmit={handleSkuSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              ref={skuInputRef}
              type="text"
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
              placeholder="Buscar por SKU ou Nome (Enter para adicionar)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-lg"
              autoFocus
            />
          </form>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">Produto</th>
                <th className="px-6 py-4 font-bold text-center">Qtd</th>
                <th className="px-6 py-4 font-bold text-right">Preço</th>
                <th className="px-6 py-4 font-bold text-right">Total</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {cart.map((item) => (
                <tr key={item.product.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{item.product.name}</p>
                    <p className="text-xs text-zinc-500">{item.product.sku}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 text-zinc-400"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-white font-bold w-8 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 text-zinc-400"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-300">
                    R$ {item.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-white font-bold">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => removeItem(item.product.id)}
                      className="text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-zinc-500 italic">
                    Carrinho vazio. Comece bipando produtos ou buscando acima.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-8 bg-zinc-800/30 border-t border-zinc-800 grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <UserIcon className="w-5 h-5 text-zinc-500" />
              <select 
                value={customerId || ''} 
                onChange={(e) => setCustomerId(e.target.value || null)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-300 focus:outline-none"
              >
                <option value="">Cliente não identificado</option>
                {customers?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500 font-medium">Desconto R$</span>
              <input 
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-32 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 text-right">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>R$ {getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Desconto</span>
              <span>- R$ {discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-white pt-2 border-t border-zinc-700">
              <span>Total</span>
              <span className="text-cherry">R$ {getTotal().toFixed(2)}</span>
            </div>
            <button 
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="btn-cherry w-full py-4 mt-4 text-lg"
            >
              Pagar Agora
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Finalizar Pagamento</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider">Métodos de Pagamento</p>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => addPayment({ method: 'DINHEIRO', amount: getRemainingBalance() })}
                    className="flex items-center gap-4 bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl text-white transition-all group"
                  >
                    <div className="w-10 h-10 bg-cherry/10 rounded-lg flex items-center justify-center group-hover:bg-cherry/20">
                      <Banknote className="w-6 h-6 text-cherry" />
                    </div>
                    <span className="font-bold">Dinheiro</span>
                  </button>
                  <button 
                    onClick={() => addPayment({ method: 'PIX', amount: getRemainingBalance() })}
                    className="flex items-center gap-4 bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl text-white transition-all group"
                  >
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                      <QrCode className="w-6 h-6 text-blue-500" />
                    </div>
                    <span className="font-bold">Pix</span>
                  </button>
                  <button 
                    onClick={() => addPayment({ method: 'CARTAO', amount: getRemainingBalance() })}
                    className="flex items-center gap-4 bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl text-white transition-all group"
                  >
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20">
                      <CreditCard className="w-6 h-6 text-purple-500" />
                    </div>
                    <span className="font-bold">Cartão</span>
                  </button>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-2xl p-6 flex flex-col">
                <div className="space-y-4 flex-1">
                  <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider">Resumo de Pagamento</p>
                  <div className="space-y-2">
                    {payments.map((p, i) => (
                      <div key={i} className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg border border-zinc-700">
                        <span className="text-xs font-bold text-zinc-400 uppercase">{p.method}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">R$ {p.amount.toFixed(2)}</span>
                          <button onClick={() => removePayment(i)} className="text-zinc-600 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {payments.length === 0 && (
                      <p className="text-zinc-500 text-sm italic text-center py-4">Nenhum pagamento adicionado</p>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-700 space-y-3">
                  <div className="flex justify-between text-zinc-400">
                    <span>Total da Venda</span>
                    <span>R$ {getTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-cherry font-bold text-xl">
                    <span>Restante</span>
                    <span>R$ {getRemainingBalance().toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={handleFinalize}
                    disabled={getRemainingBalance() > 0 || saleMutation.isPending}
                    className="btn-cherry w-full py-4 mt-4"
                  >
                    {saleMutation.isPending ? 'Processando...' : 'Finalizar Venda'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white text-black p-8 rounded-sm w-full max-w-sm shadow-2xl print:shadow-none print:p-0">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold uppercase tracking-tighter text-cherry">Cerejeira</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gold -mt-1 mb-2">Lash Store</p>
              <p className="text-xs">Rua das Extensões, 123 - Centro</p>
              <p className="text-xs">CNPJ: 00.000.000/0001-00</p>
            </div>

            <div className="border-y border-dashed border-black/20 py-4 mb-4 space-y-1">
              <p className="text-xs flex justify-between"><span>Venda:</span> <span>#{lastSale.id.substring(0, 8)}</span></p>
              <p className="text-xs flex justify-between"><span>Data:</span> <span>{new Date(lastSale.createdAt).toLocaleString()}</span></p>
              <p className="text-xs flex justify-between"><span>Cliente:</span> <span>{lastSale.customer?.name || 'Consumidor Final'}</span></p>
            </div>

            <div className="space-y-2 mb-6">
              {lastSale.items.map((item: any, i: number) => (
                <div key={i} className="text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{item.product.name}</span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-black/60">
                    {item.quantity} x R$ {item.price.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black/20 pt-4 space-y-1">
              <div className="flex justify-between text-sm font-bold">
                <span>TOTAL</span>
                <span>R$ {lastSale.total.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-center mt-8">
                Obrigado pela preferência!<br/>
                Volte sempre.
              </div>
            </div>

            <div className="mt-8 flex gap-3 print:hidden">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-zinc-900 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-bold"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button 
                onClick={() => {
                  setShowReceipt(false);
                  clearPOS();
                }}
                className="flex-1 border border-zinc-200 py-3 rounded-lg font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
