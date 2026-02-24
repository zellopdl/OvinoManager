
import React, { useMemo, useState } from 'react';
import { Manejo, Recorrencia, RecorrenciaConfig, StatusManejo } from '../types';
import { addDaysLocal, parseLocalDate, formatBrazilianDate, getLocalDateString } from '../utils';

interface ManejoCalendarProps {
  manejos: Manejo[];
}

interface ProjectedManejo extends Manejo {
  projectedDate: string;
  isProjection: boolean;
}

const ManejoCalendar: React.FC<ManejoCalendarProps> = ({ manejos }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDayDetail, setSelectedDayDetail] = useState<{ day: number, tasks: ProjectedManejo[] } | null>(null);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const calculateNextDateStr = (currentDateStr: string, recorrencia: Recorrencia, config: RecorrenciaConfig): string | null => {
    // Fix: Updated 'intervaloDiario' to 'intervalo' to match RecorrenciaConfig interface
    if (recorrencia === Recorrencia.DIARIA) return addDaysLocal(currentDateStr, config.intervalo || 1);
    const date = parseLocalDate(currentDateStr);
    if (!date) return null;
    if (recorrencia === Recorrencia.SEMANAL && config.diasSemana?.length) {
      for (let i = 1; i <= 7; i++) {
        const nextS = addDaysLocal(currentDateStr, i);
        const test = parseLocalDate(nextS);
        if (test && config.diasSemana.includes(test.getDay())) return nextS;
      }
    } else if (recorrencia === Recorrencia.MENSAL) {
      // Fix: Updated 'diasMes?.[0]' to 'diaMes' to match RecorrenciaConfig interface
      const dayTarget = config.diaMes || date.getDate();
      for (let i = 1; i <= 12; i++) {
        const nextM = new Date(date.getFullYear(), date.getMonth() + i, dayTarget, 12, 0, 0);
        const nextS = getLocalDateString(nextM);
        if (nextS > currentDateStr) return nextS;
      }
    }
    return null;
  };

  const projections = useMemo(() => {
    const allProjections: ProjectedManejo[] = [];
    const yearStr = selectedYear.toString();
    const todayStr = getLocalDateString();
    manejos.forEach(m => {
      if (m.status === StatusManejo.CONCLUIDO) {
        const dateOccurred = (m.dataExecucao || m.dataPlanejada).split('T')[0];
        if (dateOccurred.startsWith(yearStr)) allProjections.push({ ...m, projectedDate: dateOccurred, isProjection: false });
        return; 
      }
      let currentStr = m.dataPlanejada.split('T')[0];
      if (currentStr.startsWith(yearStr)) allProjections.push({ ...m, projectedDate: currentStr, isProjection: false });
      if (m.recorrencia !== Recorrencia.NENHUMA) {
        let iterations = 0;
        let nextStr = calculateNextDateStr(currentStr, m.recorrencia, m.recorrenciaConfig || {});
        while (nextStr && nextStr.startsWith(yearStr) && iterations < 365) {
          if (nextStr >= todayStr) allProjections.push({ ...m, projectedDate: nextStr, isProjection: true });
          nextStr = calculateNextDateStr(nextStr, m.recorrencia, m.recorrenciaConfig || {});
          iterations++;
        }
      }
    });
    return allProjections.sort((a, b) => a.projectedDate.localeCompare(b.projectedDate));
  }, [manejos, selectedYear]);

  const monthStats = useMemo(() => months.map((_, idx) => {
    const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
    const monthProj = projections.filter(p => p.projectedDate.startsWith(monthPrefix));
    return { month: idx, total: monthProj.length };
  }), [projections, selectedYear]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTasks = projections.filter(p => p.projectedDate === dateStr);
      days.push({ day: i, tasks: dayTasks });
    }
    return days;
  }, [selectedMonth, selectedYear, projections]);

  return (
    <div className="flex flex-col space-y-4 h-full max-h-[85vh]">
      {/* Seletor de Meses Ultra Compacto */}
      <div className="bg-white p-3 rounded-[24px] border border-slate-200 shadow-sm shrink-0">
        <div className="flex justify-between items-center mb-3 px-2">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Agenda {selectedYear}</h2>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-1 px-2 hover:bg-white rounded-lg text-[10px] transition-all">◀</button>
            <span className="px-2 text-slate-800 font-black text-[10px]">{selectedYear}</span>
            <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-1 px-2 hover:bg-white rounded-lg text-[10px] transition-all">▶</button>
          </div>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
          {monthStats.map((s, i) => (
            <button 
              key={i} 
              onClick={() => setSelectedMonth(i)} 
              className={`py-1.5 rounded-lg border transition-all text-center ${
                selectedMonth === i ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200'
              }`}
            >
              <p className="text-[7px] font-black uppercase leading-none">{months[i].slice(0, 3)}</p>
              <p className="text-[9px] font-black mt-0.5">{s.total}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Dias com Elevador Independente */}
      <div className="flex-1 bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
        <div className="grid grid-cols-7 gap-1 p-4 bg-slate-50 border-b border-slate-100 shrink-0">
          {dayLabels.map(label => (
            <div key={label} className="text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white">
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((d, i) => d ? (
              <div 
                key={i} 
                onClick={() => d.tasks.length > 0 && setSelectedDayDetail(d)} 
                className={`min-h-[80px] md:min-h-[120px] p-2 rounded-xl border transition-all ${
                  d.tasks.length > 0 ? 'bg-white border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300' : 'bg-slate-50/50 border-transparent opacity-20'
                }`}
              >
                <span className={`text-[10px] font-black ${d.tasks.length > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{d.day}</span>
                <div className="mt-1 space-y-1">
                  {d.tasks.slice(0, 2).map((t, idx) => (
                    <div key={idx} className={`px-1 py-0.5 rounded border truncate text-[6px] font-black uppercase ${
                      t.status === StatusManejo.CONCLUIDO ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>{t.titulo}</div>
                  ))}
                  {d.tasks.length > 2 && <div className="text-[6px] font-black text-indigo-400 uppercase pl-1">+ {d.tasks.length - 2}</div>}
                </div>
              </div>
            ) : <div key={i} className="min-h-[80px]"></div>)}
          </div>
        </div>
      </div>

      {/* Modal Detalhes */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-lg font-black uppercase">{selectedDayDetail.day} de {months[selectedMonth]}</h3>
              <button onClick={() => setSelectedDayDetail(null)} className="text-white opacity-50 hover:opacity-100">✕</button>
            </div>
            <div className="p-6 space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {selectedDayDetail.tasks.map((task, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <h4 className="font-black uppercase text-[10px] text-slate-800">{task.titulo}</h4>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-widest">{task.status}</p>
                </div>
              ))}
            </div>
            <div className="p-6"><button onClick={() => setSelectedDayDetail(null)} className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase">Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManejoCalendar;
