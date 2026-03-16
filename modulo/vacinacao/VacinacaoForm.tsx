import React, { useState } from 'react';
import { VacinacaoConfig } from './VacinacaoManager';

interface Props {
  onSubmit: (config: VacinacaoConfig) => void;
}

const VacinacaoForm: React.FC<Props> = ({ onSubmit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<VacinacaoConfig>({
    hasRaiva: false,
    hasLeptospirose: false,
    hasPasteurelose: false,
    hasLinfadenite: false,
    hasEctima: false,
    protocoloOficial: '',
    tipoClostridiose: '8',
    vacinaRaivaDisp: false,
    vacinaLeptoDisp: false,
    vacinaPasteureloseDisp: false,
    outrasVacinas: '',
    temHistorico: false,
    historicoDetalhes: '',
    estacaoMonta: false,
    prenhezMultipla: false,
    reforcoGestacao: false,
    mesAnual: new Date().getMonth() + 1,
    intervalo5Dias: false,
    quadroVisual: true,
  });

  const handleChange = (field: keyof VacinacaoConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <h3 className="text-lg font-black text-slate-800 uppercase border-b pb-2">1. Localização / Epidemiologia</h3>
      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.hasRaiva} onChange={e => handleChange('hasRaiva', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Há ocorrência de Raiva na região? (morcegos hematófagos, casos confirmados)</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.hasLeptospirose} onChange={e => handleChange('hasLeptospirose', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Há ocorrência de Leptospirose? (região úmida, presença de roedores)</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.hasPasteurelose} onChange={e => handleChange('hasPasteurelose', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Há ocorrência de Pasteurelose? (sistemas intensivos, histórico de pneumonias)</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.hasLinfadenite} onChange={e => handleChange('hasLinfadenite', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Há ocorrência de Linfadenite caseosa no rebanho/região?</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.hasEctima} onChange={e => handleChange('hasEctima', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Há ocorrência de Ectima contagioso no rebanho/região?</span>
        </label>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase mb-2">Protocolo oficial exigido pelo órgão de defesa local:</label>
          <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm focus:border-indigo-500 outline-none" placeholder="Ex: Vacinação obrigatória contra febre aftosa em maio" value={formData.protocoloOficial} onChange={e => handleChange('protocoloOficial', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <h3 className="text-lg font-black text-slate-800 uppercase border-b pb-2">2. Vacinas Disponíveis</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase mb-2">Vacina contra Clostridioses disponível:</label>
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-indigo-500 outline-none" value={formData.tipoClostridiose} onChange={e => handleChange('tipoClostridiose', e.target.value)}>
            <option value="5">5 Cepas</option>
            <option value="7">7 Cepas</option>
            <option value="8">8 Cepas</option>
            <option value="nenhuma">Nenhuma</option>
          </select>
        </div>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.vacinaRaivaDisp} onChange={e => handleChange('vacinaRaivaDisp', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Há vacina contra Raiva disponível?</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.vacinaLeptoDisp} onChange={e => handleChange('vacinaLeptoDisp', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Há vacina contra Leptospirose disponível?</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.vacinaPasteureloseDisp} onChange={e => handleChange('vacinaPasteureloseDisp', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Há vacina contra Pasteurelose disponível?</span>
        </label>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase mb-2">Outras vacinas registradas e acessíveis (linfadenite, ectima):</label>
          <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm focus:border-indigo-500 outline-none" placeholder="Ex: Vacina autógena para Linfadenite" value={formData.outrasVacinas} onChange={e => handleChange('outrasVacinas', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <h3 className="text-lg font-black text-slate-800 uppercase border-b pb-2">3. Animais Recém-chegados (Quarentena)</h3>
      <p className="text-sm text-slate-500 font-medium">Esta etapa define como o sistema lidará com os novos animais que entram no rebanho e são colocados em QUARENTENA, já que os animais antigos já se enquadraram no calendário quando chegaram na Cabanha.</p>
      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.temHistorico} onChange={e => handleChange('temHistorico', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Os animais novos (em QUARENTENA) costumam chegar com histórico vacinal confiável da origem?</span>
        </label>
        
        {formData.temHistorico ? (
          <div className="animate-in fade-in">
            <label className="block text-xs font-black text-slate-500 uppercase mb-2">Quais vacinas geralmente já vêm aplicadas nestes animais novos?</label>
            <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm focus:border-indigo-500 outline-none resize-none" rows={3} placeholder="Ex: Clostridiose e Raiva" value={formData.historicoDetalhes} onChange={e => handleChange('historicoDetalhes', e.target.value)} />
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-sm font-bold text-amber-800">⚠️ Sem histórico ou controle de origem.</p>
            <p className="text-xs text-amber-700 mt-1">Todos os animais novos entrarão no Módulo de Sincronização (Protocolo de Entrada com reforço em 30 dias) ao serem colocados no grupo "Quarentena".</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <h3 className="text-lg font-black text-slate-800 uppercase border-b pb-2">4. Situação Reprodutiva</h3>
      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.estacaoMonta} onChange={e => handleChange('estacaoMonta', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">As matrizes estão em estação de monta?</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.prenhezMultipla} onChange={e => handleChange('prenhezMultipla', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Há previsão de prenhez múltipla no mesmo ano?</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.reforcoGestacao} onChange={e => handleChange('reforcoGestacao', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">O calendário deve incluir reforço de Clostridioses aos 100 dias de gestação? (Recomendado)</span>
        </label>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <h3 className="text-lg font-black text-slate-800 uppercase border-b pb-2">5. Manejo / Organização</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase mb-2">Mês da vacinação anual (Ex: Antes da estação de monta):</label>
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-indigo-500 outline-none" value={formData.mesAnual} onChange={e => handleChange('mesAnual', parseInt(e.target.value))}>
            {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.intervalo5Dias} onChange={e => handleChange('intervalo5Dias', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Deseja aplicar vacinas diferentes com intervalo de 5 dias entre elas? (Evita estresse excessivo)</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
          <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.quadroVisual} onChange={e => handleChange('quadroVisual', e.target.checked)} />
          <span className="text-sm font-bold text-slate-700">Gerar quadro visual didático para o curral?</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex flex-col items-center gap-2 flex-1 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all ${step >= s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400'}`}>
              {s}
            </div>
            {s < 5 && (
              <div className={`absolute top-5 left-1/2 w-full h-1 -z-0 transition-all ${step > s ? 'bg-indigo-600' : 'bg-slate-100'}`}></div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}

        <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
          <button 
            type="button" 
            onClick={prevStep} 
            disabled={step === 1}
            className={`px-6 py-3 rounded-2xl font-black uppercase text-xs transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95'}`}
          >
            Voltar
          </button>
          
          {step < 5 ? (
            <button 
              type="button" 
              onClick={nextStep}
              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Próximo Passo
            </button>
          ) : (
            <button 
              type="submit"
              className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all"
            >
              Gerar Calendário
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default VacinacaoForm;
