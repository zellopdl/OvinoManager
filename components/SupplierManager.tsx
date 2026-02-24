
import React, { useState, useEffect } from 'react';
import { entityService } from '../services/entityService';
import { Supplier, Sheep, Status } from '../types';

interface SupplierManagerProps {
  initialData?: Supplier[];
  onRefresh?: () => void;
  sheep?: Sheep[];
}

const SupplierManager: React.FC<SupplierManagerProps> = ({ initialData, onRefresh, sheep = [] }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  // Estados para Modais Customizados
  const [itemToDelete, setItemToDelete] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    contato: '',
    celular: '',
    fornece: ''
  });

  const loadData = async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }
    try {
      setLoading(true);
      const data = await entityService.getAll('fornecedores');
      setSuppliers(data as Supplier[]);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setSuppliers(initialData);
      setLoading(false);
    }
  }, [initialData]);

  const formatPhone = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.substring(0, 11);
    if (value.length > 10) return value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (value.length > 5) return value.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    if (value.length > 2) return value.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    if (value.length > 0) return value.replace(/(\d{0,2})/, "($1");
    return value;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'celular') processedValue = formatPhone(value);
    else if (name === 'nome' || name === 'endereco' || name === 'contato' || name === 'fornece') processedValue = value.toUpperCase();
    
    setFormData({ ...formData, [name]: processedValue });

    if (name === 'nome') {
      const isDuplicate = suppliers.some(s => 
        s.nome.toLowerCase().trim() === processedValue.toLowerCase().trim() && s.id !== editingSupplier?.id
      );
      setWarning(isDuplicate && processedValue.trim() !== '' ? "Fornecedor já cadastrado!" : null);
    }
  };

  const addTag = (tag: string) => {
    const current = formData.fornece.trim();
    if (current.includes(tag)) return;
    const newVal = current ? `${current}, ${tag}` : tag;
    setFormData({ ...formData, fornece: newVal.toUpperCase() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || warning || isSaving) return;

    setIsSaving(true);
    try {
      if (editingSupplier) {
        await entityService.update('fornecedores', editingSupplier.id, formData);
      } else {
        await entityService.create('fornecedores', formData);
      }
      resetForm();
      await loadData();
    } catch (error: any) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const processDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    const item = itemToDelete;
    setItemToDelete(null); 
    try {
      await entityService.delete('fornecedores', item.id);
      await loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', endereco: '', contato: '', celular: '', fornece: '' });
    setEditingSupplier(null);
    setIsFormOpen(false);
    setWarning(null);
  };

  const handleEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      nome: s.nome,
      endereco: s.endereco || '',
      contato: s.contato || '',
      celular: s.celular || '',
      fornece: s.fornece || ''
    });
    setIsFormOpen(true);
    setWarning(null);
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex justify-between items-center mb-8 px-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚚</span>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Fornecedores</h2>
        </div>
        {!isFormOpen && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-black shadow-md transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
          >
            <span>➕</span> Novo Cadastro
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl mb-8 animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-widest">
            {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome / Razão Social *</label>
                <input 
                  autoFocus
                  disabled={isSaving}
                  name="nome"
                  type="text" 
                  className={`w-full p-3 bg-slate-50 border ${warning ? 'border-amber-400' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm uppercase`}
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="EX: FAZENDA SANTA LUZIA"
                  required
                />
                {warning && <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase tracking-tighter">{warning}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Suprimento</label>
                <div className="space-y-2">
                  <input 
                    disabled={isSaving}
                    name="fornece"
                    type="text" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none uppercase font-bold text-sm"
                    value={formData.fornece}
                    onChange={handleChange}
                    placeholder="EX: ANIMAIS, RAÇÃO, MEDICAMENTOS"
                  />
                  <div className="flex flex-wrap gap-2">
                    {['ANIMAIS', 'RAÇÃO', 'MEDICAMENTOS', 'SERVIÇOS'].map(tag => (
                      <button key={tag} type="button" onClick={() => addTag(tag)} className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 text-[8px] font-black text-slate-500 hover:text-emerald-600 border border-slate-200 rounded-lg transition-colors">+ {tag}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Localização</label>
                <input 
                  disabled={isSaving}
                  name="endereco"
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm uppercase"
                  value={formData.endereco}
                  onChange={handleChange}
                  placeholder="CIDADE - ESTADO"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Responsável</label>
                <input disabled={isSaving} name="contato" type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm uppercase" value={formData.contato} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp / Celular</label>
                <input disabled={isSaving} name="celular" type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.celular} onChange={handleChange} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <button type="button" onClick={resetForm} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              <button type="submit" disabled={!!warning || !formData.nome.trim() || isSaving} className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg uppercase text-[10px] tracking-widest">
                {isSaving ? 'Gravando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Empresa / Fazenda</th>
              <th className="px-6 py-4">Fornece</th>
              <th className="px-6 py-4">WhatsApp</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-800 uppercase text-xs">{s.nome}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{s.contato || 'S/ CONTATO'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">{s.fornece || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-emerald-600 font-black text-xs">{s.celular || '-'}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(s)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">✏️</button>
                    <button onClick={() => setItemToDelete(s)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🗑️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Excluir Fornecedor?</h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                A remoção de <span className="text-slate-900 font-black">{itemToDelete.nome}</span> não apagará o histórico das ovelhas, pois agora a origem é persistente como texto no registro do animal.
              </p>
            </div>
            <div className="flex p-4 gap-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 rounded-2xl transition-all">Cancelar</button>
              <button onClick={processDelete} className="flex-1 py-4 bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-24 right-8 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Sincronizando...
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
