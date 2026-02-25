
import React, { useState } from 'react';
import { entityService } from './entityService';
import { Supplier, Sheep } from '../../types';

// Fix: Added sheep prop and updated onRefresh type to match App.tsx loadInitialData to resolve type error in App.tsx
interface SupplierManagerProps {
  initialData: Supplier[];
  onRefresh: (forceLocal?: boolean) => void | Promise<void>;
  sheep?: Sheep[];
}

const SupplierManager: React.FC<SupplierManagerProps> = ({ initialData, onRefresh, sheep = [] }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ nome: '', contato: '', celular: '', fornece: '', endereco: '' });

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "").substring(0, 11);
    if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (v.length > 2) return v.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    return v;
  };

  const handleEdit = (s: Supplier) => {
    setEditing(s);
    setFormData({ nome: s.nome, contato: s.contato || '', celular: s.celular || '', fornece: s.fornece || '', endereco: s.endereco || '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, nome: formData.nome.toUpperCase(), contato: formData.contato.toUpperCase(), fornece: formData.fornece.toUpperCase(), endereco: formData.endereco.toUpperCase() };
    if (editing) await entityService.update('fornecedores', editing.id, payload);
    else await entityService.create('fornecedores', payload);
    setIsFormOpen(false);
    onRefresh();
    setFormData({ nome: '', contato: '', celular: '', fornece: '', endereco: '' });
    setEditing(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Fornecedores</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão de parceiros e suprimentos</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-lg active:scale-95 transition-all">Novo Fornecedor</button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-200 shadow-2xl animate-in zoom-in-95 w-full max-w-2xl overflow-y-auto max-h-[95vh]">
            <div className="mb-6 sm:mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão de parceiros e suprimentos</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Empresa / Fazenda</label>
                  <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase outline-none focus:border-emerald-500" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Responsável</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase outline-none focus:border-emerald-500" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">WhatsApp</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500" placeholder="(00) 00000-0000" value={formData.celular} onChange={e => setFormData({...formData, celular: formatPhone(e.target.value)})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Tipo de Suprimento</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase outline-none focus:border-emerald-500" placeholder="EX: ANIMAIS, RAÇÃO, VETERINÁRIA" value={formData.fornece} onChange={e => setFormData({...formData, fornece: e.target.value})} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6 pt-6 border-t border-slate-50">
                 <button type="button" onClick={() => { setIsFormOpen(false); setEditing(null); }} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                 <button type="submit" className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
              <tr><th className="p-5">Fornecedor</th><th className="p-5">O que fornece</th><th className="p-5">WhatsApp</th><th className="p-5 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y text-xs">
              {initialData.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 group">
                  <td className="p-5">
                    <p className="font-black uppercase text-slate-800">{s.nome}</p>
                    <p className="text-[9px] font-bold text-slate-400">{s.contato || 'SEM RESPONSÁVEL'}</p>
                  </td>
                  <td className="p-5 font-bold text-slate-600 uppercase italic">{s.fornece || '-'}</td>
                  <td className="p-5 text-emerald-600 font-black tracking-tight">{s.celular || '-'}</td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(s)} className="p-2 bg-slate-50 rounded-lg">✏️</button>
                      <button onClick={async () => { 
                        // Fix: Added check for linked sheep before deletion to prevent database errors and ensure data integrity
                        const isUsed = sheep.some(anim => anim.origem === s.nome);
                        if (isUsed) {
                          alert(`BLOQUEIO: O fornecedor "${s.nome}" é a origem de animais no rebanho.`);
                          return;
                        }
                        if(confirm("Excluir?")) { await entityService.delete('fornecedores', s.id); onRefresh(); } 
                      }} className="p-2 bg-rose-50 text-rose-400 rounded-lg">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y">
          {initialData.map(s => (
            <div key={s.id} className="p-6 space-y-4 active:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black uppercase text-slate-800 text-base">{s.nome}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{s.contato || 'Sem responsável'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(s)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">✏️</button>
                  <button onClick={async () => { 
                    const isUsed = sheep.some(anim => anim.origem === s.nome);
                    if (isUsed) {
                      alert(`BLOQUEIO: O fornecedor "${s.nome}" é a origem de animais no rebanho.`);
                      return;
                    }
                    if(confirm("Excluir?")) { await entityService.delete('fornecedores', s.id); onRefresh(); } 
                  }} className="p-3 bg-rose-50 text-rose-400 rounded-xl">🗑️</button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Suprimento</p>
                    <p className="text-xs font-bold text-slate-600 uppercase italic">{s.fornece || '-'}</p>
                  </div>
                </div>
                {s.celular && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">WhatsApp</p>
                      <p className="text-xs font-black text-emerald-600 tracking-tight">{s.celular}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {initialData.length === 0 && (
            <div className="p-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Nenhum fornecedor cadastrado</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierManager;
