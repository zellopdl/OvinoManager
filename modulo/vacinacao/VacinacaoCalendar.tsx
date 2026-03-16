import React, { useState, useMemo, useEffect } from 'react';
import { Sheep, Group, BreedingPlan } from '../../types';
import { VacinacaoConfig } from './VacinacaoManager';
import { vacinacaoService } from './vacinacaoService';

interface Props {
  sheep: Sheep[];
  groups: Group[];
  plans: BreedingPlan[];
  config: VacinacaoConfig;
}

interface VacinacaoEvent {
  type: 'cordeiro' | 'quarentena' | 'pre-monta' | 'prenha' | 'anual';
  title: string;
  vaccine: string;
  animals: Sheep[];
}

const VacinacaoCalendar: React.FC<Props> = ({ sheep, groups, plans, config }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmedVaccinations, setConfirmedVaccinations] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const loadConfirmed = async () => {
      const confirmed = await vacinacaoService.getConfirmedVaccinations();
      setConfirmedVaccinations(confirmed);
    };
    loadConfirmed();
  }, []);

  const handleConfirm = async (date: string, vaccine: string, type: string) => {
    try {
      setIsConfirming(true);
      await vacinacaoService.confirmVaccination(date, vaccine, type);
      setConfirmedVaccinations(prev => [...prev, `${date}_${vaccine}_${type}`]);
    } catch (err) {
      console.error("Erro ao confirmar vacinação:", err);
    } finally {
      setIsConfirming(false);
    }
  };

  const events = useMemo(() => {
    const evts: Record<string, VacinacaoEvent[]> = {};

    const addEvt = (dateStr: string, type: VacinacaoEvent['type'], title: string, vaccine: string, animal: Sheep) => {
      if (!evts[dateStr]) evts[dateStr] = [];
      let existing = evts[dateStr].find(e => e.title === title);
      if (!existing) {
        existing = { type, title, vaccine, animals: [] };
        evts[dateStr].push(existing);
      }
      existing.animals.push(animal);
    };

    const addDays = (dateStr: string, days: number) => {
      const d = new Date(dateStr + 'T12:00:00Z');
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    // 1. Cordeiros
    sheep.forEach(s => {
      if (s.nascimento) {
        addEvt(addDays(s.nascimento, 40), 'cordeiro', '1ª Dose Clostridiose (Cordeiros)', `Clostridiose (${config.tipoClostridiose} cepas)`, s);
        addEvt(addDays(s.nascimento, 70), 'cordeiro', 'Reforço Clostridiose (Cordeiros)', `Clostridiose (${config.tipoClostridiose} cepas)`, s);
        if (config.hasEctima) {
          addEvt(addDays(s.nascimento, 15), 'cordeiro', 'Vacina Ectima Contagioso', 'Ectima', s);
        }
        if (config.outrasVacinas) {
          addEvt(addDays(s.nascimento, 90), 'cordeiro', '1ª Dose Outras Vacinas', config.outrasVacinas, s);
          addEvt(addDays(s.nascimento, 120), 'cordeiro', '2ª Dose Outras Vacinas', config.outrasVacinas, s);
        }
      }
    });

    // 2. Quarentena
    const quarentenaGroup = groups.find(g => g.nome.toLowerCase().includes('quarentena'));
    if (quarentenaGroup) {
      sheep.filter(s => s.grupoId === quarentenaGroup.id).forEach(s => {
        const d0 = s.createdAt ? s.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
        addEvt(d0, 'quarentena', 'Protocolo Entrada (Dia 0)', 'Vermífugo + Clostridiose', s);
        addEvt(addDays(d0, 30), 'quarentena', 'Protocolo Entrada (Dia 30)', 'Reforço Clostridiose', s);
      });
    }

    // 3. Pré-Monta & Prenhas
    plans.forEach(p => {
      if (p.dataInicioMonta) {
        const dPre = addDays(p.dataInicioMonta, -15);
        const planSheepIds = p.ovelhas?.map(o => o.eweId) || [];
        sheep.filter(s => planSheepIds.includes(s.id)).forEach(s => {
          addEvt(dPre, 'pre-monta', `Pré-Monta: ${p.nome}`, `Clostridiose + Reprodutivas`, s);
        });

        // Prenhas (Estimativa 100 dias após cobertura média)
        const prenhasIds = p.ovelhas?.filter(o => o.ciclo1 === 'prenha' || o.ciclo2 === 'prenha' || o.ciclo3 === 'prenha').map(o => o.eweId) || [];
        sheep.filter(s => prenhasIds.includes(s.id)).forEach(s => {
          const d100 = addDays(p.dataInicioMonta, 115); // 15 dias de cio + 100 de gestação
          addEvt(d100, 'prenha', `Gestantes (100 dias)`, `Clostridiose (${config.tipoClostridiose} cepas)`, s);
        });
      }
    });

    return evts;
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
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-100 shrink-0">
        <h3 className="text-base md:text-lg font-black text-slate-800 uppercase">Calendário Sanitário</h3>
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

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`rounded-lg md:rounded-xl border flex flex-col items-center justify-start p-1 transition-all relative overflow-hidden group h-full
                  ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-sm z-10' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
                  ${isToday && !isSelected ? 'bg-indigo-50/50 border-indigo-200' : ''}
                `}
              >
                <span className={`text-[10px] md:text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-slate-600'}`}>
                  {day}
                </span>
                
                {/* Event Indicators */}
                <div className="flex flex-wrap justify-center gap-0.5 mt-auto w-full pb-0.5">
                  {dayEvents.map((evt, idx) => (
                    <div 
                      key={idx} 
                      className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${getTypeColor(evt.type)}`}
                      title={evt.title}
                    ></div>
                  ))}
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
                      <span className="block text-xs font-black text-slate-400 uppercase mb-3">Animais Alvo (Por Grupo)</span>
                      <div className="space-y-4">
                        {Object.entries(
                          evt.animals.reduce((acc, animal) => {
                            const groupId = animal.grupoId || 'sem-grupo';
                            if (!acc[groupId]) acc[groupId] = [];
                            acc[groupId].push(animal);
                            return acc;
                          }, {} as Record<string, typeof evt.animals>)
                        ).map(([groupId, animalsInGroup]) => {
                          const groupName = groups.find(g => g.id === groupId)?.nome || 'Sem Grupo';
                          return (
                            <div key={groupId} className="space-y-2">
                              <h5 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-1">
                                📍 {groupName} <span className="text-slate-400 text-xs font-medium">({animalsInGroup.length} cabeças)</span>
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {animalsInGroup.map(a => (
                                  <span key={a.id} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                                    {a.brinco} - {a.nome}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botão de Confirmação */}
                    <div className="mt-4 flex justify-end">
                      {confirmedVaccinations.includes(`${selectedDate}_${evt.vaccine}_${evt.type}`) ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Vacinação Confirmada
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirm(selectedDate, evt.vaccine, evt.type)}
                          disabled={isConfirming}
                          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                          {isConfirming ? 'Confirmando...' : 'Confirmar Vacinação'}
                        </button>
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
