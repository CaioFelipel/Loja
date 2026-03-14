import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  ArrowDown, 
  ArrowUp,
  Calendar,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Users,
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Percent,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';

export default function Reports() {
  const queryClient = useQueryClient();
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [range, setRange] = useState('today');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', range],
    queryFn: () => apiFetch(`/api/reports/dashboard?range=${range}`).then(res => res.json())
  });

  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => apiFetch('/api/sales').then(res => res.json())
  });

  const voidMutation = useMutation({
    mutationFn: async (saleId: string) => {
      const res = await apiFetch(`/api/sales/${saleId}/void`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao estornar venda');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Venda estornada com sucesso!');
      setVoidingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
      setVoidingId(null);
    }
  });

  const handleExportCSV = () => {
    window.location.href = `/api/reports/export/sales?range=${range}`;
    toast.success('Exportação iniciada...');
  };

  const handleExportPDF = () => {
    if (!sales || sales.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    toast.info('Gerando PDF...');
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Relatório de Vendas - CEREJEIRA', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Período: ${range === 'today' ? 'Hoje' : range === 'yesterday' ? 'Ontem' : range === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}`, 14, 36);
    
    // Table
    const tableData = (sales || []).map((sale: any) => [
      sale.id.substring(0, 8).toUpperCase(),
      new Date(sale.createdAt).toLocaleDateString(),
      sale.customer?.name || 'Consumidor Final',
      sale.paymentMethod,
      `R$ ${sale.total.toFixed(2)}`,
      sale.status === 'VOIDED' ? 'ESTORNADA' : 'CONCLUÍDA'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['ID', 'Data', 'Cliente', 'Pagamento', 'Total', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20] },
      styles: { fontSize: 9 }
    });

    doc.save(`relatorio-vendas-${range}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const ranges = [
    { id: 'today', label: 'Hoje' },
    { id: 'yesterday', label: 'Ontem' },
    { id: '7d', label: '7 Dias' },
    { id: '30d', label: '30 Dias' },
  ];

  const categoryTotal = Object.values(stats?.categoryStats || {}).reduce((a: any, b: any) => a + b, 0) as number;
  const paymentTotal = stats?.salesByPayment?.reduce((acc: number, p: any) => acc + (p._sum.total || 0), 0) || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-zinc-400 mt-1">Analise o desempenho da sua loja.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {ranges.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  range === r.id ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button 
            onClick={handleExportCSV}
            className="btn-zinc"
          >
            <FileSpreadsheet className="w-5 h-5" />
            CSV
          </button>
          <button 
            onClick={handleExportPDF}
            className="btn-zinc !text-white !bg-zinc-800"
          >
            <FileText className="w-5 h-5" />
            PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cherry/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-cherry" />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Faturamento</p>
          </div>
          <h3 className="text-2xl font-bold text-white">R$ {stats?.salesToday?.toFixed(2) || '0.00'}</h3>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Vendas</p>
          </div>
          <h3 className="text-2xl font-bold text-white">{stats?.salesCountToday || 0}</h3>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Percent className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Lucro Bruto</p>
          </div>
          <h3 className="text-2xl font-bold text-white">R$ {stats?.grossProfit?.toFixed(2) || '0.00'}</h3>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Ticket Médio</p>
          </div>
          <h3 className="text-2xl font-bold text-white">R$ {stats?.averageTicket?.toFixed(2) || '0.00'}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales by User */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Vendas por Usuário
            </h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {stats?.userStats?.map((user: any) => (
              <div key={user.userName} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{user.userName}</p>
                  <p className="text-xs text-zinc-500">{user.count} vendas</p>
                </div>
                <p className="text-sm font-bold text-white">R$ {user.total.toFixed(2)}</p>
              </div>
            ))}
            {(!stats?.userStats || stats.userStats.length === 0) && (
              <p className="p-8 text-center text-zinc-600 italic">Nenhum dado disponível.</p>
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Estoque Baixo
            </h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {stats?.lowStockProducts?.map((product: any) => (
              <div key={product.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{product.name}</p>
                  <p className="text-xs text-zinc-500">Mínimo: {product.minStock} {product.unit}</p>
                </div>
                <p className="text-sm font-bold text-red-500">{product.stock} {product.unit}</p>
              </div>
            ))}
            {(!stats?.lowStockProducts || stats.lowStockProducts.length === 0) && (
              <p className="p-8 text-center text-zinc-600 italic">Estoque em dia!</p>
            )}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-cherry" />
            <h3 className="text-white font-bold">Vendas por Categoria</h3>
          </div>
          <div className="space-y-4">
            {stats?.categoryStats && Object.entries(stats.categoryStats).map(([cat, val]: any, i) => {
              const percentage = categoryTotal > 0 ? (val / categoryTotal) * 100 : 0;
              const colors = ['bg-cherry', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500'];
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                    <span>{cat}</span> 
                    <span>R$ {val.toFixed(2)} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors[i % colors.length]}`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {!Object.keys(stats?.categoryStats || {}).length && (
              <p className="text-zinc-600 text-xs italic text-center py-8">Nenhum dado disponível.</p>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-blue-500" />
            <h3 className="text-white font-bold">Métodos de Pagamento</h3>
          </div>
          <div className="space-y-4">
            {Array.isArray(stats?.salesByPayment) && stats.salesByPayment.map((p: any, i: number) => {
              const percentage = paymentTotal > 0 ? ((p._sum.total || 0) / paymentTotal) * 100 : 0;
              const colors = ['bg-cherry', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500'];
              return (
                <div key={p.paymentMethod} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                    <span>{p.paymentMethod}</span> 
                    <span>R$ {(p._sum.total || 0).toFixed(2)} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors[i % colors.length]}`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {!stats?.salesByPayment?.length && (
              <p className="text-zinc-600 text-xs italic text-center py-8">Nenhum dado disponível.</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-cherry" />
            Vendas Recentes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">ID</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Data</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Cliente</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Pagamento</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Total</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {Array.isArray(sales) && sales.slice(0, 20).map((sale: any) => (
                <tr key={sale.id} className={cn("hover:bg-zinc-800/30 transition-colors", sale.status === 'VOIDED' && "opacity-50")}>
                  <td className="p-4 text-sm font-bold text-white">#{sale.id.substring(0, 8)}</td>
                  <td className="p-4 text-sm text-zinc-400">{new Date(sale.createdAt).toLocaleString()}</td>
                  <td className="p-4 text-sm text-zinc-300">{sale.customer?.name || 'Consumidor Final'}</td>
                  <td className="p-4">
                    <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded uppercase">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-right text-white">R$ {sale.total.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    {sale.status !== 'VOIDED' ? (
                      <button 
                        onClick={() => setVoidingId(sale.id)}
                        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Estornar Venda"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">Estornada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Void Confirmation Modal */}
      {voidingId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <RotateCcw className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Estornar Venda?</h2>
            <p className="text-zinc-400 text-sm mb-8">Esta ação não pode ser desfeita. Os produtos retornarão ao estoque.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setVoidingId(null)}
                className="flex-1 btn-zinc"
              >
                Cancelar
              </button>
              <button 
                onClick={() => voidMutation.mutate(voidingId)}
                disabled={voidMutation.isPending}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {voidMutation.isPending ? 'Estornando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
