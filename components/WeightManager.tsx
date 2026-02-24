
import React, { useState, useMemo } from 'react';
import { Sheep, Group, WeightHistory } from '../types';
import { sheepService } from '../services/sheepService';

interface WeightManagerProps {
  sheep: Sheep[];
  groups: Group[];
  onRefresh: () => void;
}

const WeightManager: React.FC<WeightManagerProps> = ({ sheep, groups, onRefresh }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [weighingDate, setWeighingDate] = useState(new Date().toISOString().split('T')[0]);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const activeGroups = useMemo(() => {
    return groups.filter(g => 
      sheep.some(s => s.grupoId === g.id && s.status === 'ativo')
    );
  }, [groups, sheep]);

  const groupSheep = useMemo(() => {
    if (!selectedGroupId) return [];
    return sheep.filter(s => s.grupoId === selectedGroupId && s.status === 'ativo');
  }, [sheep, selectedGroupId]);

  const handleWeightChange = (sheepId: string, value: string) => {
    setWeights(prev => ({ ...prev, [sheepId]: value }));
  };

  const getStats = (s: Sheep, currentWeightStr: string) => {
    if (!currentWeightStr || isNaN(parseFloat(currentWeightStr))) return null;
    const currentWeight = parseFloat(currentWeightStr);
    const history = [...(s.historicoPeso || [])].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    const lastWeight = history[0] ? history[0].peso : s.peso;
    const weightDiff = currentWeight - lastWeight;
    return { weightDiff, percentDiff: (weightDiff / lastWeight) * 100 };
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(weights).filter(([_, w]) => w && !isNaN(parseFloat(w as string)));
    if (entries.length === 0) return;
    setIsSaving(true);
    try {
      await Promise.all(entries.map(([id, w]) => 
        sheepService.update(id, { peso: parseFloat(w as string) }, weighingDate)
      ));
      alert("Pesagens salvas com sucesso!");
      setWeights({});
      onRefresh();
    } catch (error) { alert("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500 pb-4 overflow-hidden">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4 shrink-0">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pesagem por Lote</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">Lote...</option>
            {activeGroups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
          <input 
            type="date" 
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
            value={weighingDate}
            onChange={(e) => setWeighingDate(e.target.value)}
          />
        </div>
      </div>

      {!selectedGroupId ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-[32px] p-10">
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Selecione um lote para iniciar</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupSheep.map(s => {
                const stats = getStats(s, weights[s.id] || '');
                return (
                  <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between">
                      <div><h4 className="font-black text-slate-800 text-xs uppercase">{s.nome}</h4><p className="text-[10px] text-emerald-600 font-bold">#{s.brinco}</p></div>
                      <div className="text-right"><p className="text-[8px] font-black text-slate-400 uppercase">Anterior</p><p className="text-xs font-black text-slate-500">{s.peso}kg</p></div>
                    </div>
                    <input 
                      type="number" 
                      step="0.1"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-center text-sm focus:border-emerald-500"
                      placeholder="Novo Peso"
                      value={weights[s.id] || ''}
                      onChange={(e) => handleWeightChange(s.id, e.target.value)}
                    />
                    {stats && (
                      <div className={`text-center py-1 rounded-lg text-[10px] font-black uppercase ${stats.weightDiff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {stats.weightDiff >= 0 ? '+' : ''}{stats.weightDiff.toFixed(1)}kg ({stats.percentDiff.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button 
            onClick={handleSaveAll}
            disabled={isSaving || Object.keys(weights).length === 0}
            className="shrink-0 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:bg-slate-300"
          >
            {isSaving ? 'Salvando...' : '💾 Salvar Pesagens'}
          </button>
        </div>
      )}
    </div>
  );
};

export default WeightManager;
