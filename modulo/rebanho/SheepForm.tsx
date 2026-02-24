
import React, { useState, useEffect } from 'react';
import { Sheep, Breed, Supplier, Group, Paddock, Sexo, Status, Sanidade } from '../../types';
import { calculateAge } from '../../utils';
import { FAMACHA_OPTIONS, ECC_OPTIONS, STATUS_OPTIONS, SEXO_OPTIONS, SANIDADE_OPTIONS } from '../../constants';

interface SheepFormProps {
  sheep?: Sheep;
  breeds: Breed[];
  suppliers: Supplier[];
  groups: Group[];
  paddocks: Paddock[];
  onSubmit: (data: Partial<Sheep>) => void;
  onCancel: () => void;
  existingSheep: Sheep[];
}

const SheepForm: React.FC<SheepFormProps> = ({ sheep, breeds, suppliers, groups, paddocks, onSubmit, onCancel, existingSheep }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<Sheep>>({
    brinco: '', nome: '', nascimento: new Date().toISOString().split('T')[0],
    sexo: Sexo.FEMEA, racaId: '', origem: 'Nascido na Fazenda', piqueteId: '',
    peso: 0, sanidade: Sanidade.SAUDAVEL, famacha: 1, ecc: 3, grupoId: '',
    status: Status.ATIVO, prenha: false, pai: '', mae: '', obs: '',
  });

  useEffect(() => {
    if (sheep) {
      setFormData({
        ...sheep,
        nascimento: sheep.nascimento ? new Date(sheep.nascimento).toISOString().split('T')[0] : '',
      });
    }
  }, [sheep]);

  // Validação em tempo real (Tempo de digitação)
  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };
    const cleanValue = value.trim().toUpperCase();

    if (name === 'brinco') {
      const isDuplicate = existingSheep.some(s => 
        s.id !== sheep?.id && s.brinco.trim().toUpperCase() === cleanValue
      );
      if (isDuplicate && cleanValue !== '') {
        newErrors.brinco = 'Este Brinco já está cadastrado!';
      } else {
        delete newErrors.brinco;
      }
    }

    if (name === 'nome') {
      const isDuplicate = existingSheep.some(s => 
        s.id !== sheep?.id && s.nome.trim().toUpperCase() === cleanValue
      );
      if (isDuplicate && cleanValue !== '') {
        newErrors.nome = 'Este Nome já está em uso!';
      } else {
        delete newErrors.nome;
      }
    }

    setErrors(newErrors);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let val: any = value;
    
    if (type === 'number') val = value === '' ? 0 : Number(value);
    if (type === 'checkbox') val = (e.target as HTMLInputElement).checked;
    if (['brinco', 'nome', 'pai', 'mae'].includes(name)) val = value.toUpperCase();

    setFormData(prev => {
      const next = { ...prev, [name]: val };
      if (name === 'sexo' && val === Sexo.MACHO) next.prenha = false;
      if (name === 'sanidade' && val === Sanidade.OBITO) next.status = Status.OBITO;
      return next;
    });

    // Dispara validação em tempo real
    if (name === 'brinco' || name === 'nome') {
      validateField(name, val);
    }
  };

  const validateOnSubmit = () => {
    const e: Record<string, string> = {};
    if (!formData.brinco?.trim()) e.brinco = 'Campo obrigatório';
    if (!formData.nome?.trim()) e.nome = 'Campo obrigatório';
    
    // Revalidação final de duplicidade
    const bTrim = formData.brinco?.trim().toUpperCase();
    const nTrim = formData.nome?.trim().toUpperCase();
    
    if (existingSheep.some(s => s.id !== sheep?.id && s.brinco.trim().toUpperCase() === bTrim)) e.brinco = 'Brinco duplicado';
    if (existingSheep.some(s => s.id !== sheep?.id && s.nome.trim().toUpperCase() === nTrim)) e.nome = 'Nome duplicado';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateOnSubmit()) {
      setIsSaving(true);
      try { await onSubmit(formData); } 
      finally { setIsSaving(false); }
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="max-w-5xl mx-auto animate-in zoom-in-95 duration-300 pb-20">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{sheep ? 'Editar Ficha Clínica' : 'Novo Registro de Animal'}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão de rastreabilidade e performance biológica</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button type="button" onClick={onCancel} className="flex-1 md:flex-none px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
            <button 
              type="submit" 
              disabled={isSaving || hasErrors} 
              className={`flex-1 md:flex-none px-10 py-3 text-white font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest active:scale-95 transition-all ${
                hasErrors ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSaving ? 'Gravando...' : 'Salvar Ficha'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Identificação Principal */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Identificação & Origem
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={`block text-[9px] font-black uppercase mb-2 ml-1 tracking-widest ${errors.brinco ? 'text-rose-500' : 'text-slate-400'}`}>
                    Brinco / Identificador *
                  </label>
                  <input 
                    name="brinco" 
                    required 
                    className={`w-full p-4 bg-slate-50 border rounded-2xl font-black text-sm uppercase transition-all ${
                      errors.brinco ? 'border-rose-400 ring-4 ring-rose-50 text-rose-700' : 'border-slate-200 focus:border-emerald-500'
                    }`} 
                    value={formData.brinco} 
                    onChange={handleChange} 
                    placeholder="000" 
                  />
                  {errors.brinco && <p className="text-[9px] text-rose-500 font-bold mt-2 ml-1 uppercase animate-bounce">⚠️ {errors.brinco}</p>}
                </div>
                <div>
                  <label className={`block text-[9px] font-black uppercase mb-2 ml-1 tracking-widest ${errors.nome ? 'text-rose-500' : 'text-slate-400'}`}>
                    Nome do Animal *
                  </label>
                  <input 
                    name="nome" 
                    required 
                    className={`w-full p-4 bg-slate-50 border rounded-2xl font-black text-sm uppercase transition-all ${
                      errors.nome ? 'border-rose-400 ring-4 ring-rose-50 text-rose-700' : 'border-slate-200 focus:border-emerald-500'
                    }`} 
                    value={formData.nome} 
                    onChange={handleChange} 
                    placeholder="EX: LUNA" 
                  />
                  {errors.nome && <p className="text-[9px] text-rose-500 font-bold mt-2 ml-1 uppercase animate-bounce">⚠️ {errors.nome}</p>}
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Sexo</label>
                  <select name="sexo" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm" value={formData.sexo} onChange={handleChange}>
                    {SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Data de Nascimento</label>
                  <input name="nascimento" type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm" value={formData.nascimento} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Raça</label>
                  <select name="racaId" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm" value={formData.racaId} onChange={handleChange}>
                    <option value="">SRD (Sem Raça Definida)</option>
                    {breeds.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Fornecedor / Origem</label>
                  <select name="origem" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm" value={formData.origem} onChange={handleChange}>
                    <option value="Nascido na Fazenda">Nascido na Fazenda</option>
                    {suppliers.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Genealogia */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
              <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Árvore Genealógica
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <input name="pai" placeholder="NOME DO PAI (REPRODUTOR)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm uppercase transition-all" value={formData.pai} onChange={handleChange} />
                <input name="mae" placeholder="NOME DA MÃE (MATRIZ)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm uppercase transition-all" value={formData.mae} onChange={handleChange} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Histórico & Observações</label>
              <textarea name="obs" rows={4} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-medium text-sm focus:bg-white transition-all resize-none" value={formData.obs} onChange={handleChange} placeholder="Descreva particularidades do animal, vacinas ou comportamento..." />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white space-y-6">
              <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em]">📍 Alocação Estratégica</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-2 tracking-widest">Lote Atual</label>
                  <select name="grupoId" className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl font-black text-xs text-white" value={formData.grupoId} onChange={handleChange}>
                    <option value="">Sem Lote Atribuído</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-2 tracking-widest">Piquete / Área</label>
                  <select name="piqueteId" className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl font-black text-xs text-white" value={formData.piqueteId} onChange={handleChange}>
                    <option value="">Sem Área Definida</option>
                    {paddocks.map(p => <option key={p.id} value={p.id}>{p.piquete}</option>)}
                  </select>
                </div>
                {formData.sexo === Sexo.FEMEA && (
                  <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all">
                    <input name="prenha" type="checkbox" className="w-5 h-5 text-emerald-500 rounded bg-slate-800" checked={formData.prenha} onChange={handleChange} />
                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-tighter">Confirmar Prenhez</span>
                  </label>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-[11px] font-black text-rose-600 uppercase tracking-[0.2em] mb-4">🏥 Índices Biológicos</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Status Sanitário</label>
                  <select name="sanidade" className={`w-full p-4 border rounded-2xl font-black text-sm uppercase transition-all ${
                    formData.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                  }`} value={formData.sanidade} onChange={handleChange}>
                    {SANIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Peso Atual (kg)</label>
                  <div className="relative">
                    <input name="peso" type="number" step="0.1" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-800" value={formData.peso} onChange={handleChange} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">KG</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Grau Famacha (Anemia)</label>
                    <select name="famacha" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs" value={formData.famacha} onChange={handleChange}>
                      {FAMACHA_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Escore Corporal (ECC)</label>
                    <select name="ecc" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs" value={formData.ecc} onChange={handleChange}>
                      {ECC_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SheepForm;
