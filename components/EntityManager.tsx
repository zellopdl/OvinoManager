
import React, { useState, useEffect } from 'react';
import { entityService } from '../services/entityService';
import { Sheep, Status } from '../types';

interface Entity {
  id: string;
  nome: string;
}

interface EntityManagerProps {
  title: string;
  tableName: string;
  icon: string;
  initialData?: Entity[];
  onRefresh?: () => void;
  sheep?: Sheep[];
}

const EntityManager: React.FC<EntityManagerProps> = ({ title, tableName, icon, initialData, onRefresh, sheep = [] }) => {
  const [entities, setEntities] = useState<Entity[]>(initialData || []);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  
  // Estados para Controle de Modais Customizados
  const [itemToDelete, setItemToDelete] = useState<Entity | null>(null);
  const [blockInfo, setBlockInfo] = useState<{ name: string, count: number } | null>(null);

  useEffect(() => {
    if (initialData) {
      setEntities(initialData);
    }
  }, [initialData]);

  const loadData = async () => {
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        const data = await entityService.getAll(tableName);
        setEntities(data);
      }
    } catch (err) {
      console.error("[EntityManager] Erro ao recarregar:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setInputValue(value);
    const isDuplicate = entities.some(ent => 
      ent.nome.trim().toUpperCase() === value.trim() && ent.id !== editingEntity?.id
    );
    setWarning(isDuplicate && value.trim() !== '' ? `Este registro já existe!` : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || warning || isSaving) return;

    setIsSaving(true);
    try {
      const payload = { nome: inputValue.trim() };
      if (editingEntity) {
        await entityService.update(tableName, editingEntity.id, payload);
      } else {
        await entityService.create(tableName, payload);
      }
      setInputValue('');
      setEditingEntity(null);
      setIsFormOpen(false);
      await loadData();
    } catch (error: any) {
      alert("Erro ao salvar: " + (error.message || "Erro de conexão."));
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
      await entityService.delete(tableName, item.id);
      await loadData();
    } catch (error: any) {
      console.error("[EntityManager] Falha na exclusão:", error);
      // Se o banco barrar (mesmo sem ovelhas ativas, por ex: histórico de pesos)
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirmation = (item: Entity) => {
    // 1. Verificação de ovelhas ATIVAS (Bloqueio Total)
    const activeSheepList = (sheep || []).filter(s => {
      // Fix: Removed redundant string comparison that caused type narrowing overlap error
      const isStatusAtivo = s?.status === Status.ATIVO;
      if (tableName === 'grupos') return s?.grupoId === item.id && isStatusAtivo;
      if (tableName === 'racas') return s?.racaId === item.id && isStatusAtivo;
      return false;
    });

    if (activeSheepList.length > 0) {
      // Em vez de alert(), abrimos o Modal de Bloqueio
      setBlockInfo({ name: item.nome, count: activeSheepList.length });
      return;
    }

    // 2. Se não houver ativos, abre confirmação de exclusão
    setItemToDelete(item);
  };

  const resetForm = () => {
    setEditingEntity(null);
    setInputValue('');
    setWarning(null);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h2>
        </div>
        <button 
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
        >
          ➕ Adicionar
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl mb-6 animate-in zoom-in-95">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Nome do Registro</label>
              <input 
                autoFocus
                type="text" 
                className={`w-full p-3 bg-slate-50 border ${warning ? 'border-amber-400' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold`}
                value={inputValue}
                onChange={handleInputChange}
                placeholder="DIGITE AQUI..."
              />
              {warning && <p className="text-[9px] text-amber-600 font-black uppercase mt-1">{warning}</p>}
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-3 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
              <button type="submit" disabled={!!warning || !inputValue.trim() || isSaving} className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                {isSaving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
              <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {entities.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-700">{item.nome}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button 
                      onClick={() => { setEditingEntity(item); setInputValue(item.nome); setIsFormOpen(true); }}
                      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    >
                      ✏️
                    </button>
                    <button 
                      disabled={loading}
                      onClick={() => openDeleteConfirmation(item)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${loading ? 'opacity-20' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {entities.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center text-slate-300 font-bold uppercase text-[10px]">
                  {loading ? 'Sincronizando...' : 'Nenhum registro encontrado.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: BLOQUEIO POR DEPENDÊNCIA ATIVA */}
      {blockInfo && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-amber-100">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl animate-pulse">⚠️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-3">Ação Bloqueada</h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                Não é possível excluir o {title.toLowerCase().slice(0, -1)}:
                <span className="text-slate-900 mt-1 block font-black border-b-2 border-slate-100 pb-1">{blockInfo.name}</span>
              </p>
              
              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Motivo Técnico:</p>
                <p className="text-[12px] font-black text-amber-600 mt-1 uppercase">
                  Existem {blockInfo.count} ovelha(s) ATIVA(S) vinculada(s) a este registro.
                </p>
              </div>
              
              <p className="mt-6 text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">
                DICA: Mova os animais para outro lote/raça na aba "Rebanho" antes de tentar excluir este item.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setBlockInfo(null)}
                className="w-full py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                Entendi, vou ajustar
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
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Excluir Registro?</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Você está removendo permanentemente:<br/>
                <span className="text-slate-900 mt-2 block border-b-2 border-rose-100 pb-1 font-black">{itemToDelete.nome}</span>
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

      {loading && (
        <div className="fixed bottom-24 right-8 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Sincronizando Banco...
        </div>
      )}
    </div>
  );
};

export default EntityManager;
