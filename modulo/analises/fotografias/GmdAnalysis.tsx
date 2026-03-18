
import React, { useMemo, useState } from 'react';
import { Sheep, Sexo, Status, Group } from '../../../types';
import { motion, AnimatePresence } from 'motion/react';

interface GmdAnalysisProps {
  sheep: Sheep[];
  groups: Group[];
}

type GmdCategory = 'Alerta' | 'Manutenção' | 'Baixo' | 'Médio' | 'Alto';

interface AnimalGmd {
  id: string;
  brinco: string;
  nome: string;
  nascimento: string;
  gmd: number; // em gramas/dia
  categoria: GmdCategory;
  pesoAtual: number;
  pesoAnterior: number;
  dataAtual: string;
  dataAnterior: string;
  dias: number;
}

const GmdAnalysis: React.FC<GmdAnalysisProps> = ({ sheep, groups: groupsList }) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('Recria');

  const formatAge = (nascimento: string) => {
    if (!nascimento) return 'N/D';
    const birth = new Date(nascimento);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    if (years > 0) return `${years}a ${months}m`;
    if (months > 0) return `${months}m ${days}d`;
    return `${days}d`;
  };

  const calculateGmd = (s: Sheep): AnimalGmd | null => {
    if (!s.historicoPeso || s.historicoPeso.length < 2) return null;

    const sortedHistory = [...s.historicoPeso].sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    const atual = sortedHistory[0];
    const anterior = sortedHistory[1];

    const dAtual = new Date(atual.data);
    const dAnterior = new Date(anterior.data);
    const diffTime = dAtual.getTime() - dAnterior.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return null;

    const gmdKg = (atual.peso - anterior.peso) / diffDays;
    const gmdGrams = gmdKg * 1000;

    let categoria: GmdCategory = 'Baixo';
    if (gmdGrams < 0) categoria = 'Alerta';
    else if (gmdGrams === 0) categoria = 'Manutenção';
    else if (gmdGrams < 100) categoria = 'Baixo';
    else if (gmdGrams <= 200) categoria = 'Médio';
    else categoria = 'Alto';

    return {
      id: s.id,
      brinco: s.brinco,
      nome: s.nome,
      nascimento: s.nascimento,
      gmd: gmdGrams,
      categoria,
      pesoAtual: atual.peso,
      pesoAnterior: anterior.peso,
      dataAtual: atual.data,
      dataAnterior: anterior.data,
      dias: diffDays
    };
  };

  const now = new Date();
  const getAgeDays = (nascimento: string) => {
    if (!nascimento) return 9999;
    const birth = new Date(nascimento);
    if (isNaN(birth.getTime())) return 9999;
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  };

  const groups = useMemo(() => {
    const activeSheep = sheep.filter(s => s.status === Status.ATIVO);
    
    // Identificar ID do grupo Quarentena
    const quarentenaGroupId = groupsList.find(g => g.nome.toLowerCase() === 'quarentena')?.id;

    const categories = {
      'Quarentena': activeSheep.filter(s => s.grupoId === quarentenaGroupId),
      'Recém-nascidos': activeSheep.filter(s => getAgeDays(s.nascimento) < 90 && s.grupoId !== quarentenaGroupId),
      'Recria': activeSheep.filter(s => {
        const age = getAgeDays(s.nascimento);
        return age >= 90 && age < 365 && s.grupoId !== quarentenaGroupId;
      }),
      'Reprodutores': activeSheep.filter(s => s.sexo === Sexo.MACHO && getAgeDays(s.nascimento) >= 365 && s.grupoId !== quarentenaGroupId),
      'Prenhas': activeSheep.filter(s => s.sexo === Sexo.FEMEA && getAgeDays(s.nascimento) >= 365 && s.prenha && s.grupoId !== quarentenaGroupId),
      'Vazias': activeSheep.filter(s => s.sexo === Sexo.FEMEA && getAgeDays(s.nascimento) >= 365 && !s.prenha && s.grupoId !== quarentenaGroupId),
    };

    return Object.entries(categories).map(([name, list]) => {
      const gmds = list.map(calculateGmd).filter((g): g is AnimalGmd => g !== null);
      const avgGmd = gmds.length > 0 ? gmds.reduce((acc, curr) => acc + curr.gmd, 0) / gmds.length : 0;
      
      return {
        name,
        count: list.length,
        avgGmd,
        animals: gmds.sort((a, b) => a.gmd - b.gmd)
      };
    });
  }, [sheep]);

  const activeGroup = groups.find(g => g.name === selectedGroup);

  const categorizedAnimals = useMemo(() => {
    if (!activeGroup) return {};
    return {
      'Alerta': activeGroup.animals.filter(a => a.categoria === 'Alerta'),
      'Manutenção': activeGroup.animals.filter(a => a.categoria === 'Manutenção'),
      'Baixo': activeGroup.animals.filter(a => a.categoria === 'Baixo'),
      'Médio': activeGroup.animals.filter(a => a.categoria === 'Médio'),
      'Alto': activeGroup.animals.filter(a => a.categoria === 'Alto'),
    };
  }, [activeGroup]);

  const categoryStyles: Record<GmdCategory, string> = {
    'Alerta': 'bg-rose-50 border-rose-200 text-rose-700',
    'Manutenção': 'bg-slate-50 border-slate-200 text-slate-700',
    'Baixo': 'bg-amber-50 border-amber-200 text-amber-700',
    'Médio': 'bg-emerald-50 border-emerald-200 text-emerald-700',
    'Alto': 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };

  const categoryIcons: Record<GmdCategory, string> = {
    'Alerta': '⚠️',
    'Manutenção': '⚖️',
    'Baixo': '📉',
    'Médio': '📈',
    'Alto': '🚀',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <button
              key={g.name}
              onClick={() => setSelectedGroup(g.name)}
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${
                selectedGroup === g.name 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </header>

      {activeGroup && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl">📊</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Desempenho Médio</p>
              <h3 className="text-3xl font-black text-slate-800 uppercase mb-1">{activeGroup.name}</h3>
              <p className="text-xs font-bold text-slate-400 italic mb-6">{activeGroup.count} Animais no total</p>
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">GMD Médio do Grupo</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black ${activeGroup.avgGmd > 0 ? 'text-emerald-600' : activeGroup.avgGmd < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {activeGroup.avgGmd.toFixed(0)}
                  </span>
                  <span className="text-sm font-black text-slate-400 uppercase">g/dia</span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {Object.entries(categorizedAnimals).map(([cat, list]) => (
                  <div key={cat} className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-slate-400">{cat}</span>
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600">{list.length}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -bottom-4 -right-4 opacity-20 text-8xl">💡</div>
              <h4 className="text-sm font-black uppercase mb-4">Insight Estratégico</h4>
              <p className="text-xs font-medium leading-relaxed opacity-80 italic">
                {activeGroup.avgGmd > 200 
                  ? "Excelente desempenho! O manejo nutricional deste grupo está otimizado." 
                  : activeGroup.avgGmd > 100 
                  ? "Bom desempenho. Considere ajustes pontuais para atingir a meta de 200g/dia." 
                  : "Atenção necessária. O ganho de peso está abaixo do potencial genético esperado."}
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedGroup}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {(Object.entries(categorizedAnimals) as [GmdCategory, AnimalGmd[]][]).map(([cat, list]) => (
                  <div key={cat} className={`p-6 rounded-[32px] border-2 ${categoryStyles[cat]} shadow-sm flex flex-col`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{categoryIcons[cat]}</span>
                        <h4 className="font-black uppercase text-xs tracking-wider">{cat}</h4>
                      </div>
                      <span className="bg-white/50 px-3 py-1 rounded-full text-[10px] font-black">{list.length}</span>
                    </div>

                    {list.length === 0 ? (
                      <p className="text-[10px] font-bold opacity-40 italic py-4">Nenhum animal nesta categoria</p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {list.map(a => (
                          <div key={a.id} className="bg-white/40 p-3 rounded-2xl border border-white/50 flex justify-between items-center group hover:bg-white/60 transition-all">
                            <div className="flex items-center gap-3">
                               <div className="flex flex-col items-center">
                                 <div className="w-8 h-8 bg-white/50 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-800">
                                   #{a.brinco}
                                 </div>
                                 <span className="text-[10px] font-black text-slate-500 mt-1 uppercase leading-none">{formatAge(a.nascimento)}</span>
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{a.nome}</p>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                                   {a.pesoAnterior}kg → {a.pesoAtual}kg
                                 </p>
                               </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-black ${a.gmd > 0 ? 'text-emerald-600' : a.gmd < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                {a.gmd > 0 ? '+' : ''}{a.gmd.toFixed(0)}g
                              </p>
                              <p className="text-[7px] font-black text-slate-400 uppercase italic">
                                {a.dias} dias
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default GmdAnalysis;
