import React, { useState } from 'react';
import { Sheep, Group } from '../../types';
import { sheepService } from '../rebanho/sheepService';

interface ECCManagerProps {
  sheep: Sheep[];
  groups: Group[];
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

const ECCManager: React.FC<ECCManagerProps> = ({ sheep, groups, onRefresh }) => {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [eccs, setEccs] = useState<Record<string, string>>({});

  const list = sheep.filter(s => s.grupoId === selectedGroup && s.status === 'ativo');

  const handleSave = async () => {
    try {
      await Promise.all(Object.entries(eccs).map(([id, e]) => 
        sheepService.update(id, { ecc: parseFloat(e as string) })
      ));
      onRefresh();
      setEccs({});
      alert("Escores Corporais (ECC) atualizados!");
    } catch (error) {
      alert("Erro ao atualizar ECC.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Avaliação de ECC por Lote</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase mt-1">Escore de Condição Corporal (Escala 1 a 5)</p>
        </div>
        <select 
          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-500 transition-all w-full md:w-64" 
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
              <div key={s.id} className="flex flex-col gap-3 p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-black text-xs uppercase text-slate-800 group-hover:text-indigo-600 transition-colors">{s.nome}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">ECC Atual: <span className="text-indigo-600">{s.ecc}</span></p>
                  </div>
                </div>
                
                <select 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-indigo-600 outline-none focus:border-indigo-500 shadow-sm uppercase"
                  value={eccs[s.id] || ''} 
                  onChange={e => setEccs({...eccs, [s.id]: e.target.value})}
                >
                  <option value="">Avaliar ECC...</option>
                  {ECC_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
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
