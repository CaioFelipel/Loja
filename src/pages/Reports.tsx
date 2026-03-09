import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  ArrowDown, 
  ArrowUp,
  Download,
  Calendar
} from 'lucide-react';

export default function Reports() {
  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => fetch('/api/sales').then(res => res.json())
  });

  const totalRevenue = sales?.reduce((acc: number, s: any) => acc + s.total, 0) || 0;
  const totalSales = sales?.length || 0;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-zinc-400 mt-1">Analise o desempenho da sua loja.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-zinc">
            <Calendar className="w-5 h-5" />
            Últimos 30 dias
          </button>
          <button className="btn-zinc !text-white !bg-zinc-800">
            <Download className="w-5 h-5" />
            Exportar PDF
          </button>
        </div>
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
            {sales?.slice(0, 10).map((sale: any) => (
              <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-white">#{sale.id.substring(0, 8)}</p>
                  <p className="text-xs text-zinc-500">{new Date(sale.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-cherry">R$ {sale.total.toFixed(2)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">{sale.paymentMethod}</p>
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
            <p className="text-zinc-500 text-sm max-w-xs">Gráfico de barras mostrando o desempenho de cada categoria de produto.</p>
            <div className="mt-8 w-full space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase"><span>Cílios</span> <span>65%</span></div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-cherry w-[65%]"></div></div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase"><span>Colas</span> <span>20%</span></div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[20%]"></div></div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase"><span>Acessórios</span> <span>15%</span></div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-purple-500 w-[15%]"></div></div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
            <PieChart className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-white font-bold mb-2">Métodos de Pagamento</h3>
            <p className="text-zinc-500 text-sm max-w-xs">Distribuição das formas de pagamento preferidas pelas suas clientes.</p>
            <div className="mt-8 flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-cherry rounded-full"></div> <span className="text-[10px] font-bold text-zinc-400 uppercase">Pix</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> <span className="text-[10px] font-bold text-zinc-400 uppercase">Cartão</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> <span className="text-[10px] font-bold text-zinc-400 uppercase">Dinheiro</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
