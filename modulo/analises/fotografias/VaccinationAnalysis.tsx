
import React, { useState, useMemo, useEffect } from 'react';
import { Sheep, Group, BreedingPlan } from '../../../types';
import { vacinacaoService } from '../../vacinacao/vacinacaoService';
import { VacinacaoConfig } from '../../vacinacao/VacinacaoManager';
import { motion, AnimatePresence } from 'framer-motion';

interface VaccinationAnalysisProps {
  sheep: Sheep[];
  groups: Group[];
  plans: BreedingPlan[];
}

interface AnimalVaccinationStatus {
  animal: Sheep;
  takenCount: number;
  totalExpected: number;
  vaccines: {
    name: string;
    date: string;
    status: 'taken' | 'missed' | 'pending';
    type: string;
  }[];
}

const VaccinationAnalysis: React.FC<VaccinationAnalysisProps> = ({ sheep, groups, plans }) => {
  const [config, setConfig] = useState<VacinacaoConfig | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [conf, hist] = await Promise.all([
          vacinacaoService.getConfig(),
          vacinacaoService.getConfirmedVaccinations()
        ]);
        setConfig(conf);
        setHistory(hist);
      } catch (err) {
        console.error("Erro ao carregar dados de vacinação:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const analysis = useMemo(() => {
    if (!config) return [];

    const addDays = (dateStr: string, days: number) => {
      const d = new Date(dateStr + 'T12:00:00Z');
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const today = new Date().toISOString().split('T')[0];

    return sheep.map(s => {
      const expected: { name: string, date: string, type: string }[] = [];

      // 1. Cordeiro
      if (s.nascimento) {
        expected.push({ date: addDays(s.nascimento, 40), type: 'cordeiro', name: `Clostridiose (${config.tipoClostridiose} cepas)` });
        expected.push({ date: addDays(s.nascimento, 70), type: 'cordeiro', name: `Clostridiose (${config.tipoClostridiose} cepas)` });
        if (config.hasEctima) {
          expected.push({ date: addDays(s.nascimento, 15), type: 'cordeiro', name: 'Ectima' });
        }
      }

      // 2. Quarentena
      const quarentenaGroup = groups.find(g => g.nome.toLowerCase().includes('quarentena'));
      if (quarentenaGroup && s.grupoId === quarentenaGroup.id) {
        const d0 = s.createdAt ? s.createdAt.split('T')[0] : today;
        expected.push({ date: d0, type: 'quarentena', name: 'Vermífugo + Clostridiose' });
        expected.push({ date: addDays(d0, 30), type: 'quarentena', name: 'Reforço Clostridiose' });
      }

      // 3. Planos de Monta
      plans.forEach(p => {
        const planSheepIds = p.ovelhas?.map(o => o.eweId) || [];
        if (planSheepIds.includes(s.id) && p.dataInicioMonta) {
          expected.push({ date: addDays(p.dataInicioMonta, -15), type: 'pre-monta', name: `Clostridiose + Reprodutivas` });
          
          const isPrenha = p.ovelhas?.find(o => o.eweId === s.id && (o.ciclo1 === 'prenha' || o.ciclo2 === 'prenha' || o.ciclo3 === 'prenha'));
          if (isPrenha) {
            expected.push({ date: addDays(p.dataInicioMonta, 115), type: 'prenha', name: `Clostridiose (${config.tipoClostridiose} cepas)` });
          }
        }
      });

      // Map to status
      const vaccines = expected.map(e => {
        const isConfirmed = history.includes(`${e.date}_${e.name}_${e.type}`);
        let status: 'taken' | 'missed' | 'pending' = 'pending';
        
        if (isConfirmed) status = 'taken';
        else if (e.date < today) status = 'missed';

        return { ...e, status };
      });

      return {
        animal: s,
        takenCount: vaccines.filter(v => v.status === 'taken').length,
        totalExpected: vaccines.filter(v => v.status !== 'pending').length,
        vaccines
      };
    });
  }, [sheep, groups, plans, config, history]);

  const filteredAnalysis = useMemo(() => {
    return analysis.filter(a => {
      const matchesSearch = a.animal.brinco.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           a.animal.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup = selectedGroup === 'all' || a.animal.grupoId === selectedGroup;
      return matchesSearch && matchesGroup;
    }).sort((a, b) => b.takenCount - a.takenCount);
  }, [analysis, searchTerm, selectedGroup]);

  const formatAge = (nascimento?: string) => {
    if (!nascimento) return 'N/A';
    const birth = new Date(nascimento);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays}d`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}m`;
    return `${(diffDays / 365).toFixed(1)}a`;
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando dados de vacinação...</div>;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 px-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Buscar por brinco ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          <option value="all">Todos os Grupos</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.nome}</option>
          ))}
        </select>
      </div>

      {/* Grid de Animais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-2">
        <AnimatePresence mode="popLayout">
          {filteredAnalysis.map((item) => (
            <motion.div
              layout
              key={item.animal.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group relative overflow-hidden"
            >
              {/* Badge de Progresso */}
              <div className="absolute top-2 right-2 flex flex-col items-end">
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                  item.takenCount === item.totalExpected && item.totalExpected > 0 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : item.takenCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {item.takenCount}/{item.totalExpected}
                </span>
              </div>

              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                {item.animal.sexo === 'macho' ? '🐏' : '🐑'}
              </div>
              
              <h4 className="text-xs font-black text-slate-800 uppercase truncate w-full">#{item.animal.brinco}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase truncate w-full mb-1">{item.animal.nome}</p>
              <span className="text-[10px] font-black text-slate-500 uppercase leading-none">{formatAge(item.animal.nascimento)}</span>

              {/* Lista de Vacinas (Mini) */}
              <div className="mt-4 w-full space-y-1">
                {item.vaccines.length === 0 ? (
                  <span className="text-[8px] text-slate-300 uppercase font-bold">Sem histórico</span>
                ) : (
                  item.vaccines.slice(0, 3).map((v, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        v.status === 'taken' ? 'bg-emerald-500' : v.status === 'missed' ? 'bg-rose-500' : 'bg-slate-300'
                      }`} />
                      <span className="text-[8px] font-bold text-slate-500 truncate uppercase">{v.name}</span>
                    </div>
                  ))
                )}
                {item.vaccines.length > 3 && (
                  <span className="text-[8px] text-slate-400 font-black uppercase">+{item.vaccines.length - 3} mais</span>
                )}
              </div>

              {/* Hover Overlay com Detalhes */}
              <div className="absolute inset-0 bg-slate-900/95 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col p-4 text-left overflow-y-auto scrollbar-hide">
                <h5 className="text-[10px] font-black text-white uppercase mb-3 border-b border-white/10 pb-2">Histórico Completo</h5>
                <div className="space-y-2">
                  {item.vaccines.map((v, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-white/70 uppercase truncate mr-2">{v.name}</span>
                        <span className={`text-[7px] font-black px-1 rounded uppercase ${
                          v.status === 'taken' ? 'bg-emerald-500 text-white' : v.status === 'missed' ? 'bg-rose-500 text-white' : 'bg-slate-600 text-slate-300'
                        }`}>
                          {v.status === 'taken' ? 'OK' : v.status === 'missed' ? 'FALTA' : 'PEND'}
                        </span>
                      </div>
                      <span className="text-[7px] font-bold text-white/40">{v.date.split('-').reverse().join('/')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase">Aplicada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase">Atrasada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-300"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase">Agendada</span>
        </div>
        <div className="ml-auto">
          <span className="text-[9px] font-black text-slate-400 uppercase italic">Baseado no Calendário Sanitário Ativo</span>
        </div>
      </div>
    </div>
  );
};

export default VaccinationAnalysis;
