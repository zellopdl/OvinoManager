
import React, { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';
import { Sheep, Breed, Group, Status, Sexo, Sanidade } from '../types';
import { formatBrazilianDate } from '../utils';

interface ChartsViewProps {
  sheep: Sheep[];
  breeds: Breed[];
  groups: Group[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444'];
const GENDER_COLORS = { [Sexo.MACHO]: '#3b82f6', [Sexo.FEMEA]: '#ec4899' };

const ChartsView: React.FC<ChartsViewProps> = ({ sheep, breeds, groups }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // --- DADOS DE RECRIA E VENDA ---

  const growthScatterData = useMemo(() => {
    const activeSheep = sheep.filter(s => s.status === Status.ATIVO);
    const now = new Date().getTime();
    
    return activeSheep.map(s => {
      const birth = new Date(s.nascimento).getTime();
      const ageInDays = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
      return {
        nome: s.nome,
        brinco: s.brinco,
        idadeDias: ageInDays,
        peso: s.peso
      };
    }).filter(d => d.idadeDias >= 0 && d.idadeDias < 365);
  }, [sheep]);

  const trendLineData = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 200; i += 20) {
      points.push({ x: i, y: 4 + (i * 0.250) });
    }
    return points;
  }, []);

  const efficiencyByBatchData = useMemo(() => {
    const batches: Record<string, { month: string, verde: number, amarelo: number, vermelho: number }> = {};
    const now = new Date().getTime();

    sheep.filter(s => s.status === Status.ATIVO).forEach(s => {
      const birthDate = new Date(s.nascimento);
      const batchKey = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}`;
      const batchLabel = birthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
      
      const ageInWeeks = Math.floor((now - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

      if (!batches[batchKey]) {
        batches[batchKey] = { month: batchLabel, verde: 0, amarelo: 0, vermelho: 0 };
      }

      if (ageInWeeks <= 13) batches[batchKey].verde++;
      else if (ageInWeeks <= 16) batches[batchKey].amarelo++;
      else batches[batchKey].vermelho++;
    });

    return Object.values(batches).sort((a, b) => a.month.localeCompare(b.month));
  }, [sheep]);

  // --- DADOS ORIGINAIS ---
  const groupDistributionData = useMemo(() => {
    // Fix: Removed redundant string comparison that caused type narrowing overlap error
    const activeSheep = sheep.filter(s => s.status === Status.ATIVO);
    const distribution: Record<string, number> = {};
    activeSheep.forEach(s => {
      const groupName = groups.find(g => g.id === s.grupoId)?.nome || 'SEM LOTE';
      distribution[groupName] = (distribution[groupName] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [sheep, groups]);

  const recriaData = useMemo(() => {
    const recriaGroup = groups.find(g => g.nome.toUpperCase().includes('RECRIA'));
    if (!recriaGroup) return [];
    const recriaSheep = sheep.filter(s => s.grupoId === recriaGroup.id && s.status === Status.ATIVO);
    const stats = { 'Macho (Cordeiro)': 0, 'Fêmea (Cordeira)': 0, 'Macho (Juvenil)': 0, 'Fêmea (Juvenil)': 0 };
    const now = new Date().getTime();
    recriaSheep.forEach(s => {
      const ageInMonths = (now - new Date(s.nascimento).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      const isJuvenil = ageInMonths > 6;
      const key = `${s.sexo === Sexo.MACHO ? 'Macho' : 'Fêmea'} (${isJuvenil ? 'Juvenil' : (s.sexo === Sexo.MACHO ? 'Cordeiro' : 'Cordeira')})`;
      stats[key as keyof typeof stats]++;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [sheep, groups]);

  const newbornData = useMemo(() => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const newborns = sheep.filter(s => new Date(s.nascimento) >= sixtyDaysAgo && s.status === Status.ATIVO);
    const stats = { [Sexo.MACHO]: newborns.filter(s => s.sexo === Sexo.MACHO).length, [Sexo.FEMEA]: newborns.filter(s => s.sexo === Sexo.FEMEA).length };
    return [ { name: 'Machos', value: stats[Sexo.MACHO], color: GENDER_COLORS[Sexo.MACHO] }, { name: 'Fêmeas', value: stats[Sexo.FEMEA], color: GENDER_COLORS[Sexo.FEMEA] } ].filter(d => d.value > 0);
  }, [sheep]);

  const deceasedData = useMemo(() => {
    const deceased = sheep.filter(s => s.status === Status.OBITO);
    const stats: Record<string, number> = {};
    deceased.forEach(s => {
      const breedName = breeds.find(b => b.id === s.racaId)?.nome || 'SRD';
      stats[breedName] = (stats[breedName] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [sheep, breeds]);

  const infirmaryTimelineData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(), month: d.getMonth(), year: d.getFullYear(), count: 0 });
    }
    const sickSheep = sheep.filter(s => s.sanidade === Sanidade.ENFERMARIA || s.status === Status.OBITO);
    sickSheep.forEach(s => {
      const entryDate = new Date(s.createdAt || s.nascimento);
      const targetMonth = months.find(m => m.month === entryDate.getMonth() && m.year === entryDate.getFullYear());
      if (targetMonth) targetMonth.count++;
    });
    return months;
  }, [sheep]);

  // --- DADOS SANITÁRIOS COM DESCRIÇÃO ---

  const famachaDistribution = useMemo(() => {
    const labels: Record<number, string> = {
      1: '1-ÓTIMO',
      2: '2-BOM',
      3: '3-ALERTA',
      4: '4-RUIM',
      5: '5-CRÍTICO'
    };
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    sheep.filter(s => s.status === Status.ATIVO).forEach(s => {
      const f = s.famacha as keyof typeof stats;
      if (stats[f] !== undefined) stats[f]++;
    });
    return Object.entries(stats).map(([grau, total]) => ({ 
      grauNum: grau,
      grauDesc: labels[parseInt(grau)], 
      total 
    }));
  }, [sheep]);

  const eccDistribution = useMemo(() => {
    const labels: Record<number, string> = {
      1: '1-MAGRA',
      2: '2-REDUZIDA',
      3: '3-IDEAL',
      4: '4-GORDA',
      5: '5-OBESA'
    };
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    sheep.filter(s => s.status === Status.ATIVO).forEach(s => {
      const e = Math.round(s.ecc) as keyof typeof stats;
      if (stats[e] !== undefined) stats[e]++;
    });
    return Object.entries(stats).map(([escore, total]) => ({ 
      escoreNum: escore,
      escoreDesc: labels[parseInt(escore)], 
      total 
    }));
  }, [sheep]);

  const weightChartData = useMemo(() => {
    if (!selectedGroupId) return [];
    const groupSheep = sheep.filter(s => s.grupoId === selectedGroupId && s.status === Status.ATIVO);
    const allDates = new Set<string>();
    groupSheep.forEach(s => {
      s.historicoPeso?.forEach(h => allDates.add(h.data.split('T')[0]));
      if (s.createdAt) allDates.add(s.createdAt.split('T')[0]);
    });
    const sortedDates = Array.from(allDates).sort();
    return sortedDates.map(date => {
      const point: any = { date: formatBrazilianDate(date) };
      groupSheep.forEach(s => {
        const historyOnDate = s.historicoPeso?.find(h => h.data.split('T')[0] === date);
        if (historyOnDate) point[s.nome] = historyOnDate.peso;
      });
      return point;
    });
  }, [sheep, selectedGroupId]);

  const activeGroupSheepNames = useMemo(() => {
    return sheep.filter(s => s.grupoId === selectedGroupId && s.status === Status.ATIVO).map(s => s.nome);
  }, [sheep, selectedGroupId]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* CABEÇALHO */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel de Performance</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Visão analítica avançada e inteligência de terminação</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <span className="text-indigo-600 font-black text-xs uppercase tracking-widest">Ativos: {sheep.filter(s => s.status === Status.ATIVO).length}</span>
        </div>
      </div>

      {/* SEÇÃO RECRIA & VENDA */}
      <div className="space-y-6">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
           Recria & Terminação <div className="h-px bg-slate-200 flex-1"></div>
           <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">FOCO EM LUCRO</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span> Curva de Engorda vs Alvo (42kg)
              </h3>
            </div>
            <div className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height={350}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="idadeDias" name="Idade" unit=" dias" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} />
                  <YAxis type="number" dataKey="peso" name="Peso" unit=" kg" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                  <ZAxis type="number" range={[60, 60]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
                            <p className="text-[10px] font-black uppercase text-slate-800">{data.nome}</p>
                            <p className="text-[9px] font-bold text-indigo-600 tracking-widest">#{data.brinco}</p>
                            <div className="mt-1 border-t pt-1">
                              <p className="text-[9px] font-bold text-slate-500 uppercase">Peso: {data.peso}kg</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">Idade: {data.idadeDias} dias</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={42} label={{ position: 'right', value: 'ALVO 42KG', fill: '#ef4444', fontSize: 9, fontWeight: 'black' }} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} />
                  <Scatter name="Animais" data={growthScatterData} fill="#6366f1" fillOpacity={0.6} stroke="#4f46e5" />
                  <Line data={trendLineData} type="monotone" dataKey="y" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Eficiência Cronológica (Semanas)
              </h3>
            </div>
            <div className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={efficiencyByBatchData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                  <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '20px' }} iconType="circle" />
                  <Bar dataKey="verde" name="Até 13 sem (Precoce)" stackId="a" fill="#10b981" />
                  <Bar dataKey="amarelo" name="14-16 sem (Padrão)" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="vermelho" name="> 17 sem (Zebra)" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO MONITORAMENTO SANITÁRIO */}
      <div className="space-y-6">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
           Monitoramento Sanitário <div className="h-px bg-slate-200 flex-1"></div>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span> Enfermaria (Semestre)
            </h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={infirmaryTimelineData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="count" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Perfil Famacha (Anemia)
            </h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={famachaDistribution} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="grauDesc" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 8, fontWeight: 'bold', fill: '#64748b'}}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} 
                    labelStyle={{ fontWeight: 'black', color: '#f59e0b' }}
                  />
                  <Line type="monotone" dataKey="total" name="Animais" stroke="#f59e0b" strokeWidth={4} dot={{ r: 5, fill: '#f59e0b' }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Curva de Vigor (ECC)
            </h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={eccDistribution} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="escoreDesc" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 8, fontWeight: 'bold', fill: '#64748b'}} 
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }}
                    labelStyle={{ fontWeight: 'black', color: '#6366f1' }}
                  />
                  <Line type="monotone" dataKey="total" name="Animais" stroke="#6366f1" strokeWidth={4} dot={{ r: 5, fill: '#6366f1' }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* POPULAÇÃO E LOTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Ocupação de Lotes
          </h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={groupDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {groupDistributionData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Lote Recria
          </h3>
          <div className="flex-1 min-h-[250px]">
            {recriaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={recriaData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} width={100} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', fontSize: '10px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {recriaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name.includes('Macho') ? GENDER_COLORS[Sexo.MACHO] : GENDER_COLORS[Sexo.FEMEA]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center"><p className="text-slate-400 text-[9px] font-black uppercase">Dados Insuficientes.</p></div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"></span> Berçário (60 dias)
          </h3>
          <div className="flex-1 min-h-[250px]">
            {newbornData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={newbornData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {newbornData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center"><p className="text-slate-400 text-[9px] font-black uppercase">Sem nascimentos recentes.</p></div>
            )}
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE PERDAS */}
      <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white flex flex-col">
        <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span> Análise de Perdas por Raça
        </h3>
        <div className="flex-1 min-h-[250px]">
          {deceasedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={deceasedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <span className="text-4xl mb-3">🛡️</span>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest leading-loose">
                Rebanho com 100% de vitalidade.<br/>Nenhum óbito registrado na base.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ChartsView;
