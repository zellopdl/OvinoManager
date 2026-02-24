
import React, { useState, useEffect } from 'react';
import { Sheep, Breed, Supplier, Group, Paddock, Sexo, Status, Sanidade } from '../types';
import { FAMACHA_OPTIONS, ECC_OPTIONS, STATUS_OPTIONS, SEXO_OPTIONS, SANIDADE_OPTIONS } from '../constants';
import { calculateAge } from '../utils';

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
  const [formData, setFormData] = useState<Partial<Sheep>>({
    brinco: '',
    nome: '',
    nascimento: new Date().toISOString().split('T')[0],
    sexo: Sexo.FEMEA,
    racaId: '',
    origem: 'Nascido na Fazenda',
    piqueteId: '',
    peso: 0,
    saude: '',
    sanidade: Sanidade.SAUDAVEL,
    famacha: 1,
    ecc: 3,
    grupoId: '',
    status: Status.ATIVO,
    prenha: false,
    pai: '',
    mae: '',
    obs: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sheep) {
      setFormData({
        ...sheep,
        nascimento: sheep.nascimento ? new Date(sheep.nascimento).toISOString().split('T')[0] : '',
        racaId: sheep.racaId || '',
        origem: sheep.origem || 'Nascido na Fazenda',
        piqueteId: sheep.piqueteId || '',
        grupoId: sheep.grupoId || '',
        pai: sheep.pai || '',
        mae: sheep.mae || '',
        obs: sheep.obs || '',
      });
    }
  }, [sheep]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    
    if (type === 'number') {
      processedValue = value === '' ? 0 : Number(value);
    } else if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'brinco' || name === 'nome' || name === 'pai' || name === 'mae') {
      processedValue = value.toUpperCase();
    }

    setFormData(prev => {
      const newState = { ...prev, [name]: processedValue };
      
      // Regra: Se mudar para macho, desmarca prenha
      if (name === 'sexo' && processedValue === Sexo.MACHO) {
        newState.prenha = false;
      }

      // Regra Especial: Se a sanidade for Óbito, o status geral deve ser Óbito também
      if (name === 'sanidade' && processedValue === Sanidade.OBITO) {
        newState.status = Status.OBITO;
      }

      return newState;
    });

    // Validação em tempo real para Brinco e Nome
    if (name === 'brinco') {
      const isDuplicate = existingSheep.some(s => 
        s.id !== sheep?.id && s.brinco.trim().toUpperCase() === (processedValue as string).trim().toUpperCase()
      );
      if (isDuplicate && (processedValue as string).trim() !== '') {
        setErrors(prev => ({ ...prev, brinco: 'Este brinco já está cadastrado!' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.brinco;
          return newErrors;
        });
      }
    }

    if (name === 'nome') {
      const isDuplicate = existingSheep.some(s => 
        s.id !== sheep?.id && s.nome.trim().toUpperCase() === (processedValue as string).trim().toUpperCase()
      );
      if (isDuplicate && (processedValue as string).trim() !== '') {
        setErrors(prev => ({ ...prev, nome: 'Este nome já está cadastrado!' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.nome;
          return newErrors;
        });
      }
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const bTrim = (formData.brinco || '').trim().toUpperCase();
    const nTrim = (formData.nome || '').trim().toUpperCase();

    if (!bTrim) newErrors.brinco = 'Brinco é obrigatório';
    if (!nTrim) newErrors.nome = 'Nome é obrigatório';
    
    if (bTrim && existingSheep.some(s => s.id !== sheep?.id && s.brinco.trim().toUpperCase() === bTrim)) {
      newErrors.brinco = 'Este brinco já existe no rebanho';
    }

    if (nTrim && existingSheep.some(s => s.id !== sheep?.id && s.nome.trim().toUpperCase() === nTrim)) {
      newErrors.nome = 'Este nome já existe no rebanho';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsSaving(true);
      try {
        await onSubmit(formData);
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar dados. Verifique a conexão.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Verifica se o valor atual da origem existe na lista de fornecedores
  const isHistoricalSupplier = formData.origem && 
                              formData.origem !== 'Nascido na Fazenda' && 
                              !suppliers.some(s => s.nome === formData.origem);

  return (
    <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-300 pb-20">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {sheep ? `Editando: ${sheep.nome}` : 'Novo Cadastro de Animal'}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Preencha os dados técnicos do animal abaixo</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="px-5 py-2.5 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
            <button 
              type="submit" 
              disabled={isSaving || Object.keys(errors).length > 0}
              className={`px-8 py-2.5 bg-emerald-600 text-white font-black rounded-xl shadow-lg uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center gap-2 ${isSaving || Object.keys(errors).length > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'}`}
            >
              {isSaving ? 'Gravando...' : 'Salvar Registro'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Identificação do Animal
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Nº Brinco / Chip *</label>
                  <div className="relative">
                    <input 
                      name="brinco"
                      type="text" 
                      required
                      className={`w-full p-3 bg-slate-50 border ${errors.brinco ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-slate-200 focus:border-emerald-500'} rounded-xl focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono font-bold text-sm uppercase`}
                      value={formData.brinco}
                      onChange={handleChange}
                      placeholder="000/00"
                    />
                    {errors.brinco && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500">⚠️</div>}
                  </div>
                  {errors.brinco && <p className="text-[9px] text-rose-500 mt-1 font-bold uppercase">{errors.brinco}</p>}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Nome do Animal *</label>
                  <div className="relative">
                    <input 
                      name="nome"
                      type="text" 
                      required
                      className={`w-full p-3 bg-slate-50 border ${errors.nome ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-slate-200 focus:border-emerald-500'} rounded-xl focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-bold text-sm uppercase`}
                      value={formData.nome}
                      onChange={handleChange}
                      placeholder="EX: LUNA, BARÃO..."
                    />
                    {errors.nome && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500">⚠️</div>}
                  </div>
                  {errors.nome && <p className="text-[9px] text-rose-500 mt-1 font-bold uppercase">{errors.nome}</p>}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Sexo</label>
                  <select name="sexo" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.sexo} onChange={handleChange}>
                    {SEXO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Data de Nascimento</label>
                  <input name="nascimento" type="date" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.nascimento} onChange={handleChange} />
                  {formData.nascimento && (
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1.5 ml-1">
                      ✨ Idade estimada: {calculateAge(formData.nascimento || '')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Raça</label>
                  <select name="racaId" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.racaId} onChange={handleChange}>
                    <option value="">Selecione a Raça...</option>
                    {breeds.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Origem / Fornecedor</label>
                  <select name="origem" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.origem} onChange={handleChange}>
                    <option value="Nascido na Fazenda">Nascido na Fazenda</option>
                    {suppliers.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                    {/* Caso especial: Se o fornecedor foi excluído, mantém o nome salvo no banco visível aqui */}
                    {isHistoricalSupplier && (
                      <option value={formData.origem}>{formData.origem} (Cadastro Excluído)</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Genealogia (Ascendência)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Nome do Pai</label>
                  <input name="pai" type="text" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm uppercase transition-all" value={formData.pai} onChange={handleChange} placeholder="NOME DO REPRODUTOR" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Nome da Mãe</label>
                  <input name="mae" type="text" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm uppercase transition-all" value={formData.mae} onChange={handleChange} placeholder="NOME DA MATRIZ" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Observações Técnicas / Histórico</label>
              <textarea 
                name="obs" 
                rows={4} 
                className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-medium text-sm focus:bg-white transition-all resize-none"
                value={formData.obs}
                onChange={handleChange}
                placeholder="Ex: Animal dócil, histórico de partos duplos, etc..."
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white space-y-5">
              <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Alocação e Status
              </h3>
              
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Lote / Grupo</label>
                <select name="grupoId" className="w-full p-3 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm text-white transition-all" value={formData.grupoId} onChange={handleChange}>
                  <option value="">Sem Grupo Definido</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Piquete Atual</label>
                <select name="piqueteId" className="w-full p-3 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm text-white transition-all" value={formData.piqueteId} onChange={handleChange}>
                  <option value="">Sem Piquete Definido</option>
                  {paddocks.map(p => <option key={p.id} value={p.id}>{p.piquete}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Situação do Animal</label>
                <select name="status" className="w-full p-3 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm text-white transition-all" value={formData.status} onChange={handleChange}>
                  {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {formData.sexo === Sexo.FEMEA && (
                <div className="pt-2 animate-in slide-in-from-right-2">
                  <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                    <input 
                      name="prenha"
                      type="checkbox" 
                      className="w-5 h-5 text-emerald-500 rounded bg-slate-800 border-slate-600 focus:ring-emerald-500"
                      checked={formData.prenha}
                      onChange={handleChange}
                    />
                    <div>
                      <span className="text-[11px] font-black text-emerald-400 uppercase tracking-tighter block">Confirmar Prenhez</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase">Matriz em gestação confirmada</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Saúde e Pesagem
              </h3>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Status de Sanidade</label>
                <select name="sanidade" className={`w-full p-3 border rounded-xl outline-none font-black text-sm uppercase transition-all ${
                  formData.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-50 border-emerald-200 text-emerald-700 focus:border-emerald-500' :
                  formData.sanidade === Sanidade.ENFERMARIA ? 'bg-amber-50 border-amber-200 text-amber-700 focus:border-amber-500' :
                  'bg-rose-50 border-rose-200 text-rose-700 focus:border-rose-500'
                }`} value={formData.sanidade} onChange={handleChange}>
                  {SANIDADE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Peso de Entrada (kg)</label>
                <div className="relative">
                  <input name="peso" type="number" step="0.1" className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-black text-lg text-slate-800 transition-all" value={formData.peso} onChange={handleChange} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">KG</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Famacha</label>
                  <select name="famacha" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.famacha} onChange={handleChange}>
                    {FAMACHA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">ECC</label>
                  <select name="ecc" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.ecc} onChange={handleChange}>
                    {ECC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
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
