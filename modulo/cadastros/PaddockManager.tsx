
import React, { useState } from 'react';
import { entityService } from './entityService';
import { Paddock, Sheep, Status, Sexo } from '../../types';
import { calculateAge } from '../../utils';

interface PaddockManagerProps {
  initialData: Paddock[];
  onRefresh: () => void;
  sheep: Sheep[];
}

const PaddockManager: React.FC<PaddockManagerProps> = ({ initialData, onRefresh, sheep }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPaddock, setEditingPaddock] = useState<Paddock | null>(null);
  const [viewingSheepList, setViewingSheepList] = useState<Paddock | null>(null);
  const [formData, setFormData] = useState({ piquete: '', tamanho: '', lotacao: '0', grama: '' });

  const handleEdit = (p: Paddock, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPaddock(p);
    setFormData({ piquete: p.piquete, tamanho: p.tamanho?.toString() || '', lotacao: p.lotacao.toString(), grama: p.grama || '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      piquete: formData.piquete.toUpperCase(), 
      tamanho: formData.tamanho ? parseFloat(formData.tamanho) : null,
      lotacao: parseInt(formData.lotacao),
      grama: formData.grama.toUpperCase()
    };
    if (editingPaddock) await entityService.update('piquetes', editingPaddock.id, payload);
    else await entityService.create('piquetes', payload);
    setIsFormOpen(false);
    onRefresh();
    setFormData({ piquete: '', tamanho: '', lotacao: '0', grama: '' });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const hasSheep = sheep.some(s => s.piqueteId === id && s.status === Status.ATIVO);
    if (hasSheep) {
      alert("BLOQUEIO: Existem animais ativos alocados neste piquete. Mova-os primeiro.");
      return;
    }
    if (confirm("Deseja excluir este piquete permanentemente?")) {
      await entityService.delete('piquetes', id);
      onRefresh();
    }
  };

  const getSheepInPaddock = (paddockId: string) => {
    return sheep.filter(s => s.piqueteId === paddockId && s.status === Status.ATIVO);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Mapa de Piquetes</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gerenciamento de áreas e lotação instantânea</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-lg shadow-emerald-900/10 active:scale-95 transition-all">Novo Piquete</button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-2xl animate-in zoom-in-95 w-full max-w-2xl">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase">{editingPaddock ? 'Editar Área' : 'Nova Área de Pastagem'}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Configure os limites técnicos do piquete</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Identificação do Piquete *</label>
                  <input required autoFocus className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-sm focus:border-emerald-500 transition-all outline-none" value={formData.piquete} onChange={e => setFormData({...formData, piquete: e.target.value})} placeholder="EX: PIQUETE MATERNIDADE" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Área Total (Hectares)</label>
                  <input type="number" step="0.1" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-emerald-500" value={formData.tamanho} onChange={e => setFormData({...formData, tamanho: e.target.value})} placeholder="EX: 1.5" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Lotação Máxima (Cabeças) *</label>
                  <input type="number" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-emerald-500" value={formData.lotacao} onChange={e => setFormData({...formData, lotacao: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Pastagem (Grama)</label>
                  <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-sm outline-none focus:border-emerald-500" value={formData.grama} onChange={e => setFormData({...formData, grama: e.target.value})} placeholder="EX: TIFTON 85, BRASILIENSE..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-50">
                 <button type="button" onClick={() => { setIsFormOpen(false); setEditingPaddock(null); }} className="px-8 py-4 text-slate-400 font-black uppercase text-[11px]">Cancelar</button>
                 <button type="submit" className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all">Confirmar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b">
            <tr>
              <th className="p-6">Identificação</th>
              <th className="p-6">Capacidade</th>
              <th className="p-6">Ocupação Atual</th>
              <th className="p-6">Pastagem</th>
              <th className="p-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {initialData.map(p => {
              const occupants = getSheepInPaddock(p.id);
              const occupancyRate = (occupants.length / p.lotacao) * 100;
              
              return (
                <tr 
                  key={p.id} 
                  onClick={() => setViewingSheepList(p)}
                  className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                >
                  <td className="p-6">
                    <p className="font-black uppercase text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{p.piquete}</p>
                    <p className="text-[9px] font-bold text-slate-400">{p.tamanho || '0'} ha de área total</p>
                  </td>
                  <td className="p-6 font-black text-slate-600">
                    {p.lotacao} <span className="text-[9px] opacity-40 uppercase ml-1">Cab.</span>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase">
                        <span className={occupancyRate > 90 ? 'text-rose-600' : 'text-emerald-600'}>{occupants.length} Ocupantes</span>
                        <span className="text-slate-400">{Math.round(occupancyRate)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-700 ${occupancyRate > 90 ? 'bg-rose-500' : occupancyRate > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(occupancyRate, 100)}%` }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="px-3 py-1 bg-slate-100 rounded-full font-black text-[9px] uppercase text-slate-500">{p.grama || 'NÃO DEF.'}</span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={(e) => handleEdit(p, e)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:text-indigo-600 shadow-sm transition-all" title="Editar">✏️</button>
                      <button onClick={(e) => handleDelete(p.id, e)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all" title="Excluir">🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {initialData.length === 0 && (
              <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Nenhum piquete cadastrado no sistema</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE LISTAGEM DE ANIMAIS NO PIQUETE */}
      {viewingSheepList && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
              <div className="p-8 border-b bg-slate-50 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-[20px] flex items-center justify-center text-2xl shadow-lg shadow-indigo-200">🌾</div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{viewingSheepList.piquete}</h3>
                       <div className="flex gap-3 items-center mt-1">
                          <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                             {getSheepInPaddock(viewingSheepList.id).length} Animais Presentes
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacidade: {viewingSheepList.lotacao}</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setViewingSheepList(null)} className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                 {getSheepInPaddock(viewingSheepList.id).length === 0 ? (
                    <div className="py-20 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                       <span className="text-4xl block mb-4">🏜️</span>
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Este piquete está vazio no momento</p>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
                             <span className="text-[10px] font-black text-indigo-600 uppercase">Machos</span>
                             <span className="text-xl font-black text-indigo-700">{getSheepInPaddock(viewingSheepList.id).filter(s => s.sexo === Sexo.MACHO).length}</span>
                          </div>
                          <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 flex justify-between items-center">
                             <span className="text-[10px] font-black text-pink-600 uppercase">Fêmeas</span>
                             <span className="text-xl font-black text-pink-700">{getSheepInPaddock(viewingSheepList.id).filter(s => s.sexo === Sexo.FEMEA).length}</span>
                          </div>
                       </div>

                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Lista Nominal de Ocupantes</h4>
                       
                       <div className="grid grid-cols-1 gap-3">
                          {getSheepInPaddock(viewingSheepList.id).map(s => (
                             <div key={s.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-300 hover:bg-white transition-all shadow-sm">
                                <div className={`w-3 h-3 rounded-full shrink-0 ${s.sexo === Sexo.MACHO ? 'bg-indigo-400' : 'bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.4)]'}`} />
                                <div className="flex-1 min-w-0">
                                   <div className="flex items-baseline gap-2">
                                      <p className="text-xs font-black text-slate-800 uppercase truncate">{s.nome}</p>
                                      <p className="text-[9px] font-bold text-indigo-600 tracking-widest">#{s.brinco}</p>
                                   </div>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                      {calculateAge(s.nascimento)}
                                   </p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[11px] font-black text-slate-700">{s.peso}kg</p>
                                   <p className="text-[8px] font-black text-slate-300 uppercase">Peso Atual</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-8 border-t bg-slate-50 flex justify-end shrink-0">
                 <button onClick={() => setViewingSheepList(null)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg active:scale-95 transition-all">Fechar Listagem</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PaddockManager;
