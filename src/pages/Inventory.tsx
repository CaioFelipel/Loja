import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  History,
  AlertCircle,
  Package,
  ArrowUpDown,
  X,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'COLAS',
    stock: 0,
    minStock: 5,
    price: 0,
    costPrice: 0,
    unit: 'UN',
    photo: ''
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(res => res.json())
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto adicionado com sucesso!');
      setShowAddModal(false);
      setNewProduct({
        name: '',
        sku: '',
        category: 'COLAS',
        stock: 0,
        minStock: 5,
        price: 0,
        costPrice: 0,
        unit: 'UN',
        photo: ''
      });
    }
  });

  const editMutation = useMutation({
    mutationFn: (data: any) => 
      fetch(`/api/products/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado com sucesso!');
      setShowEditModal(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const { data: stockHistory } = useQuery({
    queryKey: ['stock-history', selectedProduct?.id],
    queryFn: () => fetch(`/api/products/${selectedProduct.id}/history`).then(res => res.json()),
    enabled: !!selectedProduct && showHistoryModal
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(newProduct);
  };

  const filteredProducts = Array.isArray(products) ? products.filter((p: any) => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const handleExportCSV = () => {
    window.location.href = '/api/reports/export/products';
    toast.success('Exportação CSV iniciada...');
  };

  const handleExportPDF = () => {
    if (!products || products.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    toast.info('Gerando PDF...');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório de Estoque - CEREJEIRA', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = Array.isArray(products) ? products.map((p: any) => [
      p.sku,
      p.name,
      p.category,
      `${p.stock} ${p.unit}`,
      `R$ ${p.price.toFixed(2)}`,
      p.stock <= p.minStock ? 'BAIXO' : 'NORMAL'
    ]) : [];

    autoTable(doc, {
      startY: 40,
      head: [['SKU', 'Nome', 'Categoria', 'Estoque', 'Preço', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20] },
      styles: { fontSize: 9 }
    });

    doc.save('relatorio-estoque.pdf');
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Estoque</h1>
          <p className="text-zinc-400 mt-1">Gerencie seus produtos e movimentações.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-cherry"
        >
          <Plus className="w-5 h-5" />
          Novo Produto
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
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
        <button className="btn-zinc">
          <Filter className="w-5 h-5" />
          Filtros
        </button>
        <button className="btn-zinc">
          <ArrowUpDown className="w-5 h-5" />
          Ordenar
        </button>
      </div>

      {/* Table / Cards */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">Produto</th>
                <th className="px-6 py-4 font-bold">Categoria</th>
                <th className="px-6 py-4 font-bold text-center">Estoque</th>
                <th className="px-6 py-4 font-bold text-right">Preço Venda</th>
                <th className="px-6 py-4 font-bold text-right">Preço Custo</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {Array.isArray(filteredProducts) && filteredProducts.map((product: any) => (
                <tr key={product.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                        {product.photo ? (
                          <img src={product.photo} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{product.name}</p>
                        <p className="text-xs text-zinc-500">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase px-2 py-1 rounded-md">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-bold ${product.stock <= product.minStock ? 'text-red-500' : 'text-white'}`}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-cherry font-bold">
                    R$ {product.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-500">
                    R$ {product.costPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {product.stock <= product.minStock ? (
                      <div className="flex items-center justify-center gap-1 text-red-500 text-[10px] font-bold uppercase">
                        <AlertCircle className="w-3 h-3" />
                        Baixo
                      </div>
                    ) : (
                      <div className="text-emerald-500 text-[10px] font-bold uppercase">Normal</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowHistoryModal(true);
                        }}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-zinc-800">
          {Array.isArray(filteredProducts) && filteredProducts.map((product: any) => (
            <div key={product.id} className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {product.photo ? (
                    <img src={product.photo} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Package className="w-6 h-6 text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-white font-bold truncate">{product.name}</h3>
                    <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0">
                      {product.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{product.sku}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-zinc-800/30 p-3 rounded-xl">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Estoque</p>
                  <p className={`font-bold ${product.stock <= product.minStock ? 'text-red-500' : 'text-white'}`}>
                    {product.stock} {product.unit}
                  </p>
                </div>
                <div className="bg-zinc-800/30 p-3 rounded-xl">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Preço Venda</p>
                  <p className="text-cherry font-bold">R$ {product.price.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {product.stock <= product.minStock ? (
                  <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold uppercase">
                    <AlertCircle className="w-3 h-3" />
                    Estoque Baixo
                  </div>
                ) : (
                  <div className="text-emerald-500 text-[10px] font-bold uppercase">Estoque Normal</div>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowHistoryModal(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="p-12 text-center text-zinc-500">Carregando estoque...</div>
        )}
        {!isLoading && filteredProducts?.length === 0 && (
          <div className="p-12 text-center text-zinc-500 italic">Nenhum produto encontrado.</div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Novo Produto</h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">URL da Foto</label>
                  <input 
                    type="text"
                    value={newProduct.photo}
                    onChange={e => setNewProduct({...newProduct, photo: e.target.value})}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Nome do Produto</label>
                  <input 
                    required
                    type="text"
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">SKU</label>
                  <input 
                    required
                    type="text"
                    value={newProduct.sku}
                    onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Categoria</label>
                  <select 
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none"
                  >
                    <option value="COLAS">Colas</option>
                    <option value="CILIOS">Cílios</option>
                    <option value="ACESSORIOS">Acessórios</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Preço Venda</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Preço Custo</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={newProduct.costPrice}
                    onChange={e => setNewProduct({...newProduct, costPrice: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Estoque Inicial</label>
                  <input 
                    required
                    type="number"
                    value={newProduct.stock}
                    onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Estoque Mínimo</label>
                  <input 
                    required
                    type="number"
                    value={newProduct.minStock}
                    onChange={e => setNewProduct({...newProduct, minStock: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
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
                  {addMutation.isPending ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Editar Produto</h2>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                editMutation.mutate(selectedProduct);
              }} 
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">URL da Foto</label>
                  <input 
                    type="text"
                    value={selectedProduct.photo || ''}
                    onChange={e => setSelectedProduct({...selectedProduct, photo: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Nome do Produto</label>
                  <input 
                    required
                    type="text"
                    value={selectedProduct.name}
                    onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">SKU</label>
                  <input 
                    required
                    type="text"
                    value={selectedProduct.sku}
                    onChange={e => setSelectedProduct({...selectedProduct, sku: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Categoria</label>
                  <select 
                    value={selectedProduct.category}
                    onChange={e => setSelectedProduct({...selectedProduct, category: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none"
                  >
                    <option value="COLAS">Colas</option>
                    <option value="CILIOS">Cílios</option>
                    <option value="ACESSORIOS">Acessórios</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Preço Venda</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={selectedProduct.price}
                    onChange={e => setSelectedProduct({...selectedProduct, price: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Preço Custo</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={selectedProduct.costPrice}
                    onChange={e => setSelectedProduct({...selectedProduct, costPrice: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Estoque Atual</label>
                  <input 
                    required
                    type="number"
                    value={selectedProduct.stock}
                    onChange={e => setSelectedProduct({...selectedProduct, stock: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 text-left">Estoque Mínimo</label>
                  <input 
                    required
                    type="number"
                    value={selectedProduct.minStock}
                    onChange={e => setSelectedProduct({...selectedProduct, minStock: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 btn-zinc"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={editMutation.isPending}
                  className="flex-1 btn-cherry"
                >
                  {editMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showHistoryModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Histórico de Estoque</h2>
                <p className="text-zinc-500 text-sm">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {Array.isArray(stockHistory) && stockHistory.map((move: any) => (
                  <div key={move.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        move.type.includes('ENTRADA') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {move.type.includes('ENTRADA') ? '+' : '-'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{move.type}</p>
                        <p className="text-xs text-zinc-500">{move.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${move.type.includes('ENTRADA') ? 'text-emerald-500' : 'text-red-500'}`}>
                        {move.quantity} {selectedProduct.unit}
                      </p>
                      <p className="text-[10px] text-zinc-600">{new Date(move.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {!stockHistory?.length && (
                  <div className="py-12 text-center text-zinc-500 italic">Nenhuma movimentação registrada.</div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800 bg-zinc-800/30">
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="w-full btn-zinc"
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
