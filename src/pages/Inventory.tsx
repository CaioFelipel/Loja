import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  History,
  AlertCircle,
  Package,
  ArrowUpDown,
  X
} from 'lucide-react';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'COLAS',
    stock: 0,
    minStock: 5,
    price: 0,
    costPrice: 0,
    unit: 'UN'
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
      setShowAddModal(false);
      setNewProduct({
        name: '',
        sku: '',
        category: 'COLAS',
        stock: 0,
        minStock: 5,
        price: 0,
        costPrice: 0,
        unit: 'UN'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(newProduct);
  };

  const filteredProducts = products?.filter((p: any) => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

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
        <button className="btn-zinc">
          <Filter className="w-5 h-5" />
          Filtros
        </button>
        <button className="btn-zinc">
          <ArrowUpDown className="w-5 h-5" />
          Ordenar
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
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
            {filteredProducts?.map((product: any) => (
              <tr key={product.id} className="hover:bg-zinc-800/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-zinc-500" />
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
                    <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">Carregando estoque...</td>
              </tr>
            )}
            {!isLoading && filteredProducts?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 italic">Nenhum produto encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Novo Produto</h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
