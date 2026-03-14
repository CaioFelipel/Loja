import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CreditCard,
  ArrowUpRight,
  Activity,
  X,
  Banknote,
  DollarSign,
  ShoppingCart,
  Percent,
  Star
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showOpenCashier, setShowOpenCashier] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiFetch('/api/reports/dashboard').then(res => res.json())
  });

  const { data: session } = useQuery({
    queryKey: ['cashier-session'],
    queryFn: () => apiFetch('/api/cashier/session').then(res => res.json())
  });

  const { data: logs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiFetch('/api/audit-logs').then(res => res.json())
  });

  const openCashierMutation = useMutation({
    mutationFn: (balance: number) => 
      apiFetch('/api/cashier/open', {
        method: 'POST',
        body: JSON.stringify({ openingBalance: balance })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session'] });
      setShowOpenCashier(false);
      navigate('/pos');
    }
  });

  const closeCashierMutation = useMutation({
    mutationFn: () => apiFetch('/api/cashier/close', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session'] });
    }
  });

  const handleOpenCashier = (e: React.FormEvent) => {
    e.preventDefault();
    openCashierMutation.mutate(openingBalance);
  };

  const cards = [
    { 
      label: 'Faturamento Hoje', 
      value: `R$ ${stats?.salesToday?.toFixed(2) || '0.00'}`, 
      sub: `${stats?.salesCountToday || 0} vendas realizadas`,
      icon: DollarSign,
      color: 'text-cherry',
      bg: 'bg-cherry/10'
    },
    { 
      label: 'Ticket Médio', 
      value: `R$ ${stats?.averageTicket?.toFixed(2) || '0.00'}`, 
      sub: 'Valor médio por venda',
      icon: TrendingUp,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      label: 'Lucro Bruto', 
      value: `R$ ${stats?.grossProfit?.toFixed(2) || '0.00'}`, 
      sub: 'Receita - Custo',
      icon: Percent,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    { 
      label: 'Mais Vendido', 
      value: stats?.bestProduct || 'Nenhum', 
      sub: 'Produto destaque',
      icon: Star,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    { 
      label: 'Estoque Baixo', 
      value: stats?.lowStockCount || 0, 
      sub: 'Produtos em alerta',
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    { 
      label: 'Produtos Ativos', 
      value: stats?.activeProductsCount || 0, 
      sub: 'No catálogo',
      icon: Package,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Resumo do desempenho da sua loja.</p>
        </div>
        <div className="flex gap-3">
          {!session ? (
            <button 
              onClick={() => setShowOpenCashier(true)}
              className="btn-cherry"
            >
              <Banknote className="w-5 h-5" />
              Abrir Caixa
            </button>
          ) : (
            <button 
              onClick={() => navigate('/pos')}
              className="btn-cherry"
            >
              <ShoppingCart className="w-5 h-5" />
              Ir ao PDV
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{card.label}</p>
              <h3 className="text-lg font-bold text-white mt-1 truncate" title={String(card.value)}>{card.value}</h3>
              <p className="text-zinc-600 text-[10px] mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-white">Faturamento (Últimos 7 dias)</h2>
            <DollarSign className="w-5 h-5 text-zinc-500" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.chartData || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4d94" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff4d94" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#ff4d94', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="#ff4d94" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Count Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-white">Vendas (Últimos 7 dias)</h2>
            <ShoppingCart className="w-5 h-5 text-zinc-500" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={10}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Bar dataKey="sales" name="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cherry" />
              <h2 className="font-bold text-white">Atividade Recente</h2>
            </div>
            <button onClick={() => navigate('/reports')} className="text-xs text-zinc-500 hover:text-zinc-300 uppercase tracking-wider font-bold">Ver Relatórios</button>
          </div>
          <div className="divide-y divide-zinc-800">
            {Array.isArray(logs) && logs.slice(0, 10).map((log: any) => (
              <div key={log.id} className="p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                  log.action.includes('CREATE') ? 'bg-cherry/10 text-cherry' :
                  log.action.includes('SALE') ? 'bg-blue-500/10 text-blue-500' :
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  {log.action.substring(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-200">
                    <span className="font-bold">{log.user?.name}</span> executou <span className="text-zinc-400">{log.action}</span> em <span className="text-zinc-400">{log.resource}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {(!Array.isArray(logs) || logs.length === 0) && (
              <div className="p-12 text-center text-zinc-500 italic">Nenhuma atividade registrada.</div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">Estoque Baixo</h2>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-4">
              {stats?.lowStockProducts?.map((product: any) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-white">{product.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">{product.stock} {product.unit}</p>
                    <p className="text-[10px] text-zinc-600">Mín: {product.minStock}</p>
                  </div>
                </div>
              ))}
              {(!stats?.lowStockProducts || stats.lowStockProducts.length === 0) && (
                <p className="text-center text-zinc-600 text-sm py-4 italic">Tudo em dia com o estoque!</p>
              )}
            </div>
            <button 
              onClick={() => navigate('/inventory')}
              className="w-full mt-6 btn-zinc !text-xs !py-2"
            >
              Ver Inventário Completo
            </button>
          </div>

          <div className="bg-cherry/10 border border-cherry/20 rounded-2xl p-6">
            <h2 className="font-bold text-cherry mb-2">Dica do Dia</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Mantenha seu estoque de colas sempre atualizado. Verifique a validade semanalmente para garantir a melhor retenção para suas clientes.
            </p>
          </div>
        </div>
      </div>

      {/* Open Cashier Modal */}
      {showOpenCashier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Abrir Caixa</h2>
              <button onClick={() => setShowOpenCashier(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleOpenCashier} className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-16 h-16 bg-cherry/10 rounded-full flex items-center justify-center mb-4">
                  <Banknote className="w-8 h-8 text-cherry" />
                </div>
                <p className="text-zinc-400 text-sm">Informe o valor inicial em dinheiro para o fundo de caixa.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Saldo Inicial (R$)</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  autoFocus
                  value={openingBalance}
                  onChange={e => setOpeningBalance(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-2xl font-bold text-white text-center focus:outline-none focus:ring-2 focus:ring-cherry/50"
                />
              </div>
              <button 
                type="submit"
                disabled={openCashierMutation.isPending}
                className="w-full btn-cherry py-4 text-lg"
              >
                {openCashierMutation.isPending ? 'Abrindo...' : 'Abrir Caixa Agora'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
