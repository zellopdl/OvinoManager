
import React, { useState, useEffect, useMemo } from 'react';
import { BreedingRecord, Sheep, BreedingStatus, Group } from '../../types';
import { reproService } from './reproService';
import BreedingPlanManager from './BreedingPlanManager';

interface ReproductionManagerProps {
  sheep: Sheep[];
  groups: Group[];
  onRefresh: () => void;
  managerPassword?: string;
}

const ReproductionManager: React.FC<ReproductionManagerProps> = ({ sheep, groups, onRefresh, managerPassword }) => {
  const [activeTab, setActiveTab] = useState<'lotes' | 'previsoes' | 'historico'>('lotes');
  const [records, setRecords] = useState<BreedingRecord[]>([]);

  useEffect(() => {
    reproService.getAll().then(setRecords);
  }, []);

  const previsoes = useMemo(() => {
    return records.filter(r => r.status === BreedingStatus.CONFIRMADA)
      .sort((a,b) => a.dataPrevisaoParto.localeCompare(b.dataPrevisaoParto));
  }, [records]);

  const handleUpdateStatus = async (id: string, status: BreedingStatus) => {
    try {
      let dataParto = status === BreedingStatus.PARTO ? new Date().toISOString().split('T')[0] : undefined;
      await reproService.updateStatus(id, status, dataParto);
      const data = await reproService.getAll();
      setRecords(data);
      onRefresh();
    } catch (e) { alert("Erro ao atualizar."); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Hub de Reprodução</h2>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">Gestão de linhagem e nascimentos</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {[
            {id:'lotes', l:'Lotes de Monta', i:'📋'},
            {id:'previsoes', l:'Partos Previstos', i:'🤰'},
            {id:'historico', l:'Histórico', i:'📜'}
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
              activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
            }`}>
              <span>{t.i}</span><span className="hidden sm:inline">{t.l}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4">
        {activeTab === 'lotes' && (
          <BreedingPlanManager 
            sheep={sheep} 
            groups={groups} 
            onRefresh={onRefresh} 
            managerPassword={managerPassword} 
          />
        )}
        
        {activeTab === 'previsoes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {previsoes.map(r => {
              const matriz = sheep.find(s => s.id === r.matrizId);
              const dias = Math.ceil((new Date(r.dataPrevisaoParto).getTime() - new Date().getTime()) / (1000*3600*24));
              return (
                <div key={r.id} className="bg-white p-6 rounded-[32px] border shadow-sm group hover:border-pink-300 transition-all">
                  <div className="flex justify-between mb-4">
                    <span className="text-[10px] font-black uppercase text-pink-600 bg-pink-50 px-3 py-1 rounded-full">Gestação Confirmada</span>
                    <span className="text-[10px] font-bold text-slate-400">{dias} dias p/ parto</span>
                  </div>
                  <h4 className="text-lg font-black uppercase text-slate-800">{matriz?.nome || 'Matriz'}</h4>
                  <p className="text-[10px] font-bold text-slate-400">Previsão: {new Date(r.dataPrevisaoParto).toLocaleDateString()}</p>
                  
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => handleUpdateStatus(r.id, BreedingStatus.PARTO)} className="flex-1 py-3 bg-pink-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-pink-100">Registrar Parto</button>
                  </div>
                </div>
              );
            })}
            {previsoes.length === 0 && <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase text-xs">Sem gestações confirmadas</div>}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase">
                <tr><th className="p-4">Matriz</th><th className="p-4">Status</th><th className="p-4">Data Cobertura</th><th className="p-4">Finalização</th></tr>
              </thead>
              <tbody className="divide-y text-xs">
                {records.filter(r => r.status !== BreedingStatus.CONFIRMADA).map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-4 font-black uppercase">{sheep.find(s=>s.id===r.matrizId)?.nome}</td>
                    <td className="p-4"><span className="px-2 py-0.5 rounded-lg bg-slate-100 font-black uppercase text-[8px]">{r.status}</span></td>
                    <td className="p-4 font-bold text-slate-500">{new Date(r.dataCobertura).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-slate-500">{r.dataPartoReal ? new Date(r.dataPartoReal).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReproductionManager;
