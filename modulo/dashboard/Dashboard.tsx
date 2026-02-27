
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sheep, Breed, Group, Status, BreedingPlan, Paddock, RadarAnalise } from '../../types';
import { getHerdDailyInsights } from './geminiService';
import { entityService } from '../cadastros/entityService';
import { radarService } from '../analises/radarService';

interface DashboardProps {
  sheep: Sheep[];
  breeds: Breed[];
  groups: Group[];
  paddocks?: Paddock[];
  plans?: BreedingPlan[];
  onRefresh?: () => void;
}

interface AIInsight {
  prioridade: 'alta' | 'media' | 'baixa';
  raca: string;
  categoria: string;
  titulo: string;
  descricao: string;
  fundamentacao: string;
  alvos: string[];
  fonte: string;
}

const Dashboard: React.FC<DashboardProps> = ({ sheep, breeds, groups, paddocks = [], plans = [], onRefresh }) => {
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<RadarAnalise[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [selectedSaved, setSelectedSaved] = useState<RadarAnalise | null>(null);

  const loadBank = useCallback(async () => {
    setLoadingBank(true);
    try {
      const data = await radarService.getAll();
      setSavedAnalyses(data);
    } catch (e) {
      console.error("Erro ao carregar banco de análises:", e);
    } finally {
      setLoadingBank(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    if (sheep.length === 0) return;
    setLoadingInsights(true);
    
    // CAMADA DE TRADUÇÃO HUMANA: Resolvemos todos os IDs antes de mandar para a IA
    const enrichedHerd = sheep.map(s => {
      const breedObj = breeds.find(b => b.id === s.racaId);
      const groupObj = groups.find(g => g.id === s.grupoId);
      const paddockObj = paddocks.find(p => p.id === s.piqueteId);
      
      return {
        brinco: s.brinco,
        nome_ovelha: s.nome,
        raca: breedObj?.nome || 'Não definida',
        nome_grupo: groupObj?.nome || 'Sem Lote',
        nome_piquete: paddockObj?.piquete || 'Área não identificada',
        peso_kg: s.peso,
        famacha: s.famacha,
        ecc: s.ecc,
        sexo: s.sexo,
        estado_gestacional: s.prenha ? 'Confirmada Prenha' : 'Vazia/Apta',
        data_nascimento: s.nascimento
      };
    });

    try {
      const data = await getHerdDailyInsights(enrichedHerd);
      setAiInsights(data || []);
    } catch (e) { 
      console.error("Erro ao processar insights:", e); 
    } finally { 
      setLoadingInsights(false); 
    }
  }, [sheep, breeds, groups, paddocks]);

  useEffect(() => { 
    fetchInsights(); 
    loadBank();
  }, [fetchInsights, loadBank]);

  const handleSaveToBank = async (insight: AIInsight) => {
    try {
      await radarService.save({
        titulo: insight.titulo,
        descricao: insight.descricao,
        fundamentacao: insight.fundamentacao,
        prioridade: insight.prioridade,
        categoria: insight.categoria,
        alvos: insight.alvos,
        fonte: insight.fonte
      });
      setSelectedInsight(null);
      await loadBank();
      alert("Análise salva no banco estratégico!");
    } catch (e) {
      alert("Erro ao salvar análise.");
    }
  };

  const handleDeleteSaved = async (id: string) => {
    if (!confirm("Deseja remover esta análise do banco?")) return;
    try {
      await radarService.delete(id);
      setSelectedSaved(null);
      await loadBank();
    } catch (e) {
      alert("Erro ao excluir análise.");
    }
  };

  const stats = useMemo(() => ({
    total: sheep.length,
    ativos: sheep.filter(s => s.status === Status.ATIVO).length,
    machos: sheep.filter(s => s.sexo === 'macho').length,
    femeas: sheep.filter(s => s.sexo === 'femea').length,
    mediaPeso: sheep.length > 0 ? sheep.reduce((acc, curr) => acc + curr.peso, 0) / sheep.length : 0,
  }), [sheep]);

  // Alertas Reprodutivos (Lógica de 17 dias)
  const breedingAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return plans.filter(p => p.status !== 'concluido').map(plan => {
      const start = new Date(plan.dataInicioMonta);
      start.setHours(0,0,0,0);
      const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      const cycleIntervals = [
        { start: 0, end: 3, label: '1ª Monta (Início)' },
        { start: 17, end: 20, label: '2ª Monta (Retorno)' },
        { start: 34, end: 37, label: '3ª Monta (Repasse)' }
      ];

      const activeCycleIdx = cycleIntervals.findIndex(c => diffDays >= c.start && diffDays < c.end);
      const isMachoDentro = activeCycleIdx !== -1;
      const nextCycle = cycleIntervals.find(c => c.start > diffDays);
      
      return {
        id: plan.id,
        nome: plan.nome,
        status: isMachoDentro ? 'macho_dentro' : 'macho_fora',
        countdown: isMachoDentro ? cycleIntervals[activeCycleIdx].end - diffDays : (nextCycle ? nextCycle.start - diffDays : 0),
        message: isMachoDentro ? `Reprodutor no lote para cobertura (${cycleIntervals[activeCycleIdx].label}).` : (nextCycle ? `Intervalo de descanso. Aguardando retorno de cio.` : `Estação encerrada no calendário.`),
        diffDays
      };
    });
  }, [plans]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* MONITORAMENTO REPRODUTIVO */}
      {breedingAlerts.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Monitoramento Biológico de Lotes</h3>
          <div className="grid grid-cols-1 gap-4">
            {breedingAlerts.map(alert => (
              <div key={alert.id} className="bg-white rounded-[32px] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col md:flex-row">
                <div className={`md:w-64 p-8 flex flex-col items-center justify-center text-center gap-2 transition-colors ${alert.status === 'macho_dentro' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
                  <span className="text-4xl">{alert.status === 'macho_dentro' ? '🐏' : '⏳'}</span>
                  <p className="text-[10px] font-black uppercase opacity-80">Reprodutor:</p>
                  <p className="text-xl font-black uppercase">{alert.status === 'macho_dentro' ? 'NO LOTE' : 'EM DESCANSO'}</p>
                </div>
                <div className="flex-1 p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-black uppercase text-slate-800">{alert.nome}</h4>
                      <p className="text-[11px] font-bold text-slate-400 italic">Iniciado há {alert.diffDays} dias</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-700 uppercase leading-relaxed">{alert.message}</p>
                    <div className="text-center bg-white px-6 py-4 rounded-2xl border shadow-sm">
                       <p className="text-3xl font-black text-slate-800">{alert.countdown}</p>
                       <p className="text-[8px] font-black text-slate-400 uppercase">Dias</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RADAR IA */}
      <section className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6 px-2">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <span className="bg-indigo-600 text-white p-2 rounded-xl text-sm">🌍</span> Radar de Manejo IA
            </h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">Análise nominal e estratégica do rebanho</p>
          </div>
          <button onClick={fetchInsights} disabled={loadingInsights} className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all">
            {loadingInsights ? 'Sincronizando...' : '🔄 Atualizar'}
          </button>
        </div>

        {loadingInsights ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black text-[10px] uppercase animate-pulse">Cruzando dados de linhagem...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiInsights.map((insight, idx) => (
              <div key={idx} onClick={() => setSelectedInsight(insight)} className={`p-5 rounded-[28px] border-2 cursor-pointer hover:shadow-xl transition-all group ${
                insight.prioridade === 'alta' ? 'bg-rose-50 border-rose-100' : insight.prioridade === 'media' ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
              }`}>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase text-white mb-3 inline-block ${
                  insight.prioridade === 'alta' ? 'bg-rose-500' : insight.prioridade === 'media' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>{insight.categoria}</span>
                <h4 className="font-black text-slate-800 text-xs uppercase mb-2 group-hover:text-indigo-600 leading-tight">{insight.titulo}</h4>
                <p className="text-slate-500 text-[10px] font-medium line-clamp-2 italic">{insight.descricao}</p>
                <div className="mt-3 flex justify-between items-center">
                   <div className="flex flex-wrap gap-1">
                      {insight.alvos?.slice(0,2).map(a => <span key={a} className="bg-white/60 px-2 py-0.5 rounded text-[7px] font-black text-slate-600 border border-black/5 uppercase">{a}</span>)}
                   </div>
                   <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalhes →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BANCO DE ANÁLISES ESTRATÉGICAS */}
      <section className="bg-slate-900 p-8 rounded-[48px] border border-slate-800 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
              <span className="bg-emerald-500 text-white p-2 rounded-xl text-sm">📁</span> Banco de Análises Estratégicas
            </h3>
            <p className="text-slate-500 font-bold text-[10px] uppercase mt-1">Histórico de decisões e melhorias do rebanho</p>
          </div>
          <span className="bg-slate-800 text-slate-400 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
            {savedAnalyses.length} Registros
          </span>
        </div>

        {loadingBank ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : savedAnalyses.length === 0 ? (
          <div className="py-16 text-center bg-slate-950/30 rounded-[32px] border border-slate-800 border-dashed">
            <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Nenhuma análise salva no banco estratégico</p>
            <p className="text-slate-700 text-[10px] mt-2">Salve insights do Radar IA para gerenciar melhorias</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedAnalyses.map(analise => (
              <div 
                key={analise.id} 
                onClick={() => setSelectedSaved(analise)}
                className="p-6 bg-slate-950/50 border border-slate-800 rounded-[32px] hover:border-emerald-500/50 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                    analise.prioridade === 'alta' ? 'bg-rose-500/20 text-rose-500' : analise.prioridade === 'media' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>{analise.categoria}</span>
                  <span className="text-[8px] font-black text-slate-600 uppercase">{new Date(analise.created_at!).toLocaleDateString('pt-BR')}</span>
                </div>
                <h4 className="font-black text-slate-200 text-xs uppercase mb-2 leading-tight group-hover:text-emerald-400">{analise.titulo}</h4>
                <p className="text-slate-500 text-[10px] font-medium line-clamp-2 italic mb-4">{analise.descricao}</p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-1">
                    {analise.alvos?.slice(0,2).map(a => <span key={a} className="bg-slate-900 px-2 py-0.5 rounded text-[7px] font-black text-slate-500 border border-slate-800 uppercase">{a}</span>)}
                  </div>
                  <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all">👁️</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* STATS RÁPIDOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {l:'Ativos', v:stats.ativos, i:'✅', c:'text-emerald-600', bg:'bg-emerald-50'},
          {l:'Peso Médio', v:`${stats.mediaPeso.toFixed(1)}kg`, i:'⚖️', c:'text-blue-600', bg:'bg-blue-50'},
          {l:'Machos', v:stats.machos, i:'🧬', c:'text-indigo-600', bg:'bg-indigo-50'},
          {l:'Fêmeas', v:stats.femeas, i:'🎀', c:'text-pink-600', bg:'bg-pink-50'}
        ].map(s => (
          <div key={s.l} className={`p-5 rounded-3xl border shadow-sm ${s.bg} border-white/50`}>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{s.l}</p>
            <div className="flex justify-between items-end">
              <h3 className="text-2xl font-black text-slate-800">{s.v}</h3>
              <span className="text-xl opacity-30">{s.i}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* MODAL INSIGHT (TEMPORÁRIO) */}
      {selectedInsight && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className={`p-8 border-b ${selectedInsight.prioridade === 'alta' ? 'bg-rose-50' : 'bg-indigo-50'} flex justify-between items-start`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{selectedInsight.categoria} • PRIORIDADE {selectedInsight.prioridade}</span>
                <h2 className="text-2xl font-black uppercase text-slate-800 leading-tight">{selectedInsight.titulo}</h2>
              </div>
              <button onClick={() => setSelectedInsight(null)} className="w-12 h-12 bg-white border rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">✕</button>
            </div>
            <div className="p-8 max-h-[50vh] overflow-y-auto custom-scrollbar text-slate-700 leading-relaxed text-sm whitespace-pre-wrap font-medium">
              {selectedInsight.fundamentacao}
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              <button onClick={() => handleSaveToBank(selectedInsight)} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-100 flex items-center gap-2">
                <span>📁</span> Salvar no Banco Estratégico
              </button>
              <button onClick={() => setSelectedInsight(null)} className="px-8 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-xs">Descartar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANÁLISE SALVA (BANCO) */}
      {selectedSaved && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden border border-slate-800 animate-in zoom-in-95 duration-300">
            <div className={`p-10 border-b border-slate-800 ${selectedSaved.prioridade === 'alta' ? 'bg-rose-900/10' : 'bg-emerald-900/10'} flex justify-between items-start`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">{selectedSaved.categoria} • SALVO EM {new Date(selectedSaved.created_at!).toLocaleDateString('pt-BR')}</span>
                <h2 className="text-3xl font-black uppercase text-white leading-tight">{selectedSaved.titulo}</h2>
              </div>
              <button onClick={() => setSelectedSaved(null)} className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white shadow-sm transition-all">✕</button>
            </div>
            <div className="p-10 max-h-[50vh] overflow-y-auto custom-scrollbar text-slate-300 leading-relaxed text-base whitespace-pre-wrap font-medium">
              {selectedSaved.fundamentacao}
              
              <div className="mt-8 pt-8 border-t border-slate-800">
                <h4 className="text-[10px] font-black text-slate-500 uppercase mb-4">Animais Alvos da Estratégia</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSaved.alvos?.map(a => (
                    <span key={a} className="bg-slate-800 px-4 py-2 rounded-xl text-xs font-black text-slate-300 border border-slate-700 uppercase">{a}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <button 
                onClick={() => handleDeleteSaved(selectedSaved.id)} 
                className="px-10 py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-xs shadow-2xl shadow-emerald-900/20 flex items-center gap-3 active:scale-95 transition-all"
              >
                <span>✅</span> Implementado / Resolver
              </button>
              <button onClick={() => setSelectedSaved(null)} className="px-10 py-5 bg-slate-800 text-slate-400 rounded-[24px] font-black uppercase text-xs">Manter no Banco</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
