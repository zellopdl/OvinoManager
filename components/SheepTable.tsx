
import React, { useState, useMemo } from 'react';
import { Sheep, Breed, Supplier, Group, Paddock, Sanidade, Status, Sexo } from '../types';
import { calculateAge } from '../utils';
import { FAMACHA_OPTIONS, ECC_OPTIONS } from '../constants';

interface SheepTableProps {
  sheep: Sheep[];
  breeds: Breed[];
  suppliers: Supplier[];
  groups: Group[];
  paddocks: Paddock[];
  onEdit: (sheep: Sheep) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onAnalyze: (sheep: Sheep) => void;
}

type SortField = 'nome' | 'sexo' | 'piqueteId' | 'peso' | 'famacha' | 'nascimento' | 'sanidade';
type SortDirection = 'asc' | 'desc';

const SheepTable: React.FC<SheepTableProps> = ({ sheep, breeds, suppliers, groups, paddocks, onEdit, onDelete, onAdd, onAnalyze }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getBreedName = (id: string) => breeds.find(b => b.id === id)?.nome || 'SRD';
  const getPaddockName = (id: string) => paddocks.find(p => p.id === id)?.piquete || '-';
  
  const getFamachaLabel = (val: number) => FAMACHA_OPTIONS.find(o => o.value === val)?.label || `${val}`;
  const getEccLabel = (val: number) => ECC_OPTIONS.find(o => o.value === val)?.label || `${val}`;

  const calculateGMD = (s: Sheep) => {
    if (!s.historicoPeso || s.historicoPeso.length < 2) return null;
    const history = [...s.historicoPeso].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    const latest = history[0];
    const previous = history[1];
    
    const weightDiff = latest.peso - previous.peso;
    const daysDiff = Math.ceil((new Date(latest.data).getTime() - new Date(previous.data).getTime()) / (1000 * 3600 * 24));
    
    return daysDiff > 0 ? weightDiff / daysDiff : null;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeleteClick = (s: Sheep) => {
    if (window.confirm(`Deseja realmente EXCLUIR o animal ${s.nome} (Brinco: ${s.brinco})?`)) {
      onDelete(s.id);
    }
  };

  const sortedSheep = useMemo(() => {
    const filtered = sheep.filter(s => 
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.brinco.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.origem?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField as keyof Sheep];
      let valB: any = b[sortField as keyof Sheep];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (sortField === 'nascimento') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sheep, searchTerm, sortField, sortDirection]);

  const TableHeader = ({ field, label }: { field: SortField, label: string }) => (
    <th 
      className={`px-6 py-5 cursor-pointer transition-colors no-select group hover:bg-slate-100 ${sortField === field ? 'bg-slate-50/50' : ''}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        <span className={`${sortField === field ? 'text-slate-900 font-black' : 'text-slate-400 font-black'} transition-colors`}>
          {label}
        </span>
        <div className="inline-flex flex-col ml-1.5 align-middle leading-none">
          <span className={`text-[7px] ${sortField === field && sortDirection === 'asc' ? 'text-emerald-600' : 'text-slate-300'}`}>▲</span>
          <span className={`text-[7px] ${sortField === field && sortDirection === 'desc' ? 'text-emerald-600' : 'text-slate-300'}`}>▼</span>
        </div>
      </div>
    </th>
  );

  return (
    <div className="flex flex-col space-y-4 overflow-visible">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={onAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black shadow-lg uppercase text-[10px] tracking-widest transition-all"
        >
          Novo Registro
        </button>
      </div>

      <div className="flex-1 pb-20">
        {/* Mobile View */}
        <div className="block lg:hidden space-y-3">
          {sortedSheep.map(s => {
            const gmd = calculateGMD(s);
            return (
              <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  s.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-500' : s.sanidade === Sanidade.ENFERMARIA ? 'bg-amber-500' : 'bg-rose-500'
                }`}></div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-black text-sm text-slate-800 uppercase">{s.nome}</h4>
                    <p className="text-[9px] font-black text-emerald-600 tracking-widest">#{s.brinco} • {getBreedName(s.racaId)}</p>
                  </div>
                  <button onClick={() => onAnalyze(s)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs">✨</button>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Piquete</p>
                    <p className="text-[10px] font-bold text-slate-700 truncate">{getPaddockName(s.piqueteId)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Peso</p>
                    <p className="text-[10px] font-bold text-slate-700">{s.peso}kg</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Idade</p>
                    <p className="text-[10px] font-bold text-slate-700 truncate">{calculateAge(s.nascimento)}</p>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-slate-50 pt-2">
                  <button onClick={() => onEdit(s)} className="flex-1 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-xs font-black uppercase">✏️ Editar</button>
                  <button onClick={() => handleDeleteClick(s)} className="flex-1 py-1.5 bg-rose-50 text-rose-400 rounded-lg text-xs font-black uppercase">🗑️ Excluir</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[9px] uppercase tracking-widest font-black sticky top-0 z-10">
              <tr>
                <TableHeader field="nome" label="Animal" />
                <TableHeader field="sanidade" label="Sanidade" />
                <TableHeader field="nascimento" label="Idade" />
                <TableHeader field="sexo" label="Sexo" />
                <TableHeader field="piqueteId" label="Piquete" />
                <TableHeader field="peso" label="Peso" />
                <TableHeader field="famacha" label="Saúde" />
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSheep.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-xs uppercase">{s.nome}</span>
                      <span className="text-[9px] text-emerald-600 font-bold tracking-widest">#{s.brinco}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      s.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {s.sanidade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700">{calculateAge(s.nascimento)}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase">{s.sexo}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700">{getPaddockName(s.piqueteId)}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700">{s.peso}kg</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">FAM: {s.famacha}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">ECC: {s.ecc}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onAnalyze(s)} className="p-2 text-indigo-400 hover:text-indigo-600">✨</button>
                      <button onClick={() => onEdit(s)} className="p-2 text-slate-300 hover:text-emerald-600">✏️</button>
                      <button onClick={() => handleDeleteClick(s)} className="p-2 text-slate-300 hover:text-rose-400">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SheepTable;
