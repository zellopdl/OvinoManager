
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sheep, DashboardStats, Breed, Group, Status } from '../types';
import { getHerdDailyInsights } from '../services/geminiService';
import { entityService } from '../services/entityService';

interface DashboardProps {
  sheep: Sheep[];
  breeds: Breed[];
  groups: Group[];
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

const Dashboard: React.FC<DashboardProps> = ({ sheep, breeds, groups }) => {
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  
  const [dbStats, setDbStats] = useState({
    piquetes: 0,
    fornecedores: 0,
    grupos: 0
  });

  const loadDbStats = useCallback(async () => {
    try {
      const [p, f, g] = await Promise.all([
        entityService.getAll('piquetes').catch(() => []),
        entityService.getAll('fornecedores').catch(() => []),
        entityService.getAll('grupos').catch(() => [])
      ]);
      setDbStats({
        piquetes: p.length,
        fornecedores: f.length,
        grupos: g.length
      });
    } catch (err) {
      console.error("Erro ao carregar estatísticas do DB", err);
    }
  }, []);

  const fetchInsights = useCallback(async (force = false) => {
    if (sheep.length === 0) {
      setAiInsights([]);
      return;
    }
    
    const today = new Date().toLocaleDateString();
    
    if (!force) {
      const cached = localStorage.getItem('ovi_daily_insights_multi');
      const cachedDate = localStorage.getItem('ovi_insights_date_multi');
      if (cached && cachedDate === today) {
        setAiInsights(JSON.parse(cached));
        return;
      }
    }

    setLoadingInsights(true);
    setError(null);

    try {
      const enrichedHerd = sheep.map(s => {
        const breedName = breeds.find(b => b.id === s.racaId)?.nome || 'Raça não informada';
        return {
          b: s.brinco,
          n: s.nome,
          r: breedName,
          p: s.peso,
          f: s.famacha,
          e: s.ecc,
          pr: s.prenha,
          i: s.nascimento,
          s: s.sexo 
        };
      });

      const data = await getHerdDailyInsights(enrichedHerd);
      setAiInsights(data || []);
      if (data && data.length > 0) {
        localStorage.setItem('ovi_daily_insights_multi', JSON.stringify(data));
        localStorage.setItem('ovi_insights_date_multi', today);
      }
    } catch (error) {
      console.error("Erro ao obter insights da IA:", error);
      setError("Radar de Manejo indisponível no momento.");
    } finally {
      setLoadingInsights(false);
    }
  }, [sheep, breeds]);

  useEffect(() => {
    fetchInsights();
    loadDbStats();
    
    // Aumentado para 300ms para garantir que o layout flex esteja estável
    const timer = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timer);
  }, [fetchInsights, loadDbStats]);

  const handleManualSync = () => {
    localStorage.removeItem('ovi_daily_insights_multi');
    localStorage.removeItem('ovi_insights_date_multi');
    fetchInsights(true);
  };

  const stats: DashboardStats = {
    total: sheep.length,
    // Fix: Removed redundant string comparison that caused type narrowing overlap error
    ativos: sheep.filter(s => s.status === Status.ATIVO).length,
    machos: sheep.filter(s => s.sexo === 'macho').length,
    femeas: sheep.filter(s => s.sexo === 'femea').length,
    mediaPeso: sheep.length > 0 ? sheep.reduce((acc, curr) => acc + curr.peso, 0) / sheep.length : 0,
  };

