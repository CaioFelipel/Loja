import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  User as UserIcon, 
  Phone, 
  Mail, 
  Calendar,
  ChevronRight,
  MessageSquare,
  X,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../lib/api';

export default function Customers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    code: '',
    address: '',
    observations: ''
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => apiFetch('/api/customers').then(res => res.json())
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => 
      apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente adicionado com sucesso!');
      setShowAddModal(false);
      setNewCustomer({ name: '', email: '', phone: '', code: '', address: '', observations: '' });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(newCustomer);
  };

  const filteredCustomers = Array.isArray(customers) ? customers.filter((c: any) => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  ) : [];

  const handleExportCSV = () => {
    window.location.href = '/api/reports/export/customers';
    toast.success('Exportação CSV iniciada...');
  };

  const handleExportPDF = () => {
    if (!customers || customers.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    toast.info('Gerando PDF...');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Lista de Clientes - CEREJEIRA', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = Array.isArray(customers) ? customers.map((c: any) => [
      c.code || '-',
      c.name,
      c.phone || '-',
      c.email || '-',
      new Date(c.createdAt).toLocaleDateString()
    ]) : [];

    autoTable(doc, {
      startY: 40,
      head: [['Código', 'Nome', 'Telefone', 'Email', 'Cadastro']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20] },
      styles: { fontSize: 9 }
    });

    doc.save('clientes.pdf');
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Clientes</h1>
          <p className="text-zinc-400 mt-1">Gerencie sua base de clientes e histórico.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-cherry"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 transition-all"
          />
        </div>
        <button onClick={handleExportCSV} className="btn-zinc">
          <FileSpreadsheet className="w-5 h-5" />
          CSV
        </button>
        <button onClick={handleExportPDF} className="btn-zinc">
          <FileText className="w-5 h-5" />
          PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers?.map((customer: any) => (
          <div key={customer.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all group">
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                <UserIcon className="w-6 h-6 text-zinc-400" />
              </div>
              <button className="p-2 text-zinc-600 hover:text-emerald-500 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-4">{customer.name}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Phone className="w-4 h-4" />
                {customer.phone || 'Não informado'}
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Mail className="w-4 h-4" />
                {customer.email || 'Não informado'}
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Calendar className="w-4 h-4" />
                Cliente desde {new Date(customer.createdAt).toLocaleDateString()}
              </div>
            </div>

            {customer.observations && (
              <div className="mt-6 pt-6 border-t border-zinc-800 flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-zinc-600 mt-1" />
                <p className="text-xs text-zinc-500 italic line-clamp-2">{customer.observations}</p>
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="col-span-full text-center py-12 text-zinc-500">Carregando clientes...</div>}
        {!isLoading && filteredCustomers?.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-500 italic">Nenhum cliente encontrado.</div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Novo Cliente</h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Código do Cliente</label>
                  <input 
                    type="text"
                    value={newCustomer.code}
                    onChange={e => setNewCustomer({...newCustomer, code: e.target.value})}
                    placeholder="Ex: CLI001"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Nome Completo</label>
                  <input 
                    required
                    type="text"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Endereço</label>
                <input 
                  type="text"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                  placeholder="Rua, Número, Bairro, Cidade"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Email</label>
                  <input 
                    type="email"
                    value={newCustomer.email}
                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Telefone</label>
                  <input 
                    type="tel"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Observações</label>
                <textarea 
                  rows={3}
                  value={newCustomer.observations}
                  onChange={e => setNewCustomer({...newCustomer, observations: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 resize-none"
                />
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
                  {addMutation.isPending ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
