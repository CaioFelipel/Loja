import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  ArrowDown, 
  ArrowUp,
  Download,
  Calendar,
  RotateCcw,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../lib/api';

export default function Reports() {
  const queryClient = useQueryClient();
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => apiFetch('/api/sales').then(res => res.json())
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiFetch('/api/reports/dashboard').then(res => res.json())
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
    window.location.href = '/api/reports/export/sales';
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
    
    // Table
    const tableData = sales.map((sale: any) => [
      sale.id.substring(0, 8).toUpperCase(),
      new Date(sale.createdAt).toLocaleDateString(),
      sale.customer?.name || 'Consumidor Final',
      sale.paymentMethod,
      `R$ ${sale.total.toFixed(2)}`,
      sale.status === 'VOIDED' ? 'ESTORNADA' : 'CONCLUÍDA'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['ID', 'Data', 'Cliente', 'Pagamento', 'Total', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20] },
      styles: { fontSize: 9 }
    });

    doc.save('relatorio-vendas.pdf');
    toast.success('PDF gerado com sucesso!');
  };

  const activeSales = sales?.filter((s: any) => s.status !== 'VOIDED') || [];
  const totalRevenue = activeSales.reduce((acc: number, s: any) => acc + s.total, 0) || 0;
  const totalSales = activeSales.length || 0;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  const categoryTotal = Object.values(stats?.categoryStats || {}).reduce((a: any, b: any) => a + b, 0) as number;
  const paymentTotal = stats?.salesByPayment?.reduce((acc: number, p: any) => acc + (p._sum.total || 0), 0) || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-zinc-400 mt-1">Analise o desempenho da sua loja.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            className="btn-zinc"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Exportar CSV
          </button>
          <button 
            onClick={handleExportPDF}
            className="btn-zinc !text-white !bg-zinc-800"
          >
            <FileText className="w-5 h-5" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-black">Relatório de Vendas - Cerejeira</h1>
        <p className="text-zinc-600">Gerado em: {new Date().toLocaleString()}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Faturamento Total</p>
          <h3 className="text-3xl font-bold text-white">R$ {totalRevenue.toFixed(2)}</h3>
          <div className="flex items-center gap-2 text-cherry text-xs font-bold mt-4">
            <ArrowUp className="w-3 h-3" />
            12% em relação ao mês anterior
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Total de Vendas</p>
          <h3 className="text-3xl font-bold text-white">{totalSales}</h3>
          <div className="flex items-center gap-2 text-cherry text-xs font-bold mt-4">
            <ArrowUp className="w-3 h-3" />
            5% em relação ao mês anterior
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Ticket Médio</p>
          <h3 className="text-3xl font-bold text-white">R$ {averageTicket.toFixed(2)}</h3>
          <div className="flex items-center gap-2 text-red-500 text-xs font-bold mt-4">
            <ArrowDown className="w-3 h-3" />
            2% em relação ao mês anterior
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cherry" />
              Vendas Recentes
            </h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {Array.isArray(sales) && sales.slice(0, 10).map((sale: any) => (
              <div key={sale.id} className={`p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors ${sale.status === 'VOIDED' ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">#{sale.id.substring(0, 8)}</p>
                    <p className="text-xs text-zinc-500">{new Date(sale.createdAt).toLocaleString()}</p>
                  </div>
                  {sale.status === 'VOIDED' && (
                    <span className="text-[10px] font-bold bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase">Estornada</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${sale.status === 'VOIDED' ? 'text-zinc-500 line-through' : 'text-cherry'}`}>
                      R$ {sale.total.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">{sale.paymentMethod}</p>
                  </div>
                  {sale.status !== 'VOIDED' && (
                    <div className="flex items-center gap-2">
                      {voidingId === sale.id ? (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => voidMutation.mutate(sale.id)}
                            disabled={voidMutation.isPending}
                            className="px-2 py-1 text-[10px] font-bold bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {voidMutation.isPending ? '...' : 'Confirmar'}
                          </button>
                          <button 
                            onClick={() => setVoidingId(null)}
                            className="px-2 py-1 text-[10px] font-bold bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setVoidingId(sale.id)}
                          className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Estornar Venda"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder for Charts */}
        <div className="space-y-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
            <BarChart3 className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-white font-bold mb-2">Vendas por Categoria</h3>
            <p className="text-zinc-500 text-sm max-w-xs">Desempenho de cada categoria de produto em valor vendido.</p>
            <div className="mt-8 w-full space-y-3">
              {stats?.categoryStats && typeof stats.categoryStats === 'object' && !Array.isArray(stats.categoryStats) && Object.entries(stats.categoryStats).map(([cat, val]: any, i) => {
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
                <p className="text-zinc-600 text-xs italic">Nenhum dado disponível.</p>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
            <PieChart className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-white font-bold mb-2">Métodos de Pagamento</h3>
            <p className="text-zinc-500 text-sm max-w-xs">Distribuição das formas de pagamento.</p>
            <div className="mt-8 w-full space-y-3">
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
                <p className="text-zinc-600 text-xs italic">Nenhum dado disponível.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
