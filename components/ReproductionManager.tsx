
import React, { useState, useEffect, useMemo } from 'react';
import { BreedingRecord, Sheep, BreedingStatus, Sexo, Status, Group } from '../types';
import { reproService } from '../services/reproService';
import BreedingPlanManager from './BreedingPlanManager.tsx';

interface ReproductionManagerProps {
  sheep: Sheep[];
  groups: Group[];
  onRefresh: () => void;
}

const ReproductionManager: React.FC<ReproductionManagerProps> = ({ sheep, groups, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'lotes' | 'registros' | 'previsoes'>('lotes');
  const [records, setRecords] = useState<BreedingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await reproService.getAll();
      setRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const previsoesParto = useMemo(() => {
    return records
      .filter(r => r.status === BreedingStatus.CONFIRMADA)
      .sort((a, b) => a.dataPrevisaoParto.localeCompare(b.dataPrevisaoParto));
  }, [records]);

  const handleUpdateStatus = async (id: string, status: BreedingStatus) => {
    try {
      let dataParto = status === BreedingStatus.PARTO ? new Date().toISOString().split('T')[0] : undefined;
      await reproService.updateStatus(id, status, dataParto);
      await loadData();
      onRefresh();
    } catch (e) { alert("Erro ao atualizar."); }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500 h-full max-h-[85vh] overflow-hidden">
      {/* Cabeçalho do Hub */}
      <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Centro de Reprodução</h2>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Gestão Biológica e Reprodutiva</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {[
            { id: 'lotes', label: 'Lotes de Monta', icon: '📋' },
            { id: 'previsoes', label: 'Calendário de Partos', icon: '🤰' },
            { id: 'registros', label: 'Histórico', icon: '📜' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                activeSubTab === tab.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Área de Conteúdo com Scroll Independente */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        {activeSubTab === 'lotes' && (
          <div className="animate-in slide-in-from-left-4 duration-300">
            <BreedingPlanManager sheep={sheep} groups={groups} onRefresh={() => { loadData(); onRefresh(); }} />
          </div>
        )}

        {activeSubTab === 'previsoes' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {previsoesParto.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-[32px]">
                   <p className="text-slate-300 font-black text-xs uppercase tracking-widest">Nenhuma gestação confirmada no momento</p>
                </div>
              ) : previsoesParto.map(record => {
                const matriz = sheep.find(s => s.id === record.matrizId);
                const diasRestantes = Math.ceil((new Date(record.dataPrevisaoParto).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={record.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm group hover:border-pink-300 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center text-lg">🤰</div>
                        <div>
                          <h4 className="font-black text-slate-800 text-xs uppercase">{matriz?.nome || 'Matriz'}</h4>
                          <p className="text-[9px] font-bold text-slate-400">#{matriz?.brinco || '-'}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${diasRestantes < 15 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-pink-100 text-pink-600'}`}>
                        {diasRestantes <= 0 ? 'Iminente' : `Faltam ${diasRestantes} dias`}
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Expectativa de Parto</p>
                       <p className="text-lg font-black text-slate-700">{new Date(record.dataPrevisaoParto).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateStatus(record.id, BreedingStatus.PARTO)} className="flex-1 py-3 bg-pink-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-pink-200 active:scale-95 transition-all">Registrar Parto</button>
                      <button onClick={() => handleUpdateStatus(record.id, BreedingStatus.FALHA)} className="px-4 py-3 bg-slate-100 text-slate-400 rounded-xl text-[9px] font-black uppercase hover:bg-rose-50 hover:text-rose-500 transition-all">Falha</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeSubTab === 'registros' && (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Matriz</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Data Cobertura</th>
                  <th className="px-6 py-4">Data Parto/Falha</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.filter(r => r.status !== BreedingStatus.CONFIRMADA).map(r => {
                  const matriz = sheep.find(s => s.id === r.matrizId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 uppercase text-xs">{matriz?.nome || 'Matriz'}</span>
                          <span className="text-[9px] text-slate-400 font-bold">#{matriz?.brinco || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${
                          r.status === BreedingStatus.PARTO ? 'bg-blue-100 text-blue-700' :
                          r.status === BreedingStatus.FALHA ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{new Date(r.dataCobertura).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{r.dataPartoReal ? new Date(r.dataPartoReal).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 text-right">
                         <button onClick={async () => { if(confirm("Excluir?")) { await reproService.delete(r.id); loadData(); } }} className="text-slate-300 hover:text-rose-500 transition-all text-sm">🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReproductionManager;
