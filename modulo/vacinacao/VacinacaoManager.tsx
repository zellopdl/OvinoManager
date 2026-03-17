import React, { useState, useEffect } from 'react';
import VacinacaoForm from './VacinacaoForm';
import VacinacaoBoard from './VacinacaoBoard';
import VacinacaoCalendar from './VacinacaoCalendar';
import { vacinacaoService } from './vacinacaoService';
import { Sheep, Group, BreedingPlan, Paddock } from '../../types';

export interface VacinacaoConfig {
  // 1. Localização / Epidemiologia
  hasRaiva: boolean;
  hasLeptospirose: boolean;
  hasPasteurelose: boolean;
  hasLinfadenite: boolean;
  hasEctima: boolean;
  protocoloOficial: string;
  
  // 2. Vacinas Disponíveis
  tipoClostridiose: '5' | '7' | '8' | 'nenhuma';
  vacinaRaivaDisp: boolean;
  vacinaLeptoDisp: boolean;
  vacinaPasteureloseDisp: boolean;
  outrasVacinas: string;

  // 3. Histórico Vacinal
  temHistorico: boolean;
  historicoDetalhes: string;

  // 4. Situação Reprodutiva
  estacaoMonta: boolean;
  prenhezMultipla: boolean;
  reforcoGestacao: boolean;

  // 5. Manejo / Organização
  mesAnual: number; // 1-12
  intervalo5Dias: boolean;
  quadroVisual: boolean;
  agruparMensal: boolean;
  diaBaseSemana: number; // 0-6
  diaBaseOrdem: number; // 1-4
  intervaloEntreVacinas: number;
}

interface Props {
  sheep: Sheep[];
  groups: Group[];
  plans: BreedingPlan[];
  paddocks: Paddock[];
}

const VacinacaoManager: React.FC<Props> = ({ sheep, groups, plans, paddocks }) => {
  const [config, setConfig] = useState<VacinacaoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await vacinacaoService.getConfig();
        if (savedConfig) {
          setConfig(savedConfig);
        }
      } catch (err) {
        console.error("Erro ao carregar config:", err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleConfigSubmit = async (newConfig: VacinacaoConfig) => {
    console.log("Submetendo nova configuração:", newConfig);
    setSaving(true);
    setError(null);
    try {
      await vacinacaoService.saveConfig(newConfig);
      console.log("Configuração salva com sucesso!");
      setConfig(newConfig);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar o calendário:", err);
      setError("Não foi possível salvar as configurações. Verifique sua conexão ou tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const executeReset = async () => {
    setShowConfirmReset(false);
    try {
      await vacinacaoService.deleteConfig();
      setConfig(null);
    } catch (err: any) {
      console.error("Erro no executeReset:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40 animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Protocolo de Vacinação</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
            {config ? 'Calendário Estratégico Gerado' : 'Montagem do Calendário Estratégico'}
          </p>
        </div>
        {config && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setViewMode('board')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black uppercase text-[10px] sm:text-[11px] transition-all whitespace-nowrap ${viewMode === 'board' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Regras
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black uppercase text-[10px] sm:text-[11px] transition-all whitespace-nowrap ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Calendário
              </button>
            </div>
            <button 
              onClick={() => setShowConfirmReset(true)} 
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] sm:text-[11px] active:scale-95 transition-all whitespace-nowrap hover:bg-slate-200"
            >
              Refazer Formulário
            </button>
          </div>
        )}
      </div>

      {showConfirmReset && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-2">Refazer Calendário?</h3>
            <p className="text-slate-600 mb-8">
              Tem certeza que deseja montar um novo calendário? O atual será perdido e você precisará responder o formulário novamente.
            </p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setShowConfirmReset(false)}
                className="px-6 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={executeReset}
                className="px-6 py-3 rounded-2xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all"
              >
                Sim, Refazer
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-emerald-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
          ✅ Calendário gerado com sucesso!
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
          ⚠️ {error}
        </div>
      )}

      {!config ? (
        <div className={saving ? 'opacity-50 pointer-events-none' : ''}>
          <VacinacaoForm onSubmit={handleConfigSubmit} />
          {saving && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
              <div className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Salvando Calendário...</p>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'board' ? (
        <VacinacaoBoard config={config} sheep={sheep} groups={groups} />
      ) : (
        <VacinacaoCalendar sheep={sheep} groups={groups} plans={plans} paddocks={paddocks} config={config} />
      )}
    </div>
  );
};

export default VacinacaoManager;
