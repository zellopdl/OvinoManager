
import React, { useState, useEffect } from 'react';
import { entityService } from '../services/entityService';
import { Paddock, Sheep, Status } from '../types';

interface PaddockManagerProps {
  initialData?: Paddock[];
  onRefresh?: () => void;
  sheep?: Sheep[];
}

const PaddockManager: React.FC<PaddockManagerProps> = ({ initialData, onRefresh, sheep = [] }) => {
  const [paddocks, setPaddocks] = useState<Paddock[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPaddock, setEditingPaddock] = useState<Paddock | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  // Estados para Controle de Modais Customizados
  const [itemToDelete, setItemToDelete] = useState<Paddock | null>(null);
  const [blockInfo, setBlockInfo] = useState<{ name: string, count: number } | null>(null);

  const [formData, setFormData] = useState({
    piquete: '',
    tamanho: '',
    lotacao: '0',
    grama: ''
  });

  const loadData = async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }
    try {
      setLoading(true);
      const data = await entityService.getAll('piquetes');
      setPaddocks(data as Paddock[]);
    } catch (error) {
      console.error('Erro ao carregar piquetes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setPaddocks(initialData);
      setLoading(false);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const processedValue = (name === 'piquete' || name === 'grama') ? value.toUpperCase() : value;
    
    setFormData({ ...formData, [name]: processedValue });

    if (name === 'piquete') {
      const isDuplicate = paddocks.some(p => 
        p.piquete.toLowerCase().trim() === processedValue.toLowerCase().trim() && p.id !== editingPaddock?.id
      );
      setWarning(isDuplicate && processedValue.trim() !== '' ? "Este piquete já existe!" : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !formData.piquete.trim() || warning) return;

    setIsSaving(true);
    const payload = {
      piquete: formData.piquete.trim().toUpperCase(),
      tamanho: formData.tamanho ? parseFloat(formData.tamanho.replace(',', '.')) : null,
      lotacao: parseFloat(formData.lotacao.replace(',', '.')) || 0,
      grama: formData.grama.trim().toUpperCase() || null
    };

    try {
      if (editingPaddock) {
        await entityService.update('piquetes', editingPaddock.id, payload);
      } else {
        await entityService.create('piquetes', payload);
      }
      resetForm();
      await loadData();
    } catch (error: any) {
      alert("Erro ao salvar piquete: " + (error.message || "Erro desconhecido"));
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
      await entityService.delete('piquetes', item.id);
      await loadData();
    } catch (error: any) {
      console.error("[PaddockManager] Falha na exclusão:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirmation = (item: Paddock) => {
    // Verificação de ovelhas ATIVAS (Bloqueio Total)
    const activeSheepList = (sheep || []).filter(s => {
      // Fix: Removed redundant string comparison that caused type narrowing overlap error
      const isStatusAtivo = s?.status === Status.ATIVO;
      return s?.piqueteId === item.id && isStatusAtivo;
    });

    if (activeSheepList.length > 0) {
      setBlockInfo({ name: item.piquete, count: activeSheepList.length });
      return;
    }

    // Se não houver ativos, abre confirmação
    setItemToDelete(item);
  };

  const resetForm = () => {
    setFormData({ piquete: '', tamanho: '', lotacao: '0', grama: '' });
    setEditingPaddock(null);
    setIsFormOpen(false);
    setWarning(null);
  };

  const handleEdit = (p: Paddock) => {
    setEditingPaddock(p);
    setFormData({
      piquete: p.piquete || '',
      tamanho: p.tamanho?.toString() || '',
      lotacao: p.lotacao?.toString() || '0',
      grama: p.grama || ''
    });
    setIsFormOpen(true);
    setWarning(null);
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌾</span>
          <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Gerenciar Piquetes</h2>
        </div>
        {!isFormOpen && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
          >
            <span>➕</span> Novo Piquete
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-8 rounded-2xl border border-emerald-100 shadow-lg mb-8 animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-widest">
            {editingPaddock ? 'Editar Piquete' : 'Cadastrar Novo Piquete'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Identificação *</label>
                <div className="relative">
                  <input 
                    autoFocus
                    disabled={isSaving}
                    name="piquete"
                    type="text" 
                    className={`w-full p-2.5 bg-slate-50 border ${warning ? 'border-amber-400' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase font-bold text-sm`}
                    value={formData.piquete}
                    onChange={handleChange}
                    placeholder="EX: PIQUETE 01"
                    required
                  />
                  {warning && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500">⚠️</div>}
                </div>
                {warning && <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase tracking-tighter">⚠️ {warning}</p>}
              </div>
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Grama</label>
                <input 
                  disabled={isSaving}
                  name="grama"
                  type="text" 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-bold text-sm"
                  value={formData.grama}
                  onChange={handleChange}
                  placeholder="EX: TIFTON 85"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tamanho (ha)</label>
                <input 
                  disabled={isSaving}
                  name="tamanho"
                  type="text" 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm"
                  value={formData.tamanho}
                  onChange={handleChange}
                  placeholder="EX: 2.5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lotação Máx. *</label>
                <input 
                  disabled={isSaving}
                  name="lotacao"
                  type="text" 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm"
                  value={formData.lotacao}
                  onChange={handleChange}
                  placeholder="EX: 20"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button 
                type="button"
                disabled={isSaving}
                onClick={resetForm}
                className="px-6 py-2.5 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={!!warning || isSaving}
                className={`px-8 py-2.5 text-white font-black rounded-xl shadow-md uppercase text-[10px] tracking-widest transition-colors ${
                  warning || isSaving ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSaving ? 'Gravando...' : editingPaddock ? 'Salvar Alterações' : 'Cadastrar Piquete'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && paddocks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2 rounded-full"></div>
            Sincronizando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Piquete</th>
                  <th className="px-6 py-4">Tipo de Grama</th>
                  <th className="px-6 py-4 text-center">Tamanho</th>
                  <th className="px-6 py-4 text-center">Lotação Máx.</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paddocks.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 uppercase text-xs">{p.piquete}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">REF: {p.id.split('-')[0]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.grama ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase border border-emerald-100">
                          {p.grama}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic text-[10px] font-bold uppercase">NÃO INFORMADA</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 font-bold text-xs">{p.tamanho !== null ? `${p.tamanho} ha` : '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-slate-700 text-xs">{p.lotacao}</span>
                      <span className="text-[9px] text-slate-400 ml-1 font-black uppercase">CAB.</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(p)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button 
                          disabled={loading}
                          onClick={() => openDeleteConfirmation(p)}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${loading ? 'opacity-20' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paddocks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-bold text-[10px] uppercase tracking-widest">
                      Nenhum piquete cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: BLOQUEIO POR DEPENDÊNCIA ATIVA */}
      {blockInfo && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-amber-100">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl animate-pulse">⚠️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-3">Piquete Ocupado</h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                Não é possível excluir o piquete:
                <span className="text-slate-900 mt-1 block font-black border-b-2 border-slate-100 pb-1">{blockInfo.name}</span>
              </p>
              
              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Ocupação Atual:</p>
                <p className="text-[12px] font-black text-amber-600 mt-1 uppercase">
                  Existem {blockInfo.count} ovelha(s) ATIVA(S) alocadas aqui.
                </p>
              </div>
              
              <p className="mt-6 text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">
                DICA: Transfira os animais para outro piquete antes de remover esta área.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setBlockInfo(null)}
                className="w-full py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                Entendi, vou transferir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAÇÃO DE EXCLUSÃO (LIMPO) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🗑️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Excluir Piquete?</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Esta ação removerá permanentemente a área:<br/>
                <span className="text-slate-900 mt-2 block border-b-2 border-rose-100 pb-1 font-black">{itemToDelete.piquete}</span>
              </p>
            </div>
            <div className="flex p-4 gap-3 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={processDelete}
                className="flex-1 py-4 bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && paddocks.length > 0 && (
        <div className="fixed bottom-24 right-8 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Sincronizando Banco...
        </div>
      )}
    </div>
  );
};

export default PaddockManager;
