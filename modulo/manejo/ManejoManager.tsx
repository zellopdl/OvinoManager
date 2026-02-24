
import React, { useState, useEffect, useMemo } from 'react';
import { Manejo, Sheep, Paddock, Group, StatusManejo, TipoManejo, Recorrencia, RecorrenciaConfig } from '../../types';
import { manejoService } from './manejoService.ts';
import { getLocalDateString, formatBrazilianDate } from '../../utils';
import ManejoCalendar from './ManejoCalendar.tsx';

interface ManejoManagerProps {
  sheep: Sheep[];
  paddocks: Paddock[];
  groups: Group[];
  onRefreshSheep: () => void;
  managerPassword?: string;
}

const ManejoManager: React.FC<ManejoManagerProps> = ({ sheep, paddocks, groups, onRefreshSheep, managerPassword }) => {
  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<Manejo | null>(null);
  const [viewingTask, setViewingTask] = useState<Manejo | null>(null);
  const [editingTask, setEditingTask] = useState<Manejo | null>(null);
  
  const [authModal, setAuthModal] = useState<{ type: 'edit' | 'delete', task: Manejo } | null>(null);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [executor, setExecutor] = useState('');
  const [notes, setNotes] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [openSections, setOpenSections] = useState({ urgent: true, today: true, done: false });

  const [formManejo, setFormManejo] = useState({
    titulo: '',
    procedimento: '', // Instruções do Gerente
    tipo: TipoManejo.RECORRENTE,
    recorrencia: Recorrencia.NENHUMA,
    dataPlanejada: getLocalDateString(),
    horaPlanejada: '08:00',
    grupoId: '',
    config: {
      intervalo: 1,
      diasSemana: [] as number[],
      diaMes: 1,
      mesAnual: 0,
      limiteRepeticoes: null as number | null
    }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await manejoService.getAll();
      setManejos(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const today = getLocalDateString();
  const urgentTasks = useMemo(() => manejos.filter(m => m.status === StatusManejo.PENDENTE && m.dataPlanejada.split('T')[0] < today), [manejos, today]);
  const todayTasks = useMemo(() => manejos.filter(m => m.status === StatusManejo.PENDENTE && m.dataPlanejada.split('T')[0] === today), [manejos, today]);
  const doneTodayTasks = useMemo(() => manejos.filter(m => m.status === StatusManejo.CONCLUIDO && m.dataExecucao && m.dataExecucao.split('T')[0] === today), [manejos, today]);

  const toggleSection = (section: 'urgent' | 'today' | 'done') => setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));

  const handleVerifyAuth = () => {
    const masterPass = managerPassword || localStorage.getItem('ovi_manager_pwd') || '1234';
    if (passInput === masterPass) {
      const { type, task } = authModal!;
      if (type === 'delete') {
        processDelete(task.id);
      } else {
        setEditingTask(task);
        setFormManejo({
          titulo: task.titulo,
          procedimento: task.procedimento || '',
          tipo: task.tipo,
          recorrencia: task.recorrencia,
          dataPlanejada: task.dataPlanejada.split('T')[0],
          horaPlanejada: task.horaPlanejada || '08:00',
          grupoId: task.grupoId || '',
          config: {
            intervalo: task.recorrenciaConfig?.intervalo || 1,
            diasSemana: task.recorrenciaConfig?.diasSemana || [],
            diaMes: task.recorrenciaConfig?.diaMes || 1,
            mesAnual: task.recorrenciaConfig?.mesAnual || 0,
            limiteRepeticoes: task.recorrenciaConfig?.limiteRepeticoes || null
          }
        });
      }
      setAuthModal(null);
      setPassInput('');
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 1000);
    }
  };

  const processDelete = async (id: string) => {
    try { await manejoService.delete(id); await loadData(); } catch (e) { alert("Erro ao excluir."); }
  };

  const toggleDay = (day: number) => {
    setFormManejo(prev => {
      const currentDays = prev.config.diasSemana;
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      return { ...prev, config: { ...prev.config, diasSemana: newDays } };
    });
  };

  const handleSaveManejo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        titulo: formManejo.titulo,
        procedimento: formManejo.procedimento,
        tipo: formManejo.tipo,
        recorrencia: formManejo.recorrencia,
        dataPlanejada: formManejo.dataPlanejada,
        horaPlanejada: formManejo.horaPlanejada,
        grupoId: formManejo.grupoId,
        recorrenciaConfig: formManejo.config
      };

      if (editingTask) {
        await manejoService.update(editingTask.id, payload);
      } else {
        await manejoService.create(payload, []);
      }
      setIsFormOpen(false);
      setEditingTask(null);
      await loadData();
    } catch (e) { alert("Erro ao processar."); }
  };

  const handleComplete = async () => {
    if (!completingTask || !executor.trim()) return;
    try {
      await manejoService.completeTask(completingTask, executor, notes);
      setCompletingTask(null);
      setExecutor('');
      setNotes('');
      await loadData();
      onRefreshSheep();
    } catch (e) { alert("Erro ao concluir."); }
  };

  const renderTaskCard = (task: Manejo, mode: 'urgent' | 'pending' | 'done') => {
    const isUrgent = mode === 'urgent';
    const isDone = mode === 'done';
    return (
      <div key={task.id} className={`bg-white p-5 rounded-[24px] border-2 flex flex-col group transition-all shadow-sm ${isDone ? 'border-emerald-100' : isUrgent ? 'border-rose-100 hover:border-rose-400' : 'border-slate-100 hover:border-indigo-400'}`}>
        <div className="flex justify-between items-start mb-2">
           <div className="flex gap-1 items-center">
              {task.editadoPorGerente && <span className="bg-slate-900 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Auditado</span>}
              {isDone && <span className="bg-emerald-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Realizado</span>}
           </div>
           <div className="flex gap-1.5 transition-opacity">
              <button onClick={() => setAuthModal({ type: 'edit', task })} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-[10px] hover:bg-indigo-50 hover:text-indigo-600 shadow-sm">✏️</button>
              <button onClick={() => setAuthModal({ type: 'delete', task })} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-[10px] hover:bg-rose-50 hover:text-rose-600 shadow-sm">🗑️</button>
           </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex-1 cursor-pointer" onClick={() => isDone ? setViewingTask(task) : setCompletingTask(task)}>
            <h4 className={`font-black uppercase text-xs ${isDone ? 'text-emerald-800' : 'text-slate-800'}`}>{task.titulo}</h4>
            <p className={`text-[9px] font-bold uppercase mt-0.5 ${isUrgent ? 'text-rose-500' : 'text-slate-400'}`}>{isDone ? `Por: ${task.colaborador}` : isUrgent ? `Desde: ${formatBrazilianDate(task.dataPlanejada)}` : `Hoje às ${task.horaPlanejada}h`}</p>
          </div>
          {!isDone ? (
            <button onClick={() => setCompletingTask(task)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg active:scale-95 transition-all ${isUrgent ? 'bg-rose-600 text-white shadow-rose-100' : 'bg-indigo-600 text-white shadow-indigo-100'}`}>✓</button>
          ) : (
            <button onClick={() => setViewingTask(task)} className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-sm shadow-sm active:scale-95">ℹ️</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Painel de Operações</h2><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Gestão Completa e Auditoria de Campo</p></div>
        <button onClick={() => { setEditingTask(null); setIsFormOpen(true); }} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg active:scale-95 transition-all">Agendar Manejo</button>
      </div>

      <div className="space-y-4">
        {/* SEÇÃO 1: ATRASADAS */}
        <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
          <button onClick={() => toggleSection('urgent')} className={`w-full p-6 flex justify-between items-center ${urgentTasks.length > 0 ? 'bg-rose-50/30' : 'bg-white'}`}>
            <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${urgentTasks.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>⚠️</div><h3 className={`text-sm font-black uppercase ${urgentTasks.length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Atrasados</h3></div>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${urgentTasks.length > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{urgentTasks.length}</span>
          </button>
          {openSections.urgent && <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-4">{urgentTasks.map(t => renderTaskCard(t, 'urgent'))}</div>}
        </div>
        
        {/* SEÇÃO 2: HOJE */}
        <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
          <button onClick={() => toggleSection('today')} className={`w-full p-6 flex justify-between items-center ${todayTasks.length > 0 ? 'bg-indigo-50/30' : 'bg-white'}`}>
            <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${todayTasks.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>📅</div><h3 className={`text-sm font-black uppercase ${todayTasks.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>Hoje</h3></div>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${todayTasks.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{todayTasks.length}</span>
          </button>
          {openSections.today && <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-4">{todayTasks.map(t => renderTaskCard(t, 'pending'))}</div>}
        </div>

        {/* SEÇÃO 3: FEITO HOJE */}
        <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
          <button onClick={() => toggleSection('done')} className={`w-full p-6 flex justify-between items-center ${doneTodayTasks.length > 0 ? 'bg-emerald-50/30' : 'bg-white'}`}>
            <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${doneTodayTasks.length > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>✅</div><h3 className={`text-sm font-black uppercase ${doneTodayTasks.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>Concluído Hoje</h3></div>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${doneTodayTasks.length > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{doneTodayTasks.length}</span>
          </button>
          {openSections.done && <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-4">{doneTodayTasks.map(t => renderTaskCard(t, 'done'))}</div>}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <ManejoCalendar 
          manejos={manejos} 
          onEdit={(t) => setAuthModal({ type: 'edit', task: t })}
          onDelete={(t) => setAuthModal({ type: 'delete', task: t })}
          onComplete={(t) => setCompletingTask(t)}
        />
      </div>

      {/* MODAL REGISTRAR EXECUÇÃO (OPERADOR) */}
      {completingTask && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              <div className="text-center mb-8 shrink-0">
                 <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm">👷‍♂️</div>
                 <h3 className="text-xl font-black text-slate-800 uppercase leading-tight">Finalizar Atividade</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{completingTask.titulo}</p>
              </div>

              <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-2">
                 {completingTask.procedimento && (
                    <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                       <p className="text-[9px] font-black text-amber-600 uppercase mb-2 ml-1">Instruções do Gerente:</p>
                       <p className="text-sm font-bold text-amber-800 italic leading-relaxed">"{completingTask.procedimento}"</p>
                    </div>
                 )}

                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Quem executou? *</label>
                    <input autoFocus className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm uppercase outline-none focus:border-emerald-500 shadow-inner" value={executor} onChange={e => setExecutor(e.target.value)} placeholder="NOME DO COLABORADOR" />
                 </div>
                 
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Notas de Execução / Relato de Campo</label>
                    <textarea className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-medium text-sm outline-none focus:border-emerald-500 resize-none shadow-inner" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ocorreu algum imprevisto? Algum animal precisou de atenção especial?" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10 shrink-0">
                 <button onClick={() => { setCompletingTask(null); setExecutor(''); setNotes(''); }} className="py-4 text-slate-400 font-black uppercase text-[10px] hover:text-slate-600">Descartar</button>
                 <button onClick={handleComplete} disabled={!executor.trim()} className="py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-30 transition-all">Confirmar Realização</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL VER DETALHES (RELATÓRIO DE MANEJO) */}
      {viewingTask && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="p-8 bg-emerald-600 text-white">
                 <div className="flex justify-between items-start">
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tight">Relatório de Manejo</h3>
                       <p className="text-[10px] font-bold uppercase opacity-80 mt-1">ID: {viewingTask.id.split('-')[0]}</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl text-xs font-black">✓ CONCLUÍDO</div>
                 </div>
              </div>
              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Atividade</p>
                    <p className="font-black text-slate-800 uppercase text-lg">{viewingTask.titulo}</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Executado por</p>
                       <p className="text-xs font-black text-slate-700 uppercase">{viewingTask.colaborador}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Data/Hora</p>
                       <p className="text-xs font-black text-slate-700">{viewingTask.dataExecucao ? new Date(viewingTask.dataExecucao).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div>
                       <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Orientação do Gerente
                       </p>
                       <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-[28px] text-sm text-slate-700 font-medium italic">
                          {viewingTask.procedimento || "Nenhuma orientação específica cadastrada."}
                       </div>
                    </div>

                    <div>
                       <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Relato do Operador
                       </p>
                       <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-[28px] text-sm text-slate-800 font-bold leading-relaxed">
                          {viewingTask.observacoes || "Nenhuma anotação de campo inserida."}
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-slate-50 border-t flex justify-end">
                 <button onClick={() => setViewingTask(null)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-black active:scale-95 transition-all">Fechar Relatório</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL FORMULÁRIO (GERENTE) */}
      {(isFormOpen || editingTask) && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[40px] p-10 shadow-2xl my-10 animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{editingTask ? 'Editar Planejamento' : 'Novo Agendamento'}</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração de Manejo e Recorrência</p>
                </div>
                <button onClick={() => { setIsFormOpen(false); setEditingTask(null); }} className="w-10 h-10 bg-slate-50 rounded-full text-slate-400 flex items-center justify-center">✕</button>
             </div>

             <form onSubmit={handleSaveManejo} className="space-y-8">
                <div className="space-y-4">
                   <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Título da Atividade *</label>
                      <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-sm focus:border-indigo-500 outline-none transition-all" value={formManejo.titulo} onChange={e => setFormManejo({...formManejo, titulo: e.target.value.toUpperCase()})} placeholder="EX: VACINAÇÃO CLOSTRIDIOSE" />
                   </div>

                   <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Orientações / Instruções Técnicas (Para o Operador)</label>
                      <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none" rows={3} value={formManejo.procedimento} onChange={e => setFormManejo({...formManejo, procedimento: e.target.value})} placeholder="Ex: Utilizar agulha 10x10, aplicar via subcutânea na tábua do pescoço..." />
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Data Início</label>
                      <input type="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={formManejo.dataPlanejada} onChange={e => setFormManejo({...formManejo, dataPlanejada: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Horário</label>
                      <input type="time" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={formManejo.horaPlanejada} onChange={e => setFormManejo({...formManejo, horaPlanejada: e.target.value})} />
                   </div>
                </div>

                <div className="p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100 space-y-5">
                  <div>
                    <label className="block text-[9px] font-black text-indigo-600 uppercase mb-3 ml-1">Padrão de Repetição</label>
                    <select className="w-full p-4 bg-white border border-indigo-200 rounded-2xl font-black text-xs uppercase" value={formManejo.recorrencia} onChange={e => setFormManejo({...formManejo, recorrencia: e.target.value as Recorrencia})}>
                        <option value={Recorrencia.NENHUMA}>Evento Único</option>
                        <option value={Recorrencia.DIARIA}>Repetir Diariamente</option>
                        <option value={Recorrencia.SEMANAL}>Repetir Semanalmente</option>
                        <option value={Recorrencia.MENSAL}>Repetir Mensalmente</option>
                        <option value={Recorrencia.ANUAL}>Repetir Anualmente</option>
                    </select>
                  </div>

                  {formManejo.recorrencia === Recorrencia.DIARIA && (
                    <div className="animate-in slide-in-from-top-2">
                       <label className="block text-[9px] font-black text-indigo-400 uppercase mb-2 ml-1">Intervalo de Dias (Ex: 2 = dia sim, dia não)</label>
                       <input type="number" min="1" className="w-full p-4 bg-white border rounded-2xl font-black text-sm" value={formManejo.config.intervalo} onChange={e => setFormManejo({...formManejo, config: {...formManejo.config, intervalo: parseInt(e.target.value)}})} />
                    </div>
                  )}

                  {formManejo.recorrencia === Recorrencia.SEMANAL && (
                    <div className="animate-in slide-in-from-top-2">
                       <label className="block text-[9px] font-black text-indigo-400 uppercase mb-3 ml-1">Escolha os Dias da Semana</label>
                       <div className="flex flex-wrap gap-2">
                          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((name, i) => (
                            <button key={i} type="button" onClick={() => toggleDay(i)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${formManejo.config.diasSemana.includes(i) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-400 border-indigo-100'}`}>{name}</button>
                          ))}
                       </div>
                    </div>
                  )}

                  {formManejo.recorrencia !== Recorrencia.NENHUMA && (
                    <div className="pt-4 border-t border-indigo-100">
                       <label className="block text-[9px] font-black text-indigo-400 uppercase mb-3 ml-1">Duração da Programação</label>
                       <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setFormManejo({...formManejo, config: {...formManejo.config, limiteRepeticoes: null}})} className={`py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${formManejo.config.limiteRepeticoes === null ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-indigo-100'}`}>Até ser Concluído</button>
                          <div className={`flex items-center gap-2 bg-white border p-1 rounded-xl transition-all ${formManejo.config.limiteRepeticoes !== null ? 'border-indigo-600' : 'border-indigo-100'}`}>
                             <input type="number" placeholder="nº" className="flex-1 p-2 text-center font-black text-indigo-600 outline-none" value={formManejo.config.limiteRepeticoes || ''} onChange={e => setFormManejo({...formManejo, config: {...formManejo.config, limiteRepeticoes: parseInt(e.target.value)}})} />
                             <span className="text-[8px] font-black text-slate-300 uppercase pr-3">Vezes</span>
                          </div>
                       </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                   <button type="button" onClick={() => { setIsFormOpen(false); setEditingTask(null); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-[11px] hover:text-slate-600">Cancelar</button>
                   <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-xl shadow-indigo-100 active:scale-95 transition-all">Confirmar Agenda</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* MODAL SENHA GERENTE */}
      {authModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-sm">
           <div className={`bg-white w-full max-w-sm rounded-[32px] p-10 shadow-2xl border-2 transition-all ${passError ? 'border-rose-500 animate-shake' : 'border-slate-100'}`}>
              <div className="text-center mb-8"><div className="w-16 h-16 bg-slate-100 text-slate-800 rounded-3xl flex items-center justify-center text-2xl mx-auto mb-4">🔐</div><h3 className="text-xl font-black text-slate-800 uppercase">Gerência</h3><p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Auditoria Master</p></div>
              <input autoFocus type="password" placeholder="••••" className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-center text-2xl outline-none mb-8 tracking-[0.5em]" value={passInput} onChange={e => setPassInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyAuth()} />
              <div className="flex gap-2">
                 <button onClick={() => { setAuthModal(null); setPassInput(''); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                 <button onClick={handleVerifyAuth} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Desbloquear</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ManejoManager;
