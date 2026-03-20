import React, { useState, useMemo, useEffect } from 'react';
import { Sheep, Group, BreedingPlan, Paddock } from '../../types';
import { VacinacaoConfig } from './VacinacaoManager';
import { vacinacaoService } from './vacinacaoService';

interface Props {
  sheep: Sheep[];
  groups: Group[];
  plans: BreedingPlan[];
  paddocks: Paddock[];
  config: VacinacaoConfig;
}

interface VacinacaoEvent {
  type: 'cordeiro' | 'quarentena' | 'pre-monta' | 'prenha' | 'anual';
  title: string;
  vaccine: string;
  animals: Sheep[];
}

const VacinacaoCalendar: React.FC<Props> = ({ sheep, groups, plans, paddocks, config }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmedVaccinations, setConfirmedVaccinations] = useState<string[]>([]);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<Record<string, string[]>>({}); // key: vaccine_type, value: sheepIds
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const loadConfirmed = async () => {
      const confirmed = await vacinacaoService.getConfirmedVaccinations();
      setConfirmedVaccinations(confirmed);
    };
    loadConfirmed();
  }, []);

  const handleConfirm = async (date: string, vaccine: string, type: string, animalIds: string[]) => {
    try {
      setIsConfirming(true);
      for (const id of animalIds) {
        await vacinacaoService.confirmVaccination(date, vaccine, type, id);
      }
      const updated = await vacinacaoService.getConfirmedVaccinations();
      setConfirmedVaccinations(updated);
    } catch (err) {
      console.error("Erro ao confirmar vacinação:", err);
    } finally {
      setIsProcessing(false);
      setIsConfirming(false);
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const events = useMemo(() => {
    try {
      const evts: Record<string, VacinacaoEvent[]> = {};
      const configYear = config.updatedAt ? new Date(config.updatedAt).getFullYear() : new Date().getFullYear();

      const addEvt = (dateStr: string, type: VacinacaoEvent['type'], title: string, vaccine: string, animal: Sheep) => {
        // 1. Verificar se o animal já foi vacinado para esta data/vacina/tipo
        const isConfirmed = confirmedVaccinations.includes(`${dateStr}_${vaccine}_${type}_sid:${animal.id}`);
        if (isConfirmed) return;

        // 2. Verificar se o ano do evento é anterior ao ano da configuração (se for uma nova configuração)
        const evtYear = new Date(dateStr + 'T12:00:00Z').getFullYear();
        if (evtYear < configYear) return;

        if (!evts[dateStr]) evts[dateStr] = [];
        let existing = evts[dateStr].find(e => e.vaccine === vaccine && e.type === type);
        if (!existing) {
          existing = { type, title, vaccine, animals: [] };
          evts[dateStr].push(existing);
        }
        if (!existing.animals.find(a => a.id === animal.id)) {
          existing.animals.push(animal);
        }
      };

      const addDays = (dateStr: string, days: number) => {
        const d = new Date(dateStr + 'T12:00:00Z');
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      };

      // Helper para encontrar o dia base do mês (ex: 2ª Quarta)
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
        return new Date(year, month, 15); // Fallback
      };

      // Helper para ajustar para dia útil (evita Sáb/Dom)
      const adjustToWorkDay = (date: Date) => {
        const d = new Date(date);
        if (d.getDay() === 6) d.setDate(d.getDate() + 2); // Sáb -> Seg
        else if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Dom -> Seg
        return d;
      };

      // Helper para adicionar dias pulando finais de semana
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

      // 1. Gerar datas "naturais" primeiro
      const naturalEvents: { date: string, type: VacinacaoEvent['type'], title: string, vaccine: string, animal: Sheep }[] = [];

      sheep.forEach(s => {
        // 1. Cordeiros
        if (s.nascimento) {
          naturalEvents.push({ date: addDays(s.nascimento, 40), type: 'cordeiro', title: 'Vacinação Cordeiros', vaccine: `Clostridiose (${config.tipoClostridiose} cepas)`, animal: s });
          naturalEvents.push({ date: addDays(s.nascimento, 70), type: 'cordeiro', title: 'Reforço Cordeiros', vaccine: `Clostridiose (${config.tipoClostridiose} cepas)`, animal: s });
          if (config.hasEctima) {
            naturalEvents.push({ date: addDays(s.nascimento, 15), type: 'cordeiro', title: 'Vacina Ectima', vaccine: 'Ectima', animal: s });
          }
        }

        // 2. Quarentena (Baseado no nome do grupo do animal)
        const group = groups.find(g => g.id === s.grupoId);
        if (group && group.nome.toLowerCase().includes('quarentena')) {
          const d0 = s.createdAt ? s.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
          naturalEvents.push({ date: d0, type: 'quarentena', title: 'Protocolo Entrada', vaccine: 'Vermífugo + Clostridiose', animal: s });
          naturalEvents.push({ date: addDays(d0, 30), type: 'quarentena', title: 'Reforço Entrada', vaccine: 'Reforço Clostridiose', animal: s });
        }

        // 3. Vacinação Anual (Para todos os adultos)
        const mesAnual = (config.mesAnual || 5) - 1;
        const anoAtual = new Date().getFullYear();
        
        [anoAtual, anoAtual + 1].forEach(year => {
          let dateAnual = getBaseDayOfMonth(year, mesAnual, config.diaBaseOrdem || 2, config.diaBaseSemana || 3);
          dateAnual = adjustToWorkDay(dateAnual);
          const dateStr = dateAnual.toISOString().split('T')[0];

          const birthDate = s.nascimento ? new Date(s.nascimento) : null;
          if (!birthDate || birthDate < dateAnual) {
            naturalEvents.push({ 
              date: dateStr, 
              type: 'anual', 
              title: 'Vacinação Anual', 
              vaccine: `Clostridiose (${config.tipoClostridiose} cepas)`, 
              animal: s 
            });

            if (config.hasRaiva) {
              const dateRaiva = config.agruparMensal ? dateAnual : addWorkDays(dateAnual, 15);
              naturalEvents.push({ 
                date: dateRaiva.toISOString().split('T')[0], 
                type: 'anual', 
                title: 'Vacinação Anual', 
                vaccine: 'Raiva', 
                animal: s 
              });
            }
          }
        });
      });

      plans.forEach(p => {
        if (p.dataInicioMonta) {
          const dPre = addDays(p.dataInicioMonta, -15);
          const planSheepIds = p.ovelhas?.map(o => o.eweId) || [];
          sheep.filter(s => planSheepIds.includes(s.id)).forEach(s => {
            naturalEvents.push({ date: dPre, type: 'pre-monta', title: 'Pré-Monta', vaccine: `Clostridiose + Reprodutivas`, animal: s });
          });

          const prenhasIds = p.ovelhas?.filter(o => o.ciclo1 === 'prenha' || o.ciclo2 === 'prenha' || o.ciclo3 === 'prenha').map(o => o.eweId) || [];
          sheep.filter(s => prenhasIds.includes(s.id)).forEach(s => {
            const d100 = addDays(p.dataInicioMonta, 115);
            naturalEvents.push({ date: d100, type: 'prenha', title: 'Gestantes (100d)', vaccine: `Clostridiose (${config.tipoClostridiose} cepas)`, animal: s });
          });
        }
      });

      // 2. Aplicar Agrupamento se configurado
      if (config.agruparMensal) {
        naturalEvents.forEach(evt => {
          const date = new Date(evt.date + 'T12:00:00Z');
          const year = date.getFullYear();
          const month = date.getMonth();
          
          // Calcula o dia base do mês para este evento
          let baseDay = getBaseDayOfMonth(year, month, config.diaBaseOrdem || 2, config.diaBaseSemana || 3);
          baseDay = adjustToWorkDay(baseDay);

          const monthVaccines = Array.from(new Set(naturalEvents
            .filter(e => {
              const d = new Date(e.date + 'T12:00:00Z');
              return d.getFullYear() === year && d.getMonth() === month;
            })
            .map(e => e.vaccine)
          )).sort();

          const vaccineIndex = monthVaccines.indexOf(evt.vaccine);
          const finalDate = vaccineIndex === 0 ? baseDay : addWorkDays(baseDay, vaccineIndex * (config.intervaloEntreVacinas || 5));
          
          addEvt(finalDate.toISOString().split('T')[0], evt.type, evt.title, evt.vaccine, evt.animal);
        });
      } else {
        naturalEvents.forEach(evt => addEvt(evt.date, evt.type, evt.title, evt.vaccine, evt.animal));
      }

      return evts;
    } catch (err) {
      console.error("Erro ao processar eventos do calendário:", err);
      return {};
    }
  }, [sheep, groups, plans, config]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const formatDate = (d: number) => {
    const m = String(month + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    return `${year}-${m}-${day}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cordeiro': return 'bg-emerald-500';
      case 'quarentena': return 'bg-amber-500';
      case 'pre-monta': return 'bg-indigo-500';
      case 'prenha': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  const selectedEvents = selectedDate ? events[selectedDate] || [] : [];

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-3 md:p-4 border-b border-slate-100 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base md:text-lg font-black text-slate-800 uppercase">Calendário Sanitário</h3>
          {!config.agruparMensal && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg">
              <span className="text-amber-500 text-[10px]">💡</span>
              <span className="text-[9px] font-black text-amber-700 uppercase">Dica: Agrupe vacinas em "Refazer Formulário"</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm md:text-base font-bold text-slate-700 w-28 md:w-36 text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2 md:p-4 flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-7 gap-1 mb-1 shrink-0">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-wider py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-1 min-h-0">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-lg md:rounded-xl bg-slate-50/30 border border-slate-100/30"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = formatDate(day);
            const dayEvents = events[dateStr] || [];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isSelected = selectedDate === dateStr;

            const confirmedCount = dayEvents.reduce((acc, evt) => {
              const animalsConfirmed = evt.animals.filter(a => 
                confirmedVaccinations.includes(`${dateStr}_${evt.vaccine}_${evt.type}_sid:${a.id}`)
              ).length;
              return acc + (animalsConfirmed > 0 ? 1 : 0);
            }, 0);
            
            const isFullyConfirmed = dayEvents.length > 0 && confirmedCount === dayEvents.length;
            const isPartiallyConfirmed = dayEvents.length > 0 && confirmedCount > 0 && confirmedCount < dayEvents.length;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`rounded-lg md:rounded-xl border flex flex-col items-center justify-start p-1 transition-all relative overflow-hidden group h-full
                  ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-sm z-10' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
                  ${isToday && !isSelected ? 'bg-indigo-50/50 border-indigo-200' : ''}
                  ${isFullyConfirmed ? 'bg-emerald-50/30' : ''}
                `}
              >
                <div className="flex items-center justify-between w-full px-0.5">
                  <span className={`text-[10px] md:text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-slate-600'}`}>
                    {day}
                  </span>
                  {isFullyConfirmed && (
                    <span className="text-[10px] md:text-xs text-emerald-500 animate-in zoom-in">✓</span>
                  )}
                  {isPartiallyConfirmed && (
                    <span className="text-[10px] md:text-xs text-amber-400 opacity-70">✓</span>
                  )}
                </div>
                
                {/* Event Indicators */}
                <div className="flex flex-wrap justify-center gap-0.5 mt-auto w-full pb-0.5">
                  {dayEvents.map((evt, idx) => {
                    const isConfirmed = evt.animals.every(a => 
                      confirmedVaccinations.includes(`${dateStr}_${evt.vaccine}_${evt.type}_sid:${a.id}`)
                    );
                    return (
                      <div 
                        key={idx} 
                        className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isConfirmed ? 'bg-emerald-400 ring-1 ring-emerald-200' : getTypeColor(evt.type)}`}
                        title={`${evt.title}${isConfirmed ? ' (Concluído)' : ''}`}
                      ></div>
                    );
                  })}
                </div>
              </button>
            );
          })}
          {/* Fill remaining cells to maintain 6 rows grid structure */}
          {Array.from({ length: 42 - (firstDay + daysInMonth) }).map((_, i) => (
            <div key={`empty-end-${i}`} className="rounded-lg md:rounded-xl bg-slate-50/30 border border-slate-100/30"></div>
          ))}
        </div>
      </div>

      {/* Modal / Detalhes do Dia */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">
                Vacinação - {selectedDate.split('-').reverse().join('/')}
              </h3>
              <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-500 font-medium">Nenhuma vacinação programada para este dia.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedEvents.map((evt, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-4 h-4 rounded-full ${getTypeColor(evt.type)}`}></div>
                      <h4 className="text-lg font-bold text-slate-800">{evt.title}</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-100">
                        <span className="block text-xs font-black text-slate-400 uppercase mb-1">Vacina</span>
                        <span className="font-bold text-slate-700">{evt.vaccine}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-100">
                        <span className="block text-xs font-black text-slate-400 uppercase mb-1">Qtd. Animais</span>
                        <span className="font-bold text-slate-700">{evt.animals.length} cabeças</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 mb-4">
                      <span className="block text-xs font-black text-slate-400 uppercase mb-2">Materiais Necessários</span>
                      <ul className="text-sm text-slate-600 space-y-1 font-medium">
                        <li>• {evt.animals.length} doses de {evt.vaccine}</li>
                        <li>• {evt.animals.length} seringas e agulhas descartáveis</li>
                        <li>• Álcool e algodão para assepsia</li>
                      </ul>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 mb-4">
                      <span className="block text-xs font-black text-slate-400 uppercase mb-3">Materiais Necessários</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                          <span className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Doses</span>
                          <span className="text-lg font-black text-emerald-700">{evt.animals.length} doses</span>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <span className="block text-[10px] font-black text-blue-600 uppercase mb-1">Agulhas</span>
                          <span className="text-lg font-black text-blue-700">{Math.ceil(evt.animals.length / 10)} unid.</span>
                          <span className="block text-[8px] text-blue-400 font-bold uppercase">(Troca a cada 10)</span>
                        </div>
                        <div className="col-span-2 bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">💉</div>
                          <div>
                            <span className="block text-[10px] font-black text-amber-600 uppercase">Seringa / Aplicador</span>
                            <span className="text-xs font-bold text-amber-700">Verificar calibração para {evt.vaccine}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 mb-4">
                      <span className="block text-xs font-black text-slate-400 uppercase mb-3">Lote de Animais (Por Piquete e Grupo)</span>
                      <div className="space-y-4">
                        {Object.entries(
                          evt.animals.reduce((acc, animal) => {
                            const key = `${animal.piqueteId || 'sem-piquete'}_${animal.grupoId || 'sem-grupo'}`;
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(animal);
                            return acc;
                          }, {} as Record<string, typeof evt.animals>)
                        ).map(([key, animalsInLot]) => {
                          const [pId, gId] = key.split('_');
                          const paddockName = paddocks.find(p => p.id === pId)?.piquete || 'Sem Piquete';
                          const groupName = groups.find(g => g.id === gId)?.nome || 'Sem Grupo';
                          
                          return (
                            <div key={key} className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                              <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-2">
                                <h5 className="text-xs font-black text-indigo-600 uppercase">
                                  📍 {paddockName} | 👥 {groupName}
                                </h5>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  {animalsInLot.length} animais
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {animalsInLot.map(a => {
                                  const isConfirmed = confirmedVaccinations.includes(`${selectedDate}_${evt.vaccine}_${evt.type}_sid:${a.id}`);
                                  const isSelected = (selectedAnimalIds[`${evt.vaccine}_${evt.type}`] || []).includes(a.id);
                                  
                                  return (
                                    <button 
                                      key={a.id} 
                                      onClick={() => {
                                        if (isConfirmed) return;
                                        const current = selectedAnimalIds[`${evt.vaccine}_${evt.type}`] || [];
                                        if (current.includes(a.id)) {
                                          setSelectedAnimalIds({ ...selectedAnimalIds, [`${evt.vaccine}_${evt.type}`]: current.filter(id => id !== a.id) });
                                        } else {
                                          setSelectedAnimalIds({ ...selectedAnimalIds, [`${evt.vaccine}_${evt.type}`]: [...current, a.id] });
                                        }
                                      }}
                                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg border transition-all text-[10px] font-bold
                                        ${isConfirmed ? 'bg-emerald-50 border-emerald-100 text-emerald-600 cursor-default' : 
                                          isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 
                                          'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}
                                      `}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={isConfirmed ? 'text-emerald-500' : 'text-indigo-500'}>#{a.brinco}</span>
                                        <span className="truncate">{a.nome}</span>
                                      </div>
                                      {isConfirmed ? (
                                        <span className="text-emerald-500">✓</span>
                                      ) : (
                                        <div className={`w-3 h-3 rounded-sm border ${isSelected ? 'bg-indigo-500 border-indigo-600' : 'border-slate-300'}`}>
                                          {isSelected && <div className="w-full h-full flex items-center justify-center text-[8px] text-white">✓</div>}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botão de Confirmação */}
                    <div className="mt-8">
                      {evt.animals.every(a => confirmedVaccinations.includes(`${selectedDate}_${evt.vaccine}_${evt.type}_sid:${a.id}`)) ? (
                        <div className="w-full py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-black text-center uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-emerald-200">
                          <span className="text-2xl">✅</span> TODOS VACINADOS
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              const allIds = evt.animals.filter(a => !confirmedVaccinations.includes(`${selectedDate}_${evt.vaccine}_${evt.type}_sid:${a.id}`)).map(a => a.id);
                              setSelectedAnimalIds({ ...selectedAnimalIds, [`${evt.vaccine}_${evt.type}`]: allIds });
                            }}
                            className="w-full py-2 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            Selecionar todos os pendentes
                          </button>
                          <button
                            onClick={() => handleConfirm(selectedDate!, evt.vaccine, evt.type, selectedAnimalIds[`${evt.vaccine}_${evt.type}`] || [])}
                            disabled={isConfirming || !(selectedAnimalIds[`${evt.vaccine}_${evt.type}`]?.length > 0)}
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center justify-center gap-3 border-b-4 border-indigo-800"
                          >
                            {isConfirming ? (
                              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <span className="text-2xl">💉</span>
                            )}
                            <span className="text-lg">
                              {selectedAnimalIds[`${evt.vaccine}_${evt.type}`]?.length > 0 
                                ? `CONFIRMAR ${selectedAnimalIds[`${evt.vaccine}_${evt.type}`].length} ANIMAIS`
                                : 'SELECIONE OS ANIMAIS'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VacinacaoCalendar;
