import React, { useState } from 'react';
import { Sheep, Group } from '../../types';
import { sheepService } from '../rebanho/sheepService';

interface FamachaManagerProps {
  sheep: Sheep[];
  groups: Group[];
  onRefresh: () => void;
}

const FAMACHA_OPTIONS = [
  { value: '1', label: '1 - Vermelho (Ótimo)' },
  { value: '2', label: '2 - Rosa Avermelhado (Aceitável)' },
  { value: '3', label: '3 - Rosa (Atenção)' },
  { value: '4', label: '4 - Rosa Pálido (Perigoso)' },
  { value: '5', label: '5 - Branco (Fatal)' },
];

const FamachaManager: React.FC<FamachaManagerProps> = ({ sheep, groups, onRefresh }) => {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [famachas, setFamachas] = useState<Record<string, string>>({});

  const list = sheep.filter(s => s.grupoId === selectedGroup && s.status === 'ativo');

  const handleSave = async () => {
    try {
      await Promise.all(Object.entries(famachas).map(([id, f]) => 
        sheepService.update(id, { famacha: parseInt(f as string) })
      ));
      onRefresh();
      setFamachas({});
      alert("Graus FAMACHA atualizados!");
    } catch (error) {
      alert("Erro ao atualizar FAMACHA.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Avaliação FAMACHA por Lote</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase mt-1">Grau de Anemia (Escala 1 a 5)</p>
        </div>
        <select 
          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-rose-500 transition-all w-full md:w-64" 
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
              <div key={s.id} className="flex flex-col gap-3 p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-rose-200 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-black text-xs uppercase text-slate-800 group-hover:text-rose-600 transition-colors">{s.nome}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">FAMACHA Atual: <span className="text-rose-600">G{s.famacha}</span></p>
                  </div>
                </div>
                
                <select 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-rose-600 outline-none focus:border-rose-500 shadow-sm uppercase"
                  value={famachas[s.id] || ''} 
                  onChange={e => setFamachas({...famachas, [s.id]: e.target.value})}
                >
                  <option value="">Avaliar FAMACHA...</option>
                  {FAMACHA_OPTIONS.map(opt => (
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
              disabled={Object.keys(famachas).length === 0}
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs shadow-xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              Salvar Graus FAMACHA
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FamachaManager;
