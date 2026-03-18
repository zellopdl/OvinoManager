
import React, { useMemo, useState } from 'react';
import { Sheep, Sexo, Status, Group } from '../../../types';
import { motion, AnimatePresence } from 'motion/react';

interface FamachaAnalysisProps {
  sheep: Sheep[];
  groups: Group[];
}

type FamachaCategory = 'Excelente' | 'Bom' | 'Atenção' | 'Crítico' | 'Emergência';

interface AnimalFamacha {
  id: string;
  brinco: string;
  nome: string;
  nascimento: string;
  famacha: number;
  categoria: FamachaCategory;
  famachaAnterior: number | null;
  tendencia: 'melhorando' | 'piorando' | 'estavel';
  data: string;
}

const FamachaAnalysis: React.FC<FamachaAnalysisProps> = ({ sheep, groups: groupsList }) => {
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

  const calculateFamachaInfo = (s: Sheep): AnimalFamacha | null => {
    if (!s.historicoFamacha || s.historicoFamacha.length === 0) return null;

    const sortedHistory = [...s.historicoFamacha].sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    const atual = sortedHistory[0];
    const anterior = sortedHistory[1] || null;

    let categoria: FamachaCategory = 'Excelente';
    if (atual.famacha === 1) categoria = 'Excelente';
    else if (atual.famacha === 2) categoria = 'Bom';
    else if (atual.famacha === 3) categoria = 'Atenção';
    else if (atual.famacha === 4) categoria = 'Crítico';
    else categoria = 'Emergência';

    let tendencia: 'melhorando' | 'piorando' | 'estavel' = 'estavel';
    if (anterior) {
      // No Famacha, menor é melhor (1 é melhor que 5)
      if (atual.famacha < anterior.famacha) tendencia = 'melhorando';
      else if (atual.famacha > anterior.famacha) tendencia = 'piorando';
    }

    return {
      id: s.id,
      brinco: s.brinco,
      nome: s.nome,
      nascimento: s.nascimento,
      famacha: atual.famacha,
      categoria,
      famachaAnterior: anterior?.famacha || null,
      tendencia,
      data: atual.data
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
      const famachas = list.map(calculateFamachaInfo).filter((f): f is AnimalFamacha => f !== null);
      const avgFamacha = famachas.length > 0 ? famachas.reduce((acc, curr) => acc + curr.famacha, 0) / famachas.length : 0;
      
      return {
        name,
        count: list.length,
        avgFamacha,
        animals: famachas.sort((a, b) => b.famacha - a.famacha) // Ordenar do pior (5) para o melhor (1)
      };
    });
  }, [sheep]);

  const activeGroup = groups.find(g => g.name === selectedGroup);

  const categorizedAnimals = useMemo(() => {
    if (!activeGroup) return {};
    return {
      'Emergência': activeGroup.animals.filter(a => a.categoria === 'Emergência'),
      'Crítico': activeGroup.animals.filter(a => a.categoria === 'Crítico'),
      'Atenção': activeGroup.animals.filter(a => a.categoria === 'Atenção'),
      'Bom': activeGroup.animals.filter(a => a.categoria === 'Bom'),
      'Excelente': activeGroup.animals.filter(a => a.categoria === 'Excelente'),
    };
  }, [activeGroup]);

  const categoryStyles: Record<FamachaCategory, string> = {
    'Emergência': 'bg-rose-100 border-rose-300 text-rose-900',
    'Crítico': 'bg-rose-50 border-rose-200 text-rose-700',
    'Atenção': 'bg-amber-50 border-amber-200 text-amber-700',
    'Bom': 'bg-emerald-50 border-emerald-100 text-emerald-600',
    'Excelente': 'bg-emerald-100 border-emerald-200 text-emerald-800',
  };

  const categoryIcons: Record<FamachaCategory, string> = {
    'Emergência': '🚨',
    'Crítico': '🆘',
    'Atenção': '⚠️',
    'Bom': '👍',
    'Excelente': '🌟',
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
              <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl">👁️</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Grau de Anemia Médio</p>
              <h3 className="text-3xl font-black text-slate-800 uppercase mb-1">{activeGroup.name}</h3>
              <p className="text-xs font-bold text-slate-400 italic mb-6">{activeGroup.count} Animais no total</p>
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Famacha Médio do Grupo</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black ${activeGroup.avgFamacha <= 2 ? 'text-emerald-600' : activeGroup.avgFamacha <= 3 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {activeGroup.avgFamacha.toFixed(1)}
                  </span>
                  <span className="text-sm font-black text-slate-400 uppercase">Grau (1-5)</span>
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

            <div className="bg-rose-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -bottom-4 -right-4 opacity-20 text-8xl">💉</div>
              <h4 className="text-sm font-black uppercase mb-4">Diretriz Sanitária</h4>
              <p className="text-xs font-medium leading-relaxed opacity-80 italic">
                {activeGroup.avgFamacha >= 4 
                  ? "ALERTA VERMELHO! Alta incidência de anemia no grupo. Vermifugação imediata e revisão de pastagens necessária." 
                  : activeGroup.avgFamacha >= 3 
                  ? "Atenção necessária. Monitorar de perto os animais de grau 3 e tratar graus 4 e 5." 
                  : "Sanidade controlada. Manter o monitoramento periódico para prevenir infestações por Haemonchus."}
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
                {(Object.entries(categorizedAnimals) as [FamachaCategory, AnimalFamacha[]][]).map(([cat, list]) => (
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
                                   {a.famachaAnterior !== null ? `De Grau ${a.famachaAnterior} para ${a.famacha}` : `Grau: ${a.famacha}`}
                                 </p>
                               </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {a.tendencia === 'melhorando' && <span className="text-emerald-500 text-[10px]">▲</span>}
                                {a.tendencia === 'piorando' && <span className="text-rose-500 text-[10px]">▼</span>}
                                <p className={`text-xs font-black ${a.famacha <= 2 ? 'text-emerald-600' : a.famacha === 3 ? 'text-amber-600' : 'text-rose-600'}`}>
                                  {a.famacha}
                                </p>
                              </div>
                              <p className="text-[7px] font-black text-slate-400 uppercase italic">
                                {new Date(a.data).toLocaleDateString('pt-BR')}
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

export default FamachaAnalysis;
