import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';
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
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState<any>({
    name: '',
    sku: '',
    category: 'COLAS',
    description: '',
    stock: '',
    minStock: '5',
    price: '',
    costPrice: '',
    unit: 'UN',
    photo: ''
  });

  const generateSKU = (isEdit = false) => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const sku = `PROD-${random}`;
    if (isEdit) {
      setSelectedProduct({ ...selectedProduct, sku });
    } else {
      setNewProduct({ ...newProduct, sku });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEdit) {
        setSelectedProduct({ ...selectedProduct, photo: base64String });
      } else {
        setNewProduct({ ...newProduct, photo: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch('/api/products').then(res => res.json())
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => 
      apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(data)
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.details || err.error || 'Erro ao adicionar produto');
        }
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto adicionado com sucesso!');
      setShowAddModal(false);
      setNewProduct({
        name: '',
        sku: '',
        category: 'COLAS',
        description: '',
        stock: '',
        minStock: '5',
        price: '',
        costPrice: '',
        unit: 'UN',
        photo: ''
      });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const editMutation = useMutation({
    mutationFn: (data: any) => 
      apiFetch(`/api/products/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.details || err.error || 'Erro ao atualizar produto');
        }
        return res.json();
      }),
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
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      apiFetch(`/api/products/${id}`, {
        method: 'DELETE'
      }).then(res => {
        if (!res.ok) throw new Error('Erro ao excluir produto. Verifique se existem vendas vinculadas.');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto excluído com sucesso!');
      setShowEditModal(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const categories = Array.from(new Set([
    'COLAS', 'CILIOS', 'ACESSORIOS', 'OUTROS',
    ...(products?.map((p: any) => p.category) || [])
  ])).sort();

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const upperCategory = newCategoryName.trim().toUpperCase();
      if (showAddModal) {
        setNewProduct({ ...newProduct, category: upperCategory });
      } else if (showEditModal) {
        setSelectedProduct({ ...selectedProduct, category: upperCategory });
      }
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const { data: stockHistory } = useQuery({
    queryKey: ['stock-history', selectedProduct?.id],
    queryFn: () => apiFetch(`/api/products/${selectedProduct.id}/history`).then(res => res.json()),
    enabled: !!selectedProduct && showHistoryModal
  });

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedProduct(null);
    setShowDeleteConfirm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...newProduct,
      price: Number(newProduct.price) || 0,
      costPrice: Number(newProduct.costPrice) || 0,
      stock: Number(newProduct.stock) || 0,
      minStock: Number(newProduct.minStock) || 0,
    };
    addMutation.mutate(data);
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
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-cherry/10 rounded-2xl flex items-center justify-center text-cherry">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Estoque</h1>
            <p className="text-zinc-500 text-sm">Gerencie seus produtos e movimentações</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex-1 md:flex-none px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 border border-zinc-700"
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex-1 md:flex-none px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 border border-zinc-700"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none px-6 py-2.5 bg-cherry text-white rounded-xl font-bold hover:bg-cherry-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-cherry/20"
          >
            <Plus className="w-5 h-5" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-cherry transition-colors" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 md:flex-none px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </button>
          <button className="flex-1 md:flex-none px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            Ordenar
          </button>
        </div>
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
        <div className="md:hidden">
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {Array.isArray(filteredProducts) && filteredProducts.map((product: any) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={product.id} 
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-zinc-700">
                      {product.photo ? (
                        <img src={product.photo} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Package className="w-8 h-8 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-white font-bold truncate">{product.name}</h3>
                        <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-zinc-700 shrink-0">
                          {product.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">SKU: {product.sku}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Estoque</p>
                      <p className={`font-bold ${product.stock <= product.minStock ? 'text-red-500' : 'text-white'}`}>
                        {product.stock} {product.unit}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Preço Venda</p>
                      <p className="text-emerald-500 font-bold text-lg">R$ {product.price.toFixed(2)}</p>
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
                        className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800 rounded-xl border border-zinc-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowHistoryModal(true);
                        }}
                        className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800 rounded-xl border border-zinc-700"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {isLoading && (
          <div className="p-12 text-center text-zinc-500">Carregando estoque...</div>
        )}
        {!isLoading && filteredProducts?.length === 0 && (
          <div className="p-12 text-center text-zinc-500 italic">Nenhum produto encontrado.</div>
        )}
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cherry/10 rounded-xl flex items-center justify-center text-cherry">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Novo Produto</h2>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Image Section */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Foto do Produto</label>
                    <div className="relative group">
                      <div className="aspect-square bg-zinc-800 rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center overflow-hidden transition-colors group-hover:border-cherry/50">
                        {newProduct.photo ? (
                          <>
                            <img src={newProduct.photo} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setNewProduct({ ...newProduct, photo: '' })}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center text-zinc-500">
                            <Camera className="w-10 h-10 mb-2" />
                            <span className="text-xs">Clique para enviar</span>
                          </div>
                        )}
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2 text-center">Formatos: JPG, PNG, WEBP (Máx 5MB)</p>
                  </div>

                  {/* Info Section */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Nome do Produto</label>
                        <input 
                          required
                          type="text"
                          value={newProduct.name}
                          onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                          placeholder="Ex: Cílios Volume Russo Mix"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">SKU / Código</label>
                        <div className="relative">
                          <input 
                            required
                            type="text"
                            value={newProduct.sku}
                            onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 pr-10"
                          />
                          <button 
                            type="button"
                            onClick={() => generateSKU()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-cherry transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Categoria</label>
                        {isAddingCategory ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={newCategoryName}
                              onChange={e => setNewCategoryName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                              placeholder="Nova categoria..."
                              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                            />
                            <button
                              type="button"
                              onClick={handleAddCategory}
                              className="px-3 bg-cherry text-white rounded-xl hover:bg-cherry-dark transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsAddingCategory(false)}
                              className="px-3 bg-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <select 
                            value={newProduct.category}
                            onChange={e => {
                              if (e.target.value === 'ADD_NEW') {
                                setIsAddingCategory(true);
                              } else {
                                setNewProduct({...newProduct, category: e.target.value});
                              }
                            }}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="ADD_NEW" className="text-cherry font-bold">+ Adicionar Nova...</option>
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Unidade</label>
                        <select 
                          value={newProduct.unit}
                          onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                        >
                          <option value="UN">Unidade (UN)</option>
                          <option value="PCT">Pacote (PCT)</option>
                          <option value="CX">Caixa (CX)</option>
                          <option value="ML">Mililitro (ML)</option>
                          <option value="PAR">Par (PAR)</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Descrição</label>
                        <textarea 
                          value={newProduct.description}
                          onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                          rows={2}
                          placeholder="Detalhes do produto..."
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Preço Venda</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        value={newProduct.price}
                        onFocus={e => e.target.select()}
                        onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Preço Custo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        value={newProduct.costPrice}
                        onFocus={e => e.target.select()}
                        onChange={e => setNewProduct({...newProduct, costPrice: e.target.value})}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Estoque Inicial</label>
                    <input 
                      required
                      type="number"
                      value={newProduct.stock}
                      onFocus={e => e.target.select()}
                      onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Estoque Mínimo</label>
                    <input 
                      required
                      type="number"
                      value={newProduct.minStock}
                      onFocus={e => e.target.select()}
                      onChange={e => setNewProduct({...newProduct, minStock: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={addMutation.isPending}
                    className="flex-1 px-4 py-3 bg-cherry text-white rounded-xl font-bold hover:bg-cherry-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {addMutation.isPending ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Produto'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {showEditModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cherry/10 rounded-xl flex items-center justify-center text-cherry">
                    <Edit2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Editar Produto</h2>
                </div>
                <button onClick={handleCloseEditModal} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = {
                    ...selectedProduct,
                    price: Number(selectedProduct.price) || 0,
                    costPrice: Number(selectedProduct.costPrice) || 0,
                    stock: Number(selectedProduct.stock) || 0,
                    minStock: Number(selectedProduct.minStock) || 0,
                  };
                  editMutation.mutate(data);
                }} 
                className="p-6 space-y-6 overflow-y-auto"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Image Section */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Foto do Produto</label>
                    <div className="relative group">
                      <div className="aspect-square bg-zinc-800 rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center overflow-hidden transition-colors group-hover:border-cherry/50">
                        {selectedProduct.photo ? (
                          <>
                            <img src={selectedProduct.photo} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setSelectedProduct({ ...selectedProduct, photo: '' })}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center text-zinc-500">
                            <Camera className="w-10 h-10 mb-2" />
                            <span className="text-xs">Clique para enviar</span>
                          </div>
                        )}
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, true)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2 text-center">Formatos: JPG, PNG, WEBP (Máx 5MB)</p>
                  </div>

                  {/* Info Section */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Nome do Produto</label>
                        <input 
                          required
                          type="text"
                          value={selectedProduct.name}
                          onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">SKU / Código</label>
                        <div className="relative">
                          <input 
                            required
                            type="text"
                            value={selectedProduct.sku}
                            onChange={e => setSelectedProduct({...selectedProduct, sku: e.target.value})}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 pr-10"
                          />
                          <button 
                            type="button"
                            onClick={() => generateSKU(true)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-cherry transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Categoria</label>
                        {isAddingCategory ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={newCategoryName}
                              onChange={e => setNewCategoryName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                              placeholder="Nova categoria..."
                              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                            />
                            <button
                              type="button"
                              onClick={handleAddCategory}
                              className="px-3 bg-cherry text-white rounded-xl hover:bg-cherry-dark transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsAddingCategory(false)}
                              className="px-3 bg-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <select 
                            value={selectedProduct.category}
                            onChange={e => {
                              if (e.target.value === 'ADD_NEW') {
                                setIsAddingCategory(true);
                              } else {
                                setSelectedProduct({...selectedProduct, category: e.target.value});
                              }
                            }}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="ADD_NEW" className="text-cherry font-bold">+ Adicionar Nova...</option>
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Unidade</label>
                        <select 
                          value={selectedProduct.unit}
                          onChange={e => setSelectedProduct({...selectedProduct, unit: e.target.value})}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                        >
                          <option value="UN">Unidade (UN)</option>
                          <option value="PCT">Pacote (PCT)</option>
                          <option value="CX">Caixa (CX)</option>
                          <option value="ML">Mililitro (ML)</option>
                          <option value="PAR">Par (PAR)</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Descrição</label>
                        <textarea 
                          value={selectedProduct.description || ''}
                          onChange={e => setSelectedProduct({...selectedProduct, description: e.target.value})}
                          rows={2}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Preço Venda</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        value={selectedProduct.price}
                        onFocus={e => e.target.select()}
                        onChange={e => setSelectedProduct({...selectedProduct, price: e.target.value})}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Preço Custo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        value={selectedProduct.costPrice}
                        onFocus={e => e.target.select()}
                        onChange={e => setSelectedProduct({...selectedProduct, costPrice: e.target.value})}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Estoque Atual</label>
                    <input 
                      required
                      type="number"
                      value={selectedProduct.stock}
                      onFocus={e => e.target.select()}
                      onChange={e => setSelectedProduct({...selectedProduct, stock: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Estoque Mínimo</label>
                    <input 
                      required
                      type="number"
                      value={selectedProduct.minStock}
                      onFocus={e => e.target.select()}
                      onChange={e => setSelectedProduct({...selectedProduct, minStock: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cherry/50"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <div className="flex-1 flex gap-3">
                    {showDeleteConfirm ? (
                      <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2">
                        <button 
                          type="button"
                          onClick={() => deleteMutation.mutate(selectedProduct.id)}
                          className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                        >
                          Confirmar Exclusão
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={deleteMutation.isPending}
                          className="px-4 py-3 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={handleCloseEditModal}
                          className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                  {!showDeleteConfirm && (
                    <button 
                      type="submit"
                      disabled={editMutation.isPending}
                      className="flex-1 px-4 py-3 bg-cherry text-white rounded-xl font-bold hover:bg-cherry-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {editMutation.isPending ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stock History Modal */}
      <AnimatePresence>
        {showHistoryModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Histórico de Estoque</h2>
                    <p className="text-zinc-500 text-sm truncate max-w-[300px]">{selectedProduct.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-3">
                  {Array.isArray(stockHistory) && stockHistory.map((move: any) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={move.id} 
                      className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                          move.type.includes('ENTRADA') 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {move.type.includes('ENTRADA') ? '+' : '-'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-cherry transition-colors">{move.type}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{move.reason || 'Sem observações'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-black ${move.type.includes('ENTRADA') ? 'text-emerald-500' : 'text-red-500'}`}>
                          {move.quantity} {selectedProduct.unit}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mt-1">
                          {new Date(move.createdAt).toLocaleDateString()} • {new Date(move.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {!stockHistory?.length && (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-600">
                        <History className="w-8 h-8" />
                      </div>
                      <p className="text-zinc-500 italic">Nenhuma movimentação registrada para este produto.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-800/20">
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all border border-zinc-700"
                >
                  Fechar Histórico
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