  // Cálculo de Ativos por Grupo para o Gráfico
  const activeByGroupData = useMemo(() => {
    // Fix: Removed redundant string comparison that caused type narrowing overlap error
    const activeSheep = sheep.filter(s => s.status === Status.ATIVO);
    const counts: Record<string, number> = {};
    
    activeSheep.forEach(s => {
      const groupName = groups.find(g => g.id === s.grupoId)?.nome || 'SEM LOTE';
      counts[groupName] = (counts[groupName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sheep, groups]);

  const safeGroupData = activeByGroupData.length > 0 ? activeByGroupData : [{ name: 'Nenhum Ativo', value: 0 }];
  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 min-w-0 w-full overflow-visible">
      
      {/* RADAR DA IA COMPACTO */}
      <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span className="bg-indigo-600 text-white p-1.5 rounded-lg text-sm">🌍</span> Radar de Manejo IA
            </h3>
            <p className="text-slate-400 font-medium text-[11px] mt-0.5">Cruzamento técnico internacional por linhagem, saúde e sexo.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">Clique para ampliar</span>
            <button 
              onClick={handleManualSync}
              disabled={loadingInsights}
              className={`text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all ${loadingInsights ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loadingInsights ? 'Sincronizando...' : '🔄 Sincronizar'}
            </button>
          </div>
        </div>

        {loadingInsights ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
             <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">Processando genética e biologia...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 bg-rose-50 rounded-xl border border-rose-100">
            <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">{error}</p>
          </div>
        ) : aiInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiInsights.map((insight, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedInsight(insight)}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md cursor-zoom-in group relative overflow-hidden ${
                  insight.prioridade === 'alta' ? 'bg-rose-50 border-rose-100 hover:border-rose-300' : 
                  insight.prioridade === 'media' ? 'bg-amber-50 border-amber-100 hover:border-amber-300' : 
                  'bg-emerald-50 border-emerald-100 hover:border-emerald-300'
                }`}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs">🔍</span>
                </div>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      insight.prioridade === 'alta' ? 'bg-rose-500 text-white' : 
                      insight.prioridade === 'media' ? 'bg-amber-500 text-white' : 
                      'bg-emerald-500 text-white'
                    }`}>
                      {insight.categoria}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 italic">via {insight.fonte}</span>
                  </div>
                  <h4 className="font-black text-slate-800 text-xs leading-tight mb-1 uppercase">{insight.titulo}</h4>
                  <p className="text-slate-600 text-[10px] font-medium leading-relaxed line-clamp-2">{insight.descricao}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-black/5 flex flex-wrap gap-1">
                  {insight.alvos.map(brinco => (
                    <span key={brinco} className="bg-white/80 px-1.5 py-0.5 rounded text-[8px] font-black text-slate-700 shadow-sm border border-black/5">#{brinco}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Aguardando dados para gerar novos insights...</p>
          </div>
        )}
      </section>

      {/* MODAL DE FUNDAMENTAÇÃO IA */}
      {selectedInsight && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            {/* Header do Modal */}
            <div className={`p-8 border-b border-slate-100 flex justify-between items-start ${
              selectedInsight.prioridade === 'alta' ? 'bg-rose-50/50' : 
              selectedInsight.prioridade === 'media' ? 'bg-amber-50/50' : 
              'bg-emerald-50/50'
            }`}>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    selectedInsight.prioridade === 'alta' ? 'bg-rose-500 text-white' : 
                    selectedInsight.prioridade === 'media' ? 'bg-amber-500 text-white' : 
                    'bg-emerald-500 text-white'
                  }`}>
                    Prioridade {selectedInsight.prioridade}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoria: {selectedInsight.categoria}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">{selectedInsight.titulo}</h2>
              </div>
              <button 
                onClick={() => setSelectedInsight(null)}
                className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
              {/* Resumo Rápido */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Resumo Executivo
                </h3>
                <p className="text-slate-700 font-bold text-sm leading-relaxed italic">
                  "{selectedInsight.descricao}"
                </p>
              </div>

              {/* Fundamentação Técnica */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Parecer Técnico & Fundamentação
                </h3>
                <div className="prose prose-slate max-w-none">
                  <div className="text-slate-700 text-sm leading-[1.8] font-medium whitespace-pre-wrap">
                    {selectedInsight.fundamentacao}
                  </div>
                </div>
              </div>

              {/* Animais Alvos */}
              <div className="space-y-3 pt-4 border-t border-slate-50">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Animais que requerem atenção:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedInsight.alvos.map(brinco => {
                    const sheepName = sheep.find(s => s.brinco === brinco)?.nome;
                    return (
                      <div key={brinco} className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center min-w-[100px]">
                        <span className="text-[10px] font-black text-slate-800 uppercase">{sheepName || 'Animal'}</span>
                        <span className="text-[9px] font-bold text-indigo-600">#{brinco}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Fonte Consultada: {selectedInsight.fonte}</span>
              <button 
                onClick={() => setSelectedInsight(null)}
                className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
              >
                Concluir Leitura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid Compacto */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Rebanho Total', value: stats.total, icon: '🐑', color: 'text-slate-900' },
          { label: 'Ativos', value: stats.ativos, icon: '✅', color: 'text-emerald-600' },
          { label: 'Peso Médio', value: `${stats.mediaPeso.toFixed(1)}kg`, icon: '⚖️', color: 'text-blue-600' },
          { label: 'Proporção M/F', value: `${stats.machos}/${stats.femeas}`, icon: '🧬', color: 'text-purple-600' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
            <div className="flex items-baseline justify-between">
              <h3 className={`text-xl font-black ${item.color}`}>{item.value}</h3>
              <span className="text-sm">{item.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 min-h-[300px] flex flex-col min-w-0">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Status do Rebanho (Ativos por Lote)</h4>
            <div className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">
              Total: {stats.total}
            </div>
          </div>
          <div className="w-full flex-1 min-h-[250px] relative min-w-0">
            {isReady && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={safeGroupData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ borderRadius: '12px', fontSize: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                    {safeGroupData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-[300px] overflow-y-auto custom-scrollbar min-w-0">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Diversidade Genética</h4>
          <div className="space-y-3">
            {breeds.length > 0 ? breeds.map(breed => {
              const count = sheep.filter(s => s.racaId === breed.id && s.status === 'ativo').length;
              if (count === 0) return null;
              const percent = (count / (stats.ativos || 1)) * 100;
              return (
                <div key={breed.id}>
                  <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                    <span className="text-slate-600">{breed.nome}</span>
                    <span className="text-indigo-600">{count}un</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            }) : (
              <p className="text-center text-[10px] text-slate-400 font-bold uppercase mt-10">Nenhuma raça cadastrada</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-800 h-[300px] text-white min-w-0">
          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">SISTEMA: Base de Dados</h4>
          <div className="space-y-4">
            {[
              { label: 'Raças Cadastradas', value: breeds.length, icon: '🏷️' },
              { label: 'Piquetes Mapeados', value: dbStats.piquetes, icon: '🌾' },
              { label: 'Fornecedores / Origens', value: dbStats.fornecedores, icon: '🚚' },
              { label: 'Grupos / Lotes', value: dbStats.grupos, icon: '👥' }
            ].map((db, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{db.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{db.label}</span>
                </div>
                <span className="text-md font-black text-white">{db.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
             <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest text-center">Banco de Dados Sincronizado</p>
          </div>
        </div>
      </div>
      <style>{`
        .cursor-zoom-in { cursor: zoom-in; }
      `}</style>
    </div>
  );
};

export default Dashboard;
