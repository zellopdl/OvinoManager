
import React, { useMemo, useState } from 'react';
import { Manejo, StatusManejo, Recorrencia, RecorrenciaConfig } from '../../types';
import { getLocalDateString, addDaysLocal, parseLocalDate, formatBrazilianDate } from '../../utils';

interface ManejoCalendarProps {
  manejos: Manejo[];
  onEdit?: (task: Manejo) => void;
  onDelete?: (task: Manejo) => void;
  onComplete?: (task: Manejo) => void;
}

const ManejoCalendar: React.FC<ManejoCalendarProps> = ({ manejos, onEdit, onDelete, onComplete }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const today = getLocalDateString();

  const projections = useMemo(() => {
    const list: any[] = [];
    // 1. Adiciona todas as tarefas REAIS primeiro
    manejos.forEach(m => {
      const baseDate = m.dataPlanejada.split('T')[0];
      list.push({ ...m, date: baseDate, isProj: false });
    });
    
    // 2. Identifica a última ocorrência de cada tarefa recorrente para projetar a partir dela
    const latestRecurring = new Map<string, Manejo>();
    manejos.forEach(m => {
      if (m.recorrencia === Recorrencia.NENHUMA) return;
      const key = `${m.titulo}-${m.grupoId || 'sem-grupo'}`;
      const existing = latestRecurring.get(key);
      if (!existing || m.dataPlanejada > existing.dataPlanejada) {
        latestRecurring.set(key, m);
      }
    });

    // 3. Gera projeções apenas a partir da última ocorrência, evitando duplicatas
    latestRecurring.forEach(m => {
      const config: RecorrenciaConfig = m.recorrenciaConfig || {};
      let current = m.dataPlanejada.split('T')[0];
      const horizon = addDaysLocal(today, 90);
      const maxOccurrences = config.limiteRepeticoes || 1000;
      
      for (let i = 1; i <= maxOccurrences; i++) {
        let next = '';
        if (m.recorrencia === Recorrencia.DIARIA) {
          next = addDaysLocal(current, config.intervalo || 1);
        } else if (m.recorrencia === Recorrencia.SEMANAL) {
          let tempDate = parseLocalDate(current);
          if (tempDate) {
            for (let d = 1; d <= 14; d++) {
              let check = new Date(tempDate);
              check.setDate(check.getDate() + d);
              if ((config.diasSemana || []).includes(check.getDay())) {
                next = getLocalDateString(check);
                break;
              }
            }
          }
        } else if (m.recorrencia === Recorrencia.MENSAL) {
          let tempDate = parseLocalDate(current);
          if (tempDate) {
            tempDate.setMonth(tempDate.getMonth() + 1);
            if (config.diaMes) tempDate.setDate(config.diaMes);
            next = getLocalDateString(tempDate);
          }
        } else if (m.recorrencia === Recorrencia.ANUAL) {
          let tempDate = parseLocalDate(current);
          if (tempDate) {
            tempDate.setFullYear(tempDate.getFullYear() + 1);
            next = getLocalDateString(tempDate);
          }
        }

        if (next && next <= horizon) {
          // Verifica se já existe uma tarefa REAL para este mesmo título/grupo nesta data
          const alreadyExists = manejos.some(real => 
            real.titulo === m.titulo && 
            (real.grupoId === m.grupoId) && 
            real.dataPlanejada.split('T')[0] === next
          );

          if (!alreadyExists) {
            list.push({ ...m, date: next, dataPlanejada: next, isProj: true, status: StatusManejo.PENDENTE });
          }
          current = next;
        } else {
          break;
        }
      }
    });
    return list;
  }, [manejos, today]);

  const calendarGrid = useMemo(() => {
    const first = new Date(selectedYear, selectedMonth, 1).getDay();
    const last = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < first; i++) grid.push(null);
    for (let i = 1; i <= last; i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      grid.push({ day: i, date: dateStr, tasks: projections.filter(p => p.date === dateStr) });
    }
    return grid;
  }, [selectedMonth, selectedYear, projections]);

  const tasksForSelectedDay = useMemo(() => {
    return projections.filter(p => p.date === selectedDate);
  }, [projections, selectedDate]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else setSelectedMonth(selectedMonth - 1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else setSelectedMonth(selectedMonth + 1);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 md:bg-white rounded-[32px] overflow-hidden">
      {/* HEADER COMPACTO */}
      <div className="bg-white p-4 md:p-6 border-b flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all">◀</button>
             <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all">▶</button>
          </div>
          <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">
            {months[selectedMonth]} <span className="text-indigo-600">{selectedYear}</span>
          </h3>
        </div>
        <button onClick={() => setSelectedDate(today)} className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg active:scale-95 transition-all">Ir para Hoje</button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* CALENDÁRIO GRID */}
        <div className="w-full md:w-[450px] p-4 md:p-6 bg-white border-r border-slate-100 shrink-0">
          <div className="grid grid-cols-7 mb-2">
            {dayLabels.map(l => <div key={l} className="text-center text-[10px] font-black text-slate-400 py-2">{l}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarGrid.map((d, i) => d ? (
              <button 
                key={i} 
                onClick={() => setSelectedDate(d.date)}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all border
                  ${selectedDate === d.date ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 z-10' : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'}
                  ${d.date === today && selectedDate !== d.date ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
                `}
              >
                <span className="text-xs font-black">{d.day}</span>
                {d.tasks.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {d.tasks.slice(0, 3).map((t, idx) => (
                      <div key={idx} className={`w-1 h-1 rounded-full ${t.status === StatusManejo.CONCLUIDO ? 'bg-emerald-400' : t.date < today ? 'bg-rose-400' : 'bg-amber-400'}`} />
                    ))}
                  </div>
                )}
              </button>
            ) : <div key={i} className="aspect-square" />)}
          </div>

          {/* Legenda Mobile */}
          <div className="flex justify-around mt-6 pt-6 border-t border-slate-50">
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-[8px] font-black text-slate-400 uppercase">Realizado</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-rose-500 rounded-full"></div><span className="text-[8px] font-black text-slate-400 uppercase">Atrasado</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-amber-500 rounded-full"></div><span className="text-[8px] font-black text-slate-400 uppercase">Pendente</span></div>
          </div>
        </div>

        {/* AGENDA DO DIA (FOCO MOBILE) */}
        <div className="flex-1 bg-slate-50 md:bg-white overflow-y-auto custom-scrollbar p-5 md:p-8">
           <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Agenda: {formatBrazilianDate(selectedDate)}</h4>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-black">{tasksForSelectedDay.length} TAREFAS</span>
           </div>

           <div className="space-y-3 pb-20 md:pb-0">
              {tasksForSelectedDay.map((t, idx) => (
                <div key={idx} className={`p-4 rounded-3xl border-2 flex items-center gap-4 transition-all ${t.status === StatusManejo.CONCLUIDO ? 'bg-white border-emerald-50' : t.date < today ? 'bg-white border-rose-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${t.status === StatusManejo.CONCLUIDO ? 'bg-emerald-50 text-emerald-600' : t.date < today ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {t.status === StatusManejo.CONCLUIDO ? '✓' : t.date < today ? '⚠️' : '📋'}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-xs uppercase text-slate-800 truncate">{t.titulo}</p>
                        {t.status === StatusManejo.CONCLUIDO && t.observacoes && (
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Observação do Operador"></span>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                         {t.isProj ? '📌 Projeção Automática' : `🕒 ${t.horaPlanejada || '08:00'}h`}
                      </p>
                   </div>
                   
                   <div className="flex items-center gap-2">
                      {t.status !== StatusManejo.CONCLUIDO ? (
                        <>
                          <button 
                            onClick={() => onEdit?.(t)}
                            className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-[10px] hover:bg-indigo-50 hover:text-indigo-600 shadow-sm"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => onDelete?.(t)}
                            className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-[10px] hover:bg-rose-50 hover:text-rose-600 shadow-sm"
                            title="Excluir"
                          >
                            🗑️
                          </button>
                          <button 
                            onClick={() => onComplete?.(t)}
                            className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs shadow-sm active:scale-95"
                            title="Concluir"
                          >
                            ✓
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg uppercase">Realizado</span>
                           <button 
                            onClick={() => onEdit?.(t)}
                            className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-[10px] hover:bg-indigo-50 hover:text-indigo-600 shadow-sm"
                            title="Editar"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                   </div>
                </div>
              ))}
              {tasksForSelectedDay.length === 0 && (
                <div className="py-20 text-center">
                   <p className="text-4xl mb-4 opacity-20">🍃</p>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma tarefa agendada</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ManejoCalendar;
