import React, { useState } from 'react';
import { Sheep, Group } from '../../types';
import { sheepService } from '../rebanho/sheepService';

interface WeightManagerProps {
  sheep: Sheep[];
  groups: Group[];
  onRefresh: () => void;
}

const WeightManager: React.FC<WeightManagerProps> = ({ sheep, groups, onRefresh }) => {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [weights, setWeights] = useState<Record<string, string>>({});

  const list = sheep.filter(s => s.grupoId === selectedGroup && s.status === 'ativo');

  const handleSave = async () => {
    try {
      await Promise.all(Object.entries(weights).map(([id, w]) => 
        sheepService.update(id, { peso: parseFloat(w as string) })
      ));
      onRefresh();
      setWeights({});
      alert("Pesos atualizados!");
    } catch (error) {
      alert("Erro ao atualizar pesos.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pesagem por Lote</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase mt-1">Controle ponderal do rebanho</p>
        </div>
        <select 
          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-emerald-500 transition-all w-full md:w-64" 
          value={selectedGroup} 
          onChange={e => setSelectedGroup(e.target.value)}
        >
          <option value="">Selecione o Lote...</option>
          {groups.map(g => {
            const count = sheep.filter(s => s.grupoId === g.id && s.status === 'ativo').length;
            return <option key={g.id} value={g.id}>{g.nome} - {count} animais</option>;
          })}
        </select>
      </div>

      {selectedGroup && (
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(s => (
              <div key={s.id} className="flex flex-col gap-3 p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-emerald-200 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-black text-xs uppercase text-slate-800 group-hover:text-emerald-600 transition-colors">{s.nome}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Peso Atual: <span className="text-emerald-600">{s.peso}kg</span></p>
                  </div>
                </div>
                
                <div className="relative">
                  <input 
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-emerald-600 outline-none focus:border-emerald-500 shadow-sm text-center" 
                    type="number" 
                    step="0.1"
                    placeholder="0.00"
                    value={weights[s.id] || ''} 
                    onChange={e => setWeights({...weights, [s.id]: e.target.value})} 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">KG</span>
                </div>
              </div>
            ))}
          </div>
          
          {list.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-400 font-black uppercase text-[10px]">Nenhum animal ativo neste lote.</p>
            </div>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={Object.keys(weights).length === 0}
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs shadow-xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              Salvar Pesagem
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WeightManager;