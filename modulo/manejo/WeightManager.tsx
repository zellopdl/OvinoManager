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
    // FIX: Cast 'w' as string because Object.entries might return values inferred as 'unknown' depending on environment, and parseFloat requires a string.
    await Promise.all(Object.entries(weights).map(([id, w]) => 
      sheepService.update(id, { peso: parseFloat(w as string) })
    ));
    onRefresh();
    setWeights({});
    alert("Pesos atualizados!");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <select className="p-3 bg-slate-50 border rounded-xl font-bold" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
          <option value="">Selecione o Lote...</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
        </select>
      </div>
      {selectedGroup && (
        <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map(s => (
              <div key={s.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1"><p className="font-black text-xs uppercase">{s.nome}</p><p className="text-[9px] text-slate-400">Peso atual: {s.peso}kg</p></div>
                <input className="w-20 p-2 border rounded-lg text-center font-black" type="number" value={weights[s.id] || ''} onChange={e => setWeights({...weights, [s.id]: e.target.value})} />
              </div>
            ))}
          </div>
          <button onClick={handleSave} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Salvar Pesagem</button>
        </div>
      )}
    </div>
  );
};

export default WeightManager;