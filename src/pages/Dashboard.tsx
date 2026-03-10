import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  X,
  Banknote
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showOpenCashier, setShowOpenCashier] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetch('/api/reports/dashboard').then(res => res.json())
  });

  const { data: session } = useQuery({
    queryKey: ['cashier-session'],
    queryFn: () => fetch('/api/cashier/session').then(res => res.json())
  });

  const { data: logs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => fetch('/api/audit-logs').then(res => res.json())
  });

  const openCashierMutation = useMutation({
    mutationFn: (balance: number) => 
      fetch('/api/cashier/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalance: balance })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-session'] });
      setShowOpenCashier(false);
      navigate('/pos');
    }
  });

  const closeCashierMutation = useMutation({
    mutationFn: () => fetch('/api/cashier/close', { method: 'POST' }).then(res => res.json()),
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
      label: 'Vendas Hoje', 
      value: `R$ ${stats?.salesToday?.toFixed(2) || '0.00'}`, 
      sub: `${stats?.salesCountToday || 0} vendas realizadas`,
      icon: TrendingUp,
      color: 'text-cherry',
      bg: 'bg-cherry/10'
    },
    { 
      label: 'Estoque Baixo', 
      value: stats?.lowStockCount || 0, 
      sub: 'Produtos abaixo do mínimo',
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    { 
      label: 'Contas a Pagar', 
      value: `R$ ${stats?.pendingPayables?.toFixed(2) || '0.00'}`, 
      sub: 'Total pendente',
      icon: CreditCard,
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    { 
      label: 'Produtos Ativos', 
      value: '15', 
      sub: 'No catálogo',
      icon: Package,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Bem-vindo, Lash Designer!</h1>
        <p className="text-zinc-400 mt-1">Aqui está o resumo da sua loja hoje.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 lg:p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className={`p-2 lg:p-3 rounded-xl ${card.bg}`}>
                  <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${card.color}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-zinc-400 text-xs lg:text-sm font-medium">{card.label}</p>
              <h3 className="text-xl lg:text-2xl font-bold text-white mt-1">{card.value}</h3>
              <p className="text-zinc-500 text-[10px] lg:text-xs mt-2">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cherry" />
              <h2 className="font-bold text-white">Atividade Recente</h2>
            </div>
            <button className="text-xs text-zinc-500 hover:text-zinc-300 uppercase tracking-wider font-bold">Ver Tudo</button>
          </div>
          <div className="divide-y divide-zinc-800">
            {logs?.map((log: any) => (
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
            {!logs?.length && (
              <div className="p-12 text-center text-zinc-500 italic">Nenhuma atividade registrada.</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4">Ações Rápidas</h2>
            <div className="grid grid-cols-1 gap-3">
              {!session ? (
                <button 
                  onClick={() => setShowOpenCashier(true)}
                  className="btn-zinc !justify-between !text-sm !font-medium !px-4 group"
                >
                  Abrir Caixa
                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/pos')}
                    className="btn-cherry !justify-between !text-sm !font-medium !px-4 group"
                  >
                    Caixa Aberto - Ir ao PDV
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button 
                    disabled={closeCashierMutation.isPending}
                    onClick={() => {
                      if (confirm('Deseja realmente fechar o caixa?')) {
                        closeCashierMutation.mutate();
                      }
                    }}
                    className="btn-zinc !justify-between !text-sm !font-medium !px-4 group border-red-500/50 hover:bg-red-500/10 text-red-500"
                  >
                    {closeCashierMutation.isPending ? 'Fechando...' : 'Fechar Caixa'}
                    <X className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </>
              )}
              <button 
                onClick={() => navigate('/pos')}
                className="btn-zinc !justify-between !text-sm !font-medium !px-4 group"
              >
                Nova Venda
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button 
                onClick={() => navigate('/inventory')}
                className="btn-zinc !justify-between !text-sm !font-medium !px-4 group"
              >
                Cadastrar Produto
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
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
