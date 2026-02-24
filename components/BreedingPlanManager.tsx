import React, { useState, useEffect, useMemo } from 'react';
import { BreedingPlan, Sheep, Group, Sexo, Status, BreedingCycleResult } from '../types';
import { breedingPlanService } from '../services/breedingPlanService';

interface BreedingPlanManagerProps {
  sheep: Sheep[];
  groups: Group[];
  onRefresh: () => void;
}

const BreedingPlanManager: React.FC<BreedingPlanManagerProps> = ({ sheep, groups, onRefresh }) => {
  const [plans, setPlans] = useState<BreedingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    reprodutorId: '',
    dataInicioMonta: new Date().toISOString().split('T')[0]
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await breedingPlanService.getAll();
      setPlans(data);
    } catch (e) { console.error("Erro ao carregar planos:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlans(); }, []);

  const selectedPlan = useMemo(() => 
    plans.find(p => p.id === selectedPlanId), 
    [plans, selectedPlanId]
  );

  const assignedEweIds = useMemo(() => {
    const ids = new Set<string>();
    plans.forEach(p => p.ovelhas?.forEach(o => ids.add(o.eweId)));
    return ids;
  }, [plans]);

  const availableMatrizes = useMemo(() => {
    const vaziasGroup = groups.find(g => ['VAZIAS', 'VAZIA', 'MATRIZES VAZIAS'].includes(g.nome.toUpperCase().trim()));
    return sheep.filter(s => 
      s.sexo === Sexo.FEMEA && 
      s.status === Status.ATIVO && 
      !s.prenha &&
      !assignedEweIds.has(s.id) && 
      (vaziasGroup ? s.grupoId === vaziasGroup.id : true)
    );
  }, [sheep, assignedEweIds, groups]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await breedingPlanService.create({ ...formData, status: 'em_monta', ovelhas: [] });
      setIsCreating(false);
      setFormData({ nome: '', reprodutorId: '', dataInicioMonta: new Date().toISOString().split('T')[0] });
      await loadPlans();
      onRefresh();
    } catch (e) { alert("Erro ao criar lote."); }
  };

  const handleAddEwe = async (eweId: string) => {
    if (!selectedPlanId || !selectedPlan) return;
    const newEwe: any = {
      eweId, 
      tentativas: 1, 
      finalizado: false,
      ciclo1: BreedingCycleResult.PENDENTE,
      ciclo2: BreedingCycleResult.PENDENTE,
      ciclo3: BreedingCycleResult.PENDENTE
    };
    await breedingPlanService.update(selectedPlanId, { ovelhas: [...(selectedPlan.ovelhas || []), newEwe] });
    await loadPlans();
  };

  const handleRemoveEwe = async (eweId: string) => {
    if (!selectedPlanId) return;
    if (confirm("Remover esta matriz do lote? Ela voltará para o estado 'Vazia'.")) {
      try {
        await breedingPlanService.removeEwe(selectedPlanId, eweId);
        await loadPlans();
        onRefresh();
      } catch (err) {
        alert("Erro ao remover animal do lote.");
      }
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm("Excluir este lote?")) {
      try {
        await breedingPlanService.delete(id);
        setSelectedPlanId(null);
        await loadPlans();
        onRefresh();
      } catch (err) {
        alert("Erro ao excluir lote.");
      }
    }
  };

  const handleUpdateResult = async (eweId: string, cycle: number, result: BreedingCycleResult) => {
    if (!selectedPlanId) return;
    await breedingPlanService.updateEweResult(selectedPlanId, eweId, cycle, result);
    await loadPlans();
    onRefresh();
  };

  const getCycleResult = (o: any, cycle: number): BreedingCycleResult => {
    if (cycle === 1) return o.ciclo1;
    if (cycle === 2) return o.ciclo2;
    return o.ciclo3;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Estações de Monta</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Controle de ciclos e prenhez</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Nova Estação</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all flex flex-col justify-between h-56">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl">📋</div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                  plan.status === 'em_monta' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {plan.status === 'em_monta' ? 'Em Andamento' : 'Concluído'}
                </span>
              </div>
              <h4 className="font-black text-slate-800 uppercase text-xs mb-1">{plan.nome}</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Início: {new Date(plan.dataInicioMonta).toLocaleDateString()}</p>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-700">{plan.ovelhas?.length || 0}</span>
                <span className="text-[7px] font-black text-slate-400 uppercase">Matrizes</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedPlanId(plan.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md active:scale-95">Gerenciar</button>
                <button onClick={() => handleDeletePlan(plan.id)} className="p-2 text-slate-300 hover:text-rose-500">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 uppercase mb-6">Nova Estação de Monta</h3>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Identificação da Estação</label>
                <input required autoFocus className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-sm" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value.toUpperCase()})} placeholder="EX: ESTAÇÃO PRIMAVERA 2024" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Data de Início</label>
                <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={formData.dataInicioMonta} onChange={e => setFormData({...formData, dataInicioMonta: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[40px] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selectedPlan.nome}</h3>
              <button onClick={() => setSelectedPlanId(null)} className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">✕</button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="w-full lg:w-80 bg-slate-50 border-r border-slate-100 p-6 flex flex-col overflow-hidden">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-4 tracking-widest flex justify-between items-center">
                   Disponíveis para Monta
                   <span className="bg-indigo-100 px-1.5 py-0.5 rounded">{availableMatrizes.length}</span>
                </h4>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {availableMatrizes.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => handleAddEwe(s.id)} 
                      className="w-full p-3 bg-white border border-slate-200 rounded-2xl flex justify-between items-center hover:border-indigo-400 transition-all text-left group"
                    >
                      <div>
                        <p className="text-[10px] font-black text-slate-800 uppercase">{s.nome}</p>
                        <p className="text-[8px] font-bold text-slate-400">Brinco: {s.brinco}</p>
                      </div>
                      <span className="text-indigo-600 font-black text-lg opacity-40 group-hover:opacity-100">＋</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white">
                <div className="space-y-4">
                  {(selectedPlan.ovelhas || []).map(o => {
                    const ewe = sheep.find(s => s.id === o.eweId);
                    const resAtual = getCycleResult(o, o.tentativas);
                    return (
                      <div key={o.eweId} className={`p-6 rounded-[32px] border transition-all flex flex-col md:flex-row justify-between items-center gap-8 ${
                        o.finalizado ? 'bg-slate-50 border-slate-100 grayscale-[0.5]' : 'bg-white border-slate-200 hover:shadow-lg'
                      }`}>
                        <div className="flex items-center gap-5 w-56 shrink-0">
                          <div className={`w-14 h-14 rounded-3xl flex items-center justify-center text-xl shadow-inner ${
                            resAtual === BreedingCycleResult.PRENHA ? 'bg-emerald-100 text-emerald-600' : 
                            resAtual === BreedingCycleResult.VAZIA ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {resAtual === BreedingCycleResult.PRENHA ? '🤰' : '🐑'}
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-slate-800 uppercase leading-none mb-1">{ewe?.nome || 'Matriz'}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase">#{ewe?.brinco || '?'}</p>
                          </div>
                        </div>

                        <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                          {[1, 2, 3].map(cycle => {
                            const cycleRes = getCycleResult(o, cycle);
                            const prevRes = cycle > 1 ? getCycleResult(o, cycle - 1) : BreedingCycleResult.VAZIA;
                            const canEdit = !o.finalizado && (cycle === 1 || prevRes === BreedingCycleResult.VAZIA);
                            
                            return (
                              <div key={cycle} className={`p-4 rounded-2xl border flex flex-col gap-2 transition-all ${
                                o.tentativas >= cycle ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent opacity-30'
                              }`}>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">{cycle}º CICLO</p>
                                <select 
                                  disabled={!canEdit}
                                  value={cycleRes} 
                                  onChange={(e) => handleUpdateResult(o.eweId, cycle, e.target.value as any)}
                                  className={`w-full p-2 rounded-xl text-[10px] font-black uppercase outline-none transition-all ${
                                    cycleRes === BreedingCycleResult.PRENHA ? 'bg-emerald-500 text-white' :
                                    cycleRes === BreedingCycleResult.VAZIA ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <option value={BreedingCycleResult.PENDENTE}>PENDENTE</option>
                                  <option value={BreedingCycleResult.PRENHA}>PRENHA ✅</option>
                                  <option value={BreedingCycleResult.VAZIA}>VAZIA ❌</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>

                        <div className="shrink-0">
                           <button onClick={() => handleRemoveEwe(o.eweId)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 shrink-0">
               <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-black text-emerald-600">
                      {(selectedPlan.ovelhas || []).filter(o => o.ciclo1 === BreedingCycleResult.PRENHA || o.ciclo2 === BreedingCycleResult.PRENHA || o.ciclo3 === BreedingCycleResult.PRENHA).length}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Confirmadas</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-black text-rose-500">
                      {(selectedPlan.ovelhas || []).filter(o => o.finalizado && o.ciclo3 === BreedingCycleResult.VAZIA).length}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Falhas</span>
                  </div>
               </div>
               <button onClick={() => setSelectedPlanId(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreedingPlanManager;