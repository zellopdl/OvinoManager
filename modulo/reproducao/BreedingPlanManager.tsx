
import React, { useState, useEffect, useMemo } from 'react';
import { BreedingPlan, Sheep, Group, Sexo, Status, BreedingCycleResult } from '../../types';
import { breedingPlanService } from './breedingPlanService.ts';

interface BreedingPlanManagerProps {
  sheep: Sheep[];
  groups: Group[];
  onRefresh: () => void;
  managerPassword?: string;
}

const BreedingPlanManager: React.FC<BreedingPlanManagerProps> = ({ sheep, groups, onRefresh, managerPassword }) => {
  const [plans, setPlans] = useState<BreedingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'lote' | 'adicionar'>('lote');
  
  const [unlockedEwes, setUnlockedEwes] = useState<Set<string>>(new Set());
  const [eweToUnlock, setEweToUnlock] = useState<string | null>(null);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const effectivePassword = managerPassword || localStorage.getItem('ovi_manager_pwd') || '1234';

  const loadPlans = async () => {
    try { 
      const data = await breedingPlanService.getAll(); 
      setPlans(data); 
    } 
    catch (e) { 
      console.error(e); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);

  const vaziaGroupId = useMemo(() => {
    const found = (groups || []).find(g => ['VAZIA', 'VAZIAS', 'MATRIZES VAZIAS'].includes(g.nome.toUpperCase().trim()));
    return found?.id || null;
  }, [groups]);

  const availableMatrizes = useMemo(() => {
    if (!vaziaGroupId) return [];
    const assignedIds = new Set<string>();
    plans.forEach(p => p.ovelhas?.forEach(o => assignedIds.add(o.eweId)));
    return sheep.filter(s => s.sexo === Sexo.FEMEA && s.status === Status.ATIVO && !s.prenha && !assignedIds.has(s.id) && s.grupoId === vaziaGroupId);
  }, [sheep, plans, vaziaGroupId]);

  const handleAddEwe = async (eweId: string) => {
    if (!selectedPlanId) return;
    await breedingPlanService.addEwe(selectedPlanId, eweId);
    await loadPlans();
    onRefresh();
  };

  const handleUpdateResult = async (eweId: string, ciclo: 1|2|3, res: BreedingCycleResult) => {
    if (!selectedPlanId) return;
    await breedingPlanService.updateEweResult(selectedPlanId, eweId, ciclo, res);
    await loadPlans();
    onRefresh();
  };

  const handleVerifyPassword = () => {
    if (passInput.trim() === effectivePassword.trim()) {
      if (eweToUnlock) { 
        setUnlockedEwes(prev => new Set(prev).add(eweToUnlock)); 
        setEweToUnlock(null); 
        setPassInput(''); 
      }
    } else { 
      setPassError(true); 
      setTimeout(() => setPassError(false), 1000); 
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = prompt("Nome da Nova Estação:");
    if (!nome) return;
    
    try {
      await breedingPlanService.create({
        nome: nome.toUpperCase(),
        dataInicioMonta: new Date().toISOString().split('T')[0],
        status: 'em_monta'
      });
      await loadPlans();
      onRefresh();
    } catch (err) {
      alert("Erro ao criar estação.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 md:p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-400">Estações Ativas</h3>
        <button onClick={handleCreatePlan} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Nova Estação</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {plans.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between h-52 active:border-indigo-400 transition-all">
            <div>
              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${p.status === 'em_monta' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{p.status === 'em_monta' ? 'Em Andamento' : 'Finalizada'}</span>
              <h4 className="mt-3 text-lg font-black uppercase text-slate-800 truncate">{p.nome}</h4>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Início: {new Date(p.dataInicioMonta).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setSelectedPlanId(p.id)} className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Gerenciar Lote</button>
               <button onClick={async () => { if(confirm("Excluir estação?")) { await breedingPlanService.delete(p.id); loadPlans(); onRefresh(); } }} className="p-3 text-rose-300 hover:text-rose-600">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center md:p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full md:max-w-6xl h-full md:h-[85vh] md:rounded-[40px] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 md:p-8 border-b bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-lg md:text-2xl font-black text-slate-800 uppercase tracking-tight truncate pr-4">{selectedPlan.nome}</h3>
              <button onClick={() => setSelectedPlanId(null)} className="w-10 h-10 md:w-12 md:h-12 bg-white border rounded-full flex items-center justify-center text-slate-400 shadow-sm transition-all shrink-0">✕</button>
            </div>

            <div className="md:hidden flex bg-slate-100 p-1 mx-5 mt-4 rounded-2xl shrink-0">
               <button onClick={() => setActiveTabMobile('lote')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTabMobile === 'lote' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Matrizes no Lote</button>
               <button onClick={() => setActiveTabMobile('adicionar')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTabMobile === 'adicionar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Adicionar (+)</button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
               <div className={`w-full md:w-72 bg-slate-50 border-r p-6 overflow-y-auto custom-scrollbar ${activeTabMobile === 'adicionar' ? 'flex flex-col' : 'hidden md:flex flex-col'}`}>
                  <h4 className="text-[10px] font-black uppercase text-indigo-600 mb-4 tracking-widest flex justify-between">Vazias <span>{availableMatrizes.length}</span></h4>
                  <div className="space-y-2 pb-20 md:pb-4">
                    {availableMatrizes.map(m => (
                      <button key={m.id} onClick={() => handleAddEwe(m.id)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-400 transition-all flex justify-between items-center shadow-sm group">
                         <div><p className="text-xs font-black uppercase text-slate-700">{m.nome}</p><p className="text-[8px] text-slate-400 font-bold tracking-widest">#{m.brinco}</p></div>
                         <span className="text-indigo-400 font-bold text-xl">+</span>
                      </button>
                    ))}
                  </div>
               </div>

               <div className={`flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar bg-white ${activeTabMobile === 'lote' ? 'block' : 'hidden md:block'}`}>
                  <div className="space-y-4 pb-20 md:pb-4">
                    {(selectedPlan.ovelhas || []).map(o => {
                      const matriz = sheep.find(s => s.id === o.eweId);
                      const isRowUnlocked = unlockedEwes.has(o.eweId);
                      return (
                        <div key={o.id} className={`p-5 rounded-[28px] border flex flex-col md:flex-row items-center gap-4 md:gap-8 shadow-sm ${o.finalizado && !isRowUnlocked ? 'bg-slate-50/50 grayscale-[0.5] opacity-70' : 'bg-white border-slate-200'}`}>
                           <div className="w-full md:w-48 flex justify-between items-center md:block">
                              <div>
                                <p className="text-xs font-black uppercase text-slate-800 truncate">{matriz?.nome || '?'}</p>
                                <p className="text-[9px] font-bold text-slate-400 tracking-widest">#{matriz?.brinco || '?'}</p>
                              </div>
                              <div className="flex gap-2">
                                {o.finalizado && !isRowUnlocked && <button onClick={() => setEweToUnlock(o.eweId)} className="p-2 bg-rose-50 text-rose-500 rounded-lg text-sm shadow-sm">🔒</button>}
                                <button onClick={() => breedingPlanService.removeEwe(o.id, o.eweId, selectedPlanId)} className="md:hidden w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-400 rounded-lg">✕</button>
                              </div>
                           </div>

                           <div className="flex-1 grid grid-cols-3 gap-2 w-full">
                              {[1,2,3].map(c => {
                                const val = c === 1 ? o.ciclo1 : c === 2 ? o.ciclo2 : o.ciclo3;
                                const prevVal = c > 1 ? (c === 2 ? o.ciclo1 : o.ciclo2) : BreedingCycleResult.VAZIA;
                                const isAccessible = o.tentativas >= c && prevVal === BreedingCycleResult.VAZIA;
                                return (
                                  <div key={c} className={`p-2 rounded-2xl border ${isAccessible ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent opacity-30 pointer-events-none'}`}>
                                     <p className="text-[7px] font-black text-slate-400 uppercase text-center mb-1.5">{c}º CICLO</p>
                                     <select disabled={o.finalizado && !isRowUnlocked} value={val} onChange={(e) => handleUpdateResult(o.eweId, c as 1|2|3, e.target.value as any)} className={`w-full p-2 rounded-xl text-[9px] font-black uppercase outline-none transition-all ${val === BreedingCycleResult.PRENHA ? 'bg-emerald-500 text-white' : val === BreedingCycleResult.VAZIA ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        <option value={BreedingCycleResult.PENDENTE}>---</option>
                                        <option value={BreedingCycleResult.PRENHA}>OK</option>
                                        <option value={BreedingCycleResult.VAZIA}>VZP</option>
                                     </select>
                                  </div>
                                );
                              })}
                           </div>
                           <button onClick={() => breedingPlanService.removeEwe(o.id, o.eweId, selectedPlanId)} className="hidden md:flex w-10 h-10 items-center justify-center bg-rose-50 text-rose-300 rounded-2xl hover:text-rose-500 transition-all">🗑️</button>
                        </div>
                      );
                    })}
                  </div>
               </div>
            </div>
            
            <div className="p-6 md:p-8 border-t bg-slate-50 flex justify-between items-center shrink-0 mb-safe">
               <div className="flex gap-4 md:gap-8">
                  <div className="text-center">
                    <p className="text-lg font-black text-emerald-600">{(selectedPlan.ovelhas || []).filter(o => o.ciclo1 === BreedingCycleResult.PRENHA || o.ciclo2 === BreedingCycleResult.PRENHA || o.ciclo3 === BreedingCycleResult.PRENHA).length}</p>
                    <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase">Prenhas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-rose-500">{(selectedPlan.ovelhas || []).filter(o => o.finalizado && o.ciclo3 === BreedingCycleResult.VAZIA).length}</p>
                    <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase">Falhas</p>
                  </div>
               </div>
               <button onClick={() => setSelectedPlanId(null)} className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {eweToUnlock && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
           <div className={`bg-white w-full max-w-sm rounded-[32px] p-10 shadow-2xl border-2 transition-all ${passError ? 'border-rose-500 animate-shake' : 'border-slate-100'}`}>
              <div className="text-center mb-8"><div className="w-16 h-16 bg-slate-100 text-slate-800 rounded-3xl flex items-center justify-center text-2xl mx-auto mb-4">🔐</div><h3 className="text-xl font-black text-slate-800 uppercase">Gerência</h3><p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Alterar Matriz Finalizada</p></div>
              <input autoFocus type="password" placeholder="••••" className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-center text-2xl outline-none mb-8 tracking-[0.5em]" value={passInput} onChange={e => setPassInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} />
              <div className="flex gap-2">
                 <button onClick={() => { setEweToUnlock(null); setPassInput(''); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                 <button onClick={handleVerifyPassword} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Liberar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BreedingPlanManager;
