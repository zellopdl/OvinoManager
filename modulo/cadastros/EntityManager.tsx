
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
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black uppercase flex items-center gap-3 mb-6">
          <span className="text-2xl">{icon}</span> {title}
        </h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="flex gap-3">
            <input 
              className={`flex-1 p-4 bg-slate-50 border ${warning ? 'border-amber-400 ring-2 ring-amber-50' : 'border-slate-200'} rounded-2xl uppercase font-black text-sm tracking-tight outline-none focus:border-indigo-500`}
              placeholder={`NOME DO(A) ${title.toUpperCase().slice(0,-1)}...`}
              value={val} 
              onChange={e => { setVal(e.target.value); setWarning(null); }} 
            />
            <button type="submit" className="bg-slate-900 text-white px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Adicionar</button>
          </div>
          {warning && <p className="text-[10px] text-amber-600 font-black uppercase px-2">⚠️ {warning}</p>}
        </form>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <tr><th className="p-5">Descrição</th><th className="p-5 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y">
            {initialData?.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 group">
                <td className="p-5 font-black text-slate-700 uppercase tracking-tight">{item.nome}</td>
                <td className="p-5 text-right">
                  <button onClick={() => handleDelete(item.id, item.nome)} className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
                </td>
              </tr>
            ))}
            {initialData?.length === 0 && (
              <tr><td colSpan={2} className="p-10 text-center text-slate-300 font-black uppercase text-[10px]">Nenhum registro encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntityManager;
