
import React, { useState } from 'react';
import { entityService } from './entityService';
import { Sheep, Status } from '../../types';

interface EntityManagerProps {
  title: string;
  tableName: string;
  icon: string;
  initialData?: any[];
  onRefresh?: () => void;
  sheep?: Sheep[];
}

const EntityManager: React.FC<EntityManagerProps> = ({ title, tableName, icon, initialData, onRefresh, sheep = [] }) => {
  const [val, setVal] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim()) return;
    
    if (initialData?.some(i => i.nome.toUpperCase().trim() === val.toUpperCase().trim())) {
      setWarning("Este registro já existe!");
      return;
    }

    await entityService.create(tableName, { nome: val.toUpperCase().trim() });
    setVal('');
    setWarning(null);
    setIsFormOpen(false);
    onRefresh?.();
  };

  const handleDelete = async (id: string, name: string) => {
    const isUsed = sheep.some(s => {
      const active = s.status === Status.ATIVO;
      if (tableName === 'racas') return s.racaId === id && active;
      if (tableName === 'grupos') return s.grupoId === id && active;
      return false;
    });

    if (isUsed) {
      alert(`BLOQUEIO: Não é possível excluir "${name}" pois existem ovelhas ativas vinculadas.`);
      return;
    }

    if (confirm(`Deseja remover "${name}" permanentemente?`)) {
      await entityService.delete(tableName, id);
      onRefresh?.();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-3">
            <span className="text-2xl">{icon}</span> {title}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gerenciamento de {title.toLowerCase()}</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-lg active:scale-95 transition-all">Novo Registro</button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-2xl animate-in zoom-in-95 w-full max-w-md">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase">Novo {title.slice(0,-1)}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Insira a identificação oficial</p>
            </div>
            <form onSubmit={handleAdd} className="space-y-6">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Descrição / Nome *</label>
                <input 
                  autoFocus
                  className={`w-full p-4 bg-slate-50 border ${warning ? 'border-amber-400 ring-2 ring-amber-50' : 'border-slate-200'} rounded-2xl uppercase font-black text-sm tracking-tight outline-none focus:border-indigo-500`}
                  placeholder={`NOME DO(A) ${title.toUpperCase().slice(0,-1)}...`}
                  value={val} 
                  onChange={e => { setVal(e.target.value); setWarning(null); }} 
                />
                {warning && <p className="text-[10px] text-amber-600 font-black uppercase px-2 mt-2">⚠️ {warning}</p>}
              </div>
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-50">
                 <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all">Confirmar Cadastro</button>
                 <button type="button" onClick={() => { setIsFormOpen(false); setVal(''); setWarning(null); }} className="w-full py-4 text-slate-400 font-black uppercase text-[11px]">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[300px]">
            <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr><th className="px-4 py-5 sm:p-5">Descrição</th><th className="px-4 py-5 sm:p-5 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y">
              {initialData?.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-5 sm:p-5 font-black text-slate-700 uppercase tracking-tight">{item.nome}</td>
                  <td className="px-4 py-5 sm:p-5 text-right">
                    <button onClick={() => handleDelete(item.id, item.nome)} className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-400 rounded-xl md:opacity-0 group-hover:opacity-100 transition-all ml-auto">🗑️</button>
                  </td>
                </tr>
              ))}
              {initialData?.length === 0 && (
                <tr><td colSpan={2} className="p-10 text-center text-slate-300 font-black uppercase text-[10px]">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y">
          {initialData?.map(item => (
            <div key={item.id} className="p-5 flex justify-between items-center active:bg-slate-50 transition-colors">
              <p className="font-black text-slate-700 uppercase tracking-tight text-sm">{item.nome}</p>
              <button onClick={() => handleDelete(item.id, item.nome)} className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-400 rounded-xl">🗑️</button>
            </div>
          ))}
          {initialData?.length === 0 && (
            <div className="p-10 text-center text-slate-300 font-black uppercase text-[10px]">Nenhum registro encontrado</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntityManager;
