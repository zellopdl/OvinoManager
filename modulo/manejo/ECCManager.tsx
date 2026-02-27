import React, { useState } from 'react';
import { Sheep, Group, Paddock } from '../../types';
import { sheepService } from '../rebanho/sheepService';

interface ECCManagerProps {
  sheep: Sheep[];
  groups: Group[];
  paddocks: Paddock[];
  onRefresh: () => void;
}

const ECC_OPTIONS = [
  { value: '1.0', label: '1.0 - Caquética' },
  { value: '1.5', label: '1.5 - Muito Magra' },
  { value: '2.0', label: '2.0 - Magra' },
  { value: '2.5', label: '2.5 - Moderada -' },
  { value: '3.0', label: '3.0 - Ideal' },
  { value: '3.5', label: '3.5 - Ideal +' },
  { value: '4.0', label: '4.0 - Gorda' },
  { value: '4.5', label: '4.5 - Muito Gorda' },
  { value: '5.0', label: '5.0 - Obesa' },
];

const ECCManager: React.FC<ECCManagerProps> = ({ sheep, groups, paddocks, onRefresh }) => {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedPaddock, setSelectedPaddock] = useState('');
  const [eccs, setEccs] = useState<Record<string, string>>({});

  const isToday = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  const list = sheep.filter(s => {
    const matchGroup = selectedGroup ? s.grupoId === selectedGroup : true;
    const matchPaddock = selectedPaddock ? s.piqueteId === selectedPaddock : true;
    return matchGroup && matchPaddock && s.status === 'ativo';
  }).filter(s => selectedGroup || selectedPaddock);

  const handleSave = async () => {
    const entries = Object.entries(eccs).filter(([_, e]) => e !== '' && !isNaN(parseFloat(e)));
    if (entries.length === 0) return;

    try {
      await Promise.all(entries.map(([id, e]) => 
        sheepService.update(id, { ecc: parseFloat(e) })
      ));
      onRefresh();
      setEccs({});
      alert("Escores Corporais (ECC) atualizados!");
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar ECC.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Avaliação de ECC</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase mt-1">Escore de Condição Corporal (Escala 1 a 5)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Filtrar por Lote</label>
            <select 
              className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-500 transition-all w-full" 
              value={selectedGroup} 
              onChange={e => { setSelectedGroup(e.target.value); setSelectedPaddock(''); }}
            >
              <option value="">Todos os Lotes...</option>
              {groups.map(g => {
                const groupSheep = sheep.filter(s => s.grupoId === g.id && s.status === 'ativo');
                const measuredToday = groupSheep.filter(s => s.historicoECC?.some(h => isToday(h.data))).length;
                return (
                  <option key={g.id} value={g.id}>
                    {g.nome} ({measuredToday}/{groupSheep.length} avaliados hoje)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Filtrar por Piquete</label>
            <select 
              className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-500 transition-all w-full" 
              value={selectedPaddock} 
              onChange={e => { setSelectedPaddock(e.target.value); setSelectedGroup(''); }}
            >
              <option value="">Todos os Piquetes...</option>
              {paddocks.map(p => {
                const paddockSheep = sheep.filter(s => s.piqueteId === p.id && s.status === 'ativo');
                const measuredToday = paddockSheep.filter(s => s.historicoECC?.some(h => isToday(h.data))).length;
                return (
                  <option key={p.id} value={p.id}>
                    {p.piquete} ({measuredToday}/{paddockSheep.length} avaliados hoje)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {(selectedGroup || selectedPaddock) && (
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(s => {
              const alreadyMeasured = s.historicoECC?.some(h => isToday(h.data));
              return (
                <div key={s.id} className={`flex flex-col gap-3 p-5 rounded-3xl border transition-all group ${alreadyMeasured ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-black text-xs uppercase ${alreadyMeasured ? 'text-indigo-800' : 'text-slate-800'} truncate`}>{s.nome}</p>
                        {alreadyMeasured && <span className="bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">OK</span>}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">ECC Atual: <span className="text-indigo-600">{s.ecc}</span></p>
                    </div>
                  </div>
                  
                  <select 
                    className={`w-full p-3 border rounded-xl font-black text-[10px] outline-none shadow-sm uppercase ${alreadyMeasured ? 'bg-white border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-indigo-600 focus:border-indigo-500'}`}
                    value={eccs[s.id] || ''} 
                    onChange={e => setEccs({...eccs, [s.id]: e.target.value})}
                  >
                    <option value="">{alreadyMeasured ? "Reavaliar ECC..." : "Avaliar ECC..."}</option>
                    {ECC_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          
          {list.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-400 font-black uppercase text-[10px]">Nenhum animal ativo neste lote.</p>
            </div>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={Object.keys(eccs).length === 0}
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs shadow-xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              Salvar Escores Corporais
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ECCManager;
