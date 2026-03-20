import React, { useState, useMemo, useEffect } from 'react';
import { Sheep, Group, BreedingPlan, Paddock, Status } from '../../types';
import { VacinacaoConfig } from './VacinacaoManager';
import { vacinacaoService } from './vacinacaoService';
import { CheckCircle2, Circle, Users, Calendar, Syringe, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  sheep: Sheep[];
  groups: Group[];
  plans: BreedingPlan[];
  paddocks: Paddock[];
  config: VacinacaoConfig;
}

interface AnimalVaccination {
  sheep: Sheep;
  vaccines: {
    date: string;
    type: string;
    title: string;
    vaccine: string;
    confirmed: boolean;
  }[];
}

const VacinacaoGroupView: React.FC<Props> = ({ sheep, groups, plans, paddocks, config }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [confirmedVaccinations, setConfirmedVaccinations] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedAnimalId, setExpandedAnimalId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const loadConfirmed = async () => {
    const confirmed = await vacinacaoService.getConfirmedVaccinations();
    setConfirmedVaccinations(confirmed);
  };

  useEffect(() => {
    loadConfirmed();
  }, []);

  const activeGroups = useMemo(() => groups, [groups]);

  const allEvents = useMemo(() => {
    const evts: { date: string, type: string, title: string, vaccine: string, sheepId: string }[] = [];

    const addDays = (dateStr: string, days: number) => {
      const d = new Date(dateStr + 'T12:00:00Z');
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const getBaseDayOfMonth = (year: number, month: number, ordem: number, diaSemana: number) => {
      const firstDay = new Date(year, month, 1);
      let count = 0;
      for (let d = 1; d <= 31; d++) {
        const date = new Date(year, month, d);
        if (date.getMonth() !== month) break;
        if (date.getDay() === diaSemana) {
          count++;
          if (count === ordem) return date;
        }
      }
      return new Date(year, month, 15);
    };

    const adjustToWorkDay = (date: Date) => {
      const d = new Date(date);
      if (d.getDay() === 6) d.setDate(d.getDate() + 2);
      else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      return d;
    };

    const addWorkDays = (startDate: Date, days: number) => {
      let date = new Date(startDate);
      let added = 0;
      while (added < days) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 0 && date.getDay() !== 6) {
          added++;
        }
      }
      return date;
    };

    const naturalEvents: { date: string, type: string, title: string, vaccine: string, sheepId: string }[] = [];
    const configYear = config.updatedAt ? new Date(config.updatedAt).getFullYear() : new Date().getFullYear();

    sheep.forEach(s => {
      const addNaturalEvt = (date: string, type: string, title: string, vaccine: string, sheepId: string) => {
        // 1. Verificar se o animal já foi vacinado
        const isConfirmed = confirmedVaccinations.includes(`${date}_${vaccine}_${type}_sid:${sheepId}`);
        if (isConfirmed) return;

        // 2. Verificar se o ano do evento é anterior ao ano da configuração
        const evtYear = new Date(date + 'T12:00:00Z').getFullYear();
        if (evtYear < configYear) return;

        naturalEvents.push({ date, type, title, vaccine, sheepId });
      };

      // 1. Cordeiros
      if (s.nascimento) {
        addNaturalEvt(addDays(s.nascimento, 40), 'cordeiro', 'Vacinação Cordeiros', `Clostridiose (${config.tipoClostridiose} cepas)`, s.id);
        addNaturalEvt(addDays(s.nascimento, 70), 'cordeiro', 'Reforço Cordeiros', `Clostridiose (${config.tipoClostridiose} cepas)`, s.id);
        if (config.hasEctima) {
          addNaturalEvt(addDays(s.nascimento, 15), 'cordeiro', 'Vacina Ectima', 'Ectima', s.id);
        }
      }

      // 2. Quarentena
      const group = groups.find(g => g.id === s.grupoId);
      if (group && group.nome.toLowerCase().includes('quarentena')) {
        const d0 = s.createdAt ? s.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
        addNaturalEvt(d0, 'quarentena', 'Protocolo Entrada', 'Vermífugo + Clostridiose', s.id);
        addNaturalEvt(addDays(d0, 30), 'quarentena', 'Reforço Entrada', 'Reforço Clostridiose', s.id);
      }

      // 3. Vacinação Anual
      const mesAnual = (config.mesAnual || 5) - 1;
      const anoAtual = new Date().getFullYear();
      
      [anoAtual, anoAtual + 1].forEach(year => {
        let dateAnual = getBaseDayOfMonth(year, mesAnual, config.diaBaseOrdem || 2, config.diaBaseSemana || 3);
        dateAnual = adjustToWorkDay(dateAnual);
        const dateStr = dateAnual.toISOString().split('T')[0];

        const birthDate = s.nascimento ? new Date(s.nascimento) : null;
        if (!birthDate || birthDate < dateAnual) {
          addNaturalEvt(dateStr, 'anual', 'Vacinação Anual', `Clostridiose (${config.tipoClostridiose} cepas)`, s.id);

          if (config.hasRaiva) {
            const dateRaiva = config.agruparMensal ? dateAnual : addWorkDays(dateAnual, 15);
            addNaturalEvt(dateRaiva.toISOString().split('T')[0], 'anual', 'Vacinação Anual', 'Raiva', s.id);
          }
        }
      });
    });

    plans.forEach(p => {
      if (p.dataInicioMonta) {
        const dPre = addDays(p.dataInicioMonta, -15);
        const planSheepIds = p.ovelhas?.map(o => o.eweId) || [];
        sheep.filter(s => planSheepIds.includes(s.id)).forEach(s => {
          const isConfirmed = confirmedVaccinations.includes(`${dPre}_Clostridiose + Reprodutivas_pre-monta_sid:${s.id}`);
          if (!isConfirmed) {
            naturalEvents.push({ date: dPre, type: 'pre-monta', title: 'Pré-Monta', vaccine: `Clostridiose + Reprodutivas`, sheepId: s.id });
          }
        });

        const prenhasIds = p.ovelhas?.filter(o => o.ciclo1 === 'prenha' || o.ciclo2 === 'prenha' || o.ciclo3 === 'prenha').map(o => o.eweId) || [];
        sheep.filter(s => prenhasIds.includes(s.id)).forEach(s => {
          const d100 = addDays(p.dataInicioMonta, 115);
          const vaccine = `Clostridiose (${config.tipoClostridiose} cepas)`;
          const isConfirmed = confirmedVaccinations.includes(`${d100}_${vaccine}_prenha_sid:${s.id}`);
          if (!isConfirmed) {
            naturalEvents.push({ date: d100, type: 'prenha', title: 'Gestantes (100d)', vaccine, sheepId: s.id });
          }
        });
      }
    });

    if (config.agruparMensal) {
      // Pre-calcula as vacinas por mês para otimizar
      const vaccinesByMonth: Record<string, Set<string>> = {};
      naturalEvents.forEach(e => {
        const d = new Date(e.date + 'T12:00:00Z');
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!vaccinesByMonth[key]) vaccinesByMonth[key] = new Set();
        vaccinesByMonth[key].add(e.vaccine);
      });

      naturalEvents.forEach(evt => {
        const date = new Date(evt.date + 'T12:00:00Z');
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}`;
        
        let baseDay = getBaseDayOfMonth(year, month, config.diaBaseOrdem || 2, config.diaBaseSemana || 3);
        baseDay = adjustToWorkDay(baseDay);

        const monthVaccines = Array.from(vaccinesByMonth[key]).sort();
        const vaccineIndex = monthVaccines.indexOf(evt.vaccine);
        const finalDate = vaccineIndex === 0 ? baseDay : addWorkDays(baseDay, vaccineIndex * (config.intervaloEntreVacinas || 5));
        
        evts.push({ ...evt, date: finalDate.toISOString().split('T')[0] });
      });
    } else {
      return naturalEvents;
    }

    return evts;
  }, [sheep, groups, plans, config]);

  const availableMonths = useMemo(() => {
    if (!selectedGroupId) return [];
    
    const groupAnimals = sheep.filter(s => s.grupoId === selectedGroupId);
    const animalIds = new Set(groupAnimals.map(s => s.id));
    
    const monthsMap = new Map<string, { month: number, year: number }>();
    
    allEvents.forEach(e => {
      if (animalIds.has(e.sheepId)) {
        const d = new Date(e.date + 'T12:00:00Z');
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!monthsMap.has(key)) {
          monthsMap.set(key, { month: d.getMonth(), year: d.getFullYear() });
        }
      }
    });
    
    return Array.from(monthsMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [selectedGroupId, allEvents, sheep]);

  useEffect(() => {
    if (selectedGroupId && availableMonths.length > 0) {
      const hasVaccines = availableMonths.some(m => m.month === currentMonth && m.year === currentYear);
      if (!hasVaccines) {
        setCurrentMonth(availableMonths[0].month);
        setCurrentYear(availableMonths[0].year);
      }
    }
  }, [selectedGroupId, availableMonths]);

  const animalVaccinations = useMemo(() => {
    if (!selectedGroupId) return [];

    const groupAnimals = sheep.filter(s => s.grupoId === selectedGroupId);
    
    return groupAnimals.map(s => {
      const vaccines = allEvents
        .filter(e => e.sheepId === s.id)
        .filter(e => {
          const d = new Date(e.date + 'T12:00:00Z');
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .map(e => ({
          ...e,
          confirmed: confirmedVaccinations.includes(`${e.date}_${e.vaccine}_${e.type}_sid:${s.id}`)
        }));

      return { sheep: s, vaccines };
    }).filter(av => av.vaccines.length > 0);
  }, [selectedGroupId, currentMonth, currentYear, allEvents, confirmedVaccinations, sheep]);

  const toggleSelection = (animalId: string, vaccineKey: string) => {
    const key = `${animalId}|${vaccineKey}`;
    const newSelection = new Set(selectedItems);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    setSelectedItems(newSelection);
  };

  const handleConfirmSelected = async () => {
    if (selectedItems.size === 0) return;

    const confirm = window.confirm(`Deseja confirmar a vacinação de ${selectedItems.size} itens selecionados?`);
    if (!confirm) return;

    try {
      setIsProcessing(true);
      for (const itemKey of selectedItems) {
        const [animalId, vaccineKey] = itemKey.split('|');
        const [date, vaccine, type] = vaccineKey.split('_');
        await vacinacaoService.confirmVaccination(date, vaccine, type, animalId);
      }
      
      await loadConfirmed();
      setSelectedItems(new Set());
      alert('Vacinações confirmadas com sucesso!');
    } catch (err) {
      console.error("Erro ao confirmar selecionados:", err);
      alert('Erro ao confirmar vacinações. Verifique o console.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmGroup = async () => {
    if (!selectedGroupId || animalVaccinations.length === 0) return;
    
    const totalPending = animalVaccinations.reduce((acc, av) => acc + av.vaccines.length, 0);
    const confirm = window.confirm(`Deseja confirmar a vacinação de TODOS os ${totalPending} itens pendentes deste grupo para este mês?`);
    if (!confirm) return;

    try {
      setIsProcessing(true);
      for (const av of animalVaccinations) {
        for (const v of av.vaccines) {
          if (!v.confirmed) {
            await vacinacaoService.confirmVaccination(v.date, v.vaccine, v.type, av.sheep.id);
          }
        }
      }
      await loadConfirmed();
      setSelectedItems(new Set());
      alert('Grupo confirmado com sucesso!');
    } catch (err) {
      console.error("Erro ao confirmar grupo:", err);
      alert('Erro ao confirmar grupo. Verifique o console.');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} dias`;
    const months = Math.floor(diffDays / 30);
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return `${years}a ${remMonths}m`;
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Filtros e Seleção */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-indigo-50 p-3 rounded-2xl">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selecionar Grupo</label>
              <select 
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Escolha um grupo...</option>
                {activeGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedGroupId && availableMonths.length > 0 && (
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="bg-emerald-50 p-3 rounded-2xl">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meses com Vacinação</label>
                <div className="flex flex-wrap gap-2">
                  {availableMonths.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentMonth(m.month);
                        setCurrentYear(m.year);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        currentMonth === m.month && currentYear === m.year
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {monthNames[m.month]} {m.year}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!selectedGroupId ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] py-20 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Users className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Selecione um grupo para começar</h3>
          <p className="text-slate-400 text-sm mt-2">Você poderá ver e confirmar as vacinas de todos os animais do grupo.</p>
        </div>
      ) : animalVaccinations.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-[40px] py-20 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-xl font-black text-emerald-600 uppercase tracking-tight">Tudo em dia!</h3>
          <p className="text-emerald-500 text-sm mt-2">Nenhuma vacinação pendente para este grupo em {monthNames[currentMonth]}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
              {animalVaccinations.length} Animais com Vacinas em {monthNames[currentMonth]}
            </h3>
            <div className="flex gap-3">
              {selectedItems.size > 0 && (
                <button 
                  onClick={handleConfirmSelected}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Selecionados ({selectedItems.size})
                </button>
              )}
              <button 
                onClick={handleConfirmGroup}
                disabled={isProcessing}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
              >
                <Syringe className="w-4 h-4" />
                Confirmar Grupo Inteiro
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {animalVaccinations.map((av) => (
              <div key={av.sheep.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                      🐑
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">#{av.sheep.brinco}</span>
                        <h4 className="text-base font-black text-slate-800">{av.sheep.nome}</h4>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Idade: {calculateAge(av.sheep.nascimento)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {av.vaccines.map((v, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div 
                            className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${v.confirmed ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            title={v.vaccine}
                          >
                            <Syringe className={`w-4 h-4 ${v.confirmed ? 'text-white' : 'text-slate-400'}`} />
                          </div>
                          <button
                            onClick={() => toggleSelection(av.sheep.id, `${v.date}_${v.vaccine}_${v.type}`)}
                            disabled={isProcessing || v.confirmed}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${v.confirmed ? 'bg-emerald-500 border-emerald-600 text-white' : selectedItems.has(`${av.sheep.id}|${v.date}_${v.vaccine}_${v.type}`) ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-300 text-slate-300 hover:border-indigo-500 hover:text-indigo-500'}`}
                          >
                            {v.confirmed ? <CheckCircle2 className="w-4 h-4" /> : selectedItems.has(`${av.sheep.id}|${v.date}_${v.vaccine}_${v.type}`) ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-3 h-3 rounded-sm border border-slate-300" />}
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setExpandedAnimalId(expandedAnimalId === av.sheep.id ? null : av.sheep.id)}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors ml-2"
                    >
                      {expandedAnimalId === av.sheep.id ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
                    </button>
                  </div>
                </div>

                {expandedAnimalId === av.sheep.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-50 bg-slate-50/30">
                    <div className="space-y-2">
                      {av.vaccines.map((v, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${v.confirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                              <Syringe className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{v.title}</span>
                              <span className="text-sm font-bold text-slate-700">{v.vaccine}</span>
                              <span className="block text-[9px] text-slate-400 font-medium">Previsão: {v.date.split('-').reverse().join('/')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${v.confirmed ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {v.confirmed ? 'Vacinado' : 'Pendente'}
                            </span>
                            <button 
                              onClick={() => toggleSelection(av.sheep.id, `${v.date}_${v.vaccine}_${v.type}`)}
                              disabled={isProcessing || v.confirmed}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${v.confirmed ? 'bg-emerald-500 text-white' : selectedItems.has(`${av.sheep.id}|${v.date}_${v.vaccine}_${v.type}`) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}
                            >
                              {v.confirmed ? <CheckCircle2 className="w-6 h-6" /> : selectedItems.has(`${av.sheep.id}|${v.date}_${v.vaccine}_${v.type}`) ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VacinacaoGroupView;
