import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  ArrowUpRight,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AccountsPayable() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    description: '',
    amount: 0,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'OUTROS'
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts-payable'],
    queryFn: () => fetch('/api/accounts-payable').then(res => res.json())
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/accounts-payable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      setShowAddModal(false);
      setNewAccount({
        description: '',
        amount: 0,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        category: 'OUTROS'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(newAccount);
  };

  const payMutation = useMutation({
    mutationFn: ({ id, fromCashier }: { id: string, fromCashier: boolean }) =>
      fetch(`/api/accounts-payable/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCashier })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-session'] });
    }
  });

  const handlePay = (id: string) => {
    const fromCashier = window.confirm('Deseja abater este valor do caixa atual?');
    payMutation.mutate({ id, fromCashier });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Contas a Pagar</h1>
          <p className="text-zinc-400 mt-1">Controle seus gastos e obrigações financeiras.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-cherry"
        >
          <Plus className="w-5 h-5" />
          Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {accounts?.map((account: any) => (
          <div key={account.id} className={`bg-zinc-900 border ${account.status === 'PAID' ? 'border-zinc-800 opacity-60' : 'border-zinc-800'} rounded-2xl p-6 flex items-center justify-between group transition-all`}>
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                account.status === 'PAID' ? 'bg-zinc-800 text-zinc-500' : 'bg-red-500/10 text-red-500'
              }`}>
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{account.description}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Vencimento: {format(new Date(account.dueDate), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                  <span className="text-sm text-zinc-500 flex items-center gap-1 uppercase font-bold text-[10px] tracking-widest">
                    {account.category || 'Geral'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-12">
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Valor</p>
                <p className="text-xl font-bold text-white">R$ {account.amount.toFixed(2)}</p>
              </div>

              <div className="flex items-center gap-3">
                {account.status === 'PAID' ? (
                  <div className="flex items-center gap-2 text-cherry font-bold text-sm bg-cherry/10 px-4 py-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                    Pago
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-sm bg-amber-500/10 px-4 py-2 rounded-xl">
                      <Clock className="w-4 h-4" />
                      Pendente
                    </div>
                    <button 
                      onClick={() => handlePay(account.id)}
                      className="bg-zinc-800 hover:bg-cherry hover:text-white text-zinc-300 font-bold px-6 py-2 rounded-xl transition-all"
                    >
                      Baixar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && <div className="text-center py-12 text-zinc-500">Carregando contas...</div>}
        {!isLoading && accounts?.length === 0 && (
          <div className="text-center py-12 text-zinc-500 italic">Nenhuma conta cadastrada.</div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Nova Conta a Pagar</h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Descrição</label>
                <input 
                  required
                  type="text"
                  value={newAccount.description}
                  onChange={e => setNewAccount({...newAccount, description: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  placeholder="Ex: Aluguel, Energia, Fornecedor..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Valor (R$)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={newAccount.amount}
                    onChange={e => setNewAccount({...newAccount, amount: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Vencimento</label>
                  <input 
                    required
                    type="date"
                    value={newAccount.dueDate}
                    onChange={e => setNewAccount({...newAccount, dueDate: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Categoria</label>
                <select 
                  value={newAccount.category}
                  onChange={e => setNewAccount({...newAccount, category: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none"
                >
                  <option value="FORNECEDOR">Fornecedor</option>
                  <option value="ALUGUEL">Aluguel</option>
                  <option value="ENERGIA">Energia</option>
                  <option value="AGUA">Água</option>
                  <option value="INTERNET">Internet</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn-zinc"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex-1 btn-cherry"
                >
                  {addMutation.isPending ? 'Salvando...' : 'Salvar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
