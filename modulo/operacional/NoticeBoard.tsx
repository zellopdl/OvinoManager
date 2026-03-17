
import React, { useState, useEffect, useMemo } from 'react';
import { Manejo, StatusManejo, ProtocoloManejo, Sheep, Group, BreedingPlan, Paddock } from '../../types';
import { manejoService } from '../manejo/manejoService';
import { avisoService, Aviso } from './avisoService';
import { vacinacaoService } from '../vacinacao/vacinacaoService';
import { VacinacaoConfig } from '../vacinacao/VacinacaoManager';
import VacinacaoCalendar from '../vacinacao/VacinacaoCalendar';
import { getLocalDateString, formatBrazilianDate } from '../../utils';
import { supabase } from '../../lib/supabase';

interface NoticeBoardProps {
  onStartProtocol?: (task: Manejo) => void;
  sheep: Sheep[];
  groups: Group[];
  plans: BreedingPlan[];
  paddocks: Paddock[];
}

const NoticeBoard: React.FC<NoticeBoardProps> = ({ onStartProtocol, sheep, groups, plans, paddocks }) => {
  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [vacinacaoConfig, setVacinacaoConfig] = useState<VacinacaoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<Manejo | null>(null);
  const [viewingAviso, setViewingAviso] = useState<Aviso | null>(null);
  const [executor, setExecutor] = useState('');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeView, setActiveView] = useState<'none' | 'mural' | 'tarefas' | 'vacinacao'>('none');

  const hasUrgentUnconfirmed = useMemo(() => 
    avisos.some(a => a.prioridade === 'urgente' && !a.confirmacoes?.some(c => c.user === 'Operador')),
  [avisos]);

  const unreadCount = useMemo(() => 
    avisos.filter(a => !a.confirmacoes?.some(c => c.user === 'Operador')).length,
  [avisos]);

  const today = getLocalDateString();
  
  const activeTasks = useMemo(() => 
    manejos.filter(m => 
      m.status === StatusManejo.PENDENTE && 
      m.dataPlanejada.split('T')[0] <= today
    ).sort((a, b) => a.dataPlanejada.localeCompare(b.dataPlanejada)), 
  [manejos, today]);

  const upcomingVaccinations = useMemo(() => {
    if (!vacinacaoConfig) return [];
    
    const evts: { date: string, title: string, vaccine: string, animals: Sheep[] }[] = [];
    const addDays = (dateStr: string, days: number) => {
      const d = new Date(dateStr + 'T12:00:00Z');
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const addEvt = (dateStr: string, title: string, vaccine: string, animal: Sheep) => {
      let existing = evts.find(e => e.date === dateStr && e.title === title);
      if (!existing) {
        existing = { date: dateStr, title, vaccine, animals: [] };
        evts.push(existing);
      }
      existing.animals.push(animal);
    };

    // 1. Cordeiros
    sheep.forEach(s => {
      if (s.nascimento) {
        addEvt(addDays(s.nascimento, 40), '1ª Dose Clostridiose (Cordeiros)', `Clostridiose (${vacinacaoConfig.tipoClostridiose} cepas)`, s);
        addEvt(addDays(s.nascimento, 70), 'Reforço Clostridiose (Cordeiros)', `Clostridiose (${vacinacaoConfig.tipoClostridiose} cepas)`, s);
        if (vacinacaoConfig.hasEctima) {
          addEvt(addDays(s.nascimento, 15), 'Vacina Ectima Contagioso', 'Ectima', s);
        }
        if (vacinacaoConfig.outrasVacinas) {
          addEvt(addDays(s.nascimento, 90), '1ª Dose Outras Vacinas', vacinacaoConfig.outrasVacinas, s);
          addEvt(addDays(s.nascimento, 120), '2ª Dose Outras Vacinas', vacinacaoConfig.outrasVacinas, s);
        }
      }
    });

    // 2. Quarentena
    const quarentenaGroup = groups.find(g => g.nome.toLowerCase().includes('quarentena'));
    if (quarentenaGroup) {
      sheep.filter(s => s.grupoId === quarentenaGroup.id).forEach(s => {
        const d0 = s.createdAt ? s.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
        addEvt(d0, 'Protocolo Entrada (Dia 0)', 'Vermífugo + Clostridiose', s);
        addEvt(addDays(d0, 30), 'Protocolo Entrada (Dia 30)', 'Reforço Clostridiose', s);
      });
    }

    // 3. Pré-Monta & Prenhas
    plans.forEach(p => {
      if (p.dataInicioMonta) {
        const dPre = addDays(p.dataInicioMonta, -15);
        const planSheepIds = p.ovelhas?.map(o => o.eweId) || [];
        sheep.filter(s => planSheepIds.includes(s.id)).forEach(s => {
          addEvt(dPre, `Pré-Monta: ${p.nome}`, `Clostridiose + Reprodutivas`, s);
        });

        const prenhasIds = p.ovelhas?.filter(o => o.ciclo1 === 'prenha' || o.ciclo2 === 'prenha' || o.ciclo3 === 'prenha').map(o => o.eweId) || [];
        sheep.filter(s => prenhasIds.includes(s.id)).forEach(s => {
          const d100 = addDays(p.dataInicioMonta, 115);
          addEvt(d100, `Gestantes (100 dias)`, `Clostridiose (${vacinacaoConfig.tipoClostridiose} cepas)`, s);
        });
      }
    });

    const nextWeek = addDays(today, 7);
    return evts.filter(e => e.date >= today && e.date <= nextWeek).sort((a, b) => a.date.localeCompare(b.date));
  }, [sheep, groups, plans, vacinacaoConfig, today]);

  useEffect(() => {
    let timeoutId: any;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1353/1353-preview.mp3');
    
    const playCycle = async () => {
      if (!hasUrgentUnconfirmed || !audioEnabled) return;

      for (let i = 0; i < 5; i++) {
        const stillHasUrgent = await avisoService.getAll().then(list => 
          list.some(a => a.prioridade === 'urgente' && !a.confirmacoes?.some(c => c.user === 'Operador'))
        ).catch(() => hasUrgentUnconfirmed);

        if (!stillHasUrgent) break;

        try {
          audio.currentTime = 0;
          await audio.play();
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {
          console.warn("Áudio bloqueado pelo navegador. Toque na tela para ativar.");
          break;
        }
      }

      if (hasUrgentUnconfirmed && audioEnabled) {
        timeoutId = setTimeout(playCycle, 60000);
      }
    };

    if (hasUrgentUnconfirmed && audioEnabled) {
      playCycle();
    }

    return () => {
      clearTimeout(timeoutId);
      audio.pause();
    };
  }, [hasUrgentUnconfirmed, audioEnabled]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [mTasks, aNotices, vConfig] = await Promise.all([
        manejoService.getAll().catch(() => []),
        avisoService.getAll().catch(() => []),
        vacinacaoService.getConfig().catch(() => null)
      ]);
      setManejos(mTasks);
      setAvisos(aNotices);
      setVacinacaoConfig(vConfig);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const mChannel = supabase
      .channel('noticeboard_manejos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manejos' }, () => loadData(true))
      .subscribe();

    const aChannel = supabase
      .channel('noticeboard_avisos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos' }, () => loadData(true))
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(mChannel);
      supabase.removeChannel(aChannel);
    };
  }, []);

  const handleComplete = async () => {
    if (!completingTask || !executor.trim()) return;
    try {
      await manejoService.completeTask(completingTask, executor, notes);
      setCompletingTask(null);
      setExecutor('');
      setNotes('');
      await loadData(true);
    } catch (e) {
      alert("Erro ao concluir tarefa.");
    }
  };

  const handleConfirmAviso = async (avisoId: string) => {
    setAvisos(prev => prev.map(a => {
      if (a.id === avisoId) {
        const currentConf = a.confirmacoes || [];
        return { ...a, confirmacoes: [...currentConf, { user: 'Operador', at: new Date().toISOString() }] };
      }
      return a;
    }));

    try {
      await avisoService.confirmRead(avisoId, 'Operador');
      await loadData(true);
    } catch (e) {
      alert("Erro ao confirmar leitura.");
      await loadData(true);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (supabase && supabase.auth) {
        supabase.auth.signOut().catch(() => {});
      }
      window.location.replace('/');
    } catch (e) {
      window.location.replace('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 border-8 border-slate-800 border-t-emerald-500 rounded-full animate-spin mb-8"></div>
          <p className="text-xl font-black text-emerald-500 uppercase tracking-[0.3em] animate-pulse">Sincronizando Sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen bg-[#05070a] text-slate-100 flex flex-col overflow-hidden font-sans"
      onClick={() => !audioEnabled && setAudioEnabled(true)}
    >
      {/* ALERTA DE ÁUDIO DESATIVADO */}
      {!audioEnabled && hasUrgentUnconfirmed && (
        <div className="fixed top-0 left-0 w-full bg-rose-600 text-white p-2 text-center z-[2000] font-black uppercase text-[10px] animate-pulse">
          Toque em qualquer lugar para ativar o alerta sonoro
        </div>
      )}

      {/* HEADER ESTILO IMAGEM */}
      <header className="bg-[#05070a] p-4 md:p-6 flex justify-between items-center shrink-0 z-50 border-b border-slate-800/30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#10b981] rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-900/20">
            <span className="filter brightness-0 invert">🐑</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight leading-none text-white">Quadro de Avisos</h1>
            <p className="text-[#10b981] text-[10px] md:text-sm font-black uppercase tracking-[0.15em] mt-0.5">Operação de Campo</p>
          </div>
        </div>

        {/* RELÓGIO NO CABEÇALHO */}
        <div className="hidden md:flex flex-col items-center">
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-white tabular-nums leading-none">
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </h2>
          <p className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em]">
            {formatBrazilianDate(today)}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Relógio mobile */}
          <div className="md:hidden flex flex-col items-end mr-2">
            <span className="text-lg font-black text-white tabular-nums leading-none">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-3 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-lg shadow-rose-900/40 active:scale-95 transition-all border border-rose-500/50"
          >
            <span className="hidden sm:inline">SAIR</span>
            <span className="text-lg">🚪</span>
          </button>
        </div>
      </header>

      {/* CONTEÚDO DINÂMICO */}
      <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6 pt-4">
        {activeView === 'none' ? (
          <div className="flex-1 flex flex-col justify-start items-center gap-6 max-w-none mx-auto w-full">
            
            {/* ALERTA DE VACINAÇÃO - MENOR E PULSANTE */}
            {upcomingVaccinations.length > 0 && (
              <div 
                onClick={() => setActiveView('vacinacao')}
                className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">💉</span>
                  <p className="text-amber-500 font-black uppercase tracking-widest text-[10px] md:text-xs">
                    Vacinação à vista: {upcomingVaccinations.length} eventos programados para os próximos 7 dias. <span className="hidden sm:inline">Toque para ver o calendário.</span>
                  </p>
                </div>
                <span className="text-amber-500 text-xs">➔</span>
              </div>
            )}

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
              {/* BOTÃO MURAL */}
              <button 
                onClick={() => setActiveView('mural')}
                className="group relative h-[200px] md:h-[240px] bg-[#0a0f18]/60 border-4 border-slate-800/50 rounded-[40px] overflow-hidden shadow-2xl transition-all hover:border-indigo-500/50 hover:bg-indigo-950/10 active:scale-95 flex flex-col items-center justify-center gap-4"
              >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-[24px] flex items-center justify-center text-3xl md:text-4xl shadow-2xl shadow-indigo-900/40 group-hover:scale-110 transition-transform">
                📢
              </div>
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-1">Mural de Avisos</h2>
                <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px] md:text-sm">e Alertas do Gerente</p>
              </div>
              {unreadCount > 0 && (
                <div className="absolute top-4 right-4 bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full animate-bounce shadow-xl z-10">
                  {unreadCount} NOVOS
                </div>
              )}
            </button>

            {/* BOTÃO TAREFAS */}
            <button 
              onClick={() => setActiveView('tarefas')}
              className="group relative h-[200px] md:h-[240px] bg-[#0a0f18]/60 border-4 border-slate-800/50 rounded-[40px] overflow-hidden shadow-2xl transition-all hover:border-emerald-500/50 hover:bg-emerald-950/10 active:scale-95 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#10b981] rounded-[24px] flex items-center justify-center text-3xl md:text-4xl shadow-2xl shadow-emerald-900/40 group-hover:scale-110 transition-transform">
                ✅
              </div>
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-1">Tarefas Agenda</h2>
                <p className="text-[#10b981] font-black uppercase tracking-widest text-[10px] md:text-sm">do Dia de Trabalho</p>
              </div>
              <div className="absolute top-4 right-4 bg-emerald-600/20 text-[#10b981] text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20 z-10">
                {activeTasks.length} PENDENTES
              </div>
            </button>

            {/* BOTÃO VACINAÇÃO */}
            <button 
              onClick={() => setActiveView('vacinacao')}
              className="group relative h-[200px] md:h-[240px] bg-[#0a0f18]/60 border-4 border-slate-800/50 rounded-[40px] overflow-hidden shadow-2xl transition-all hover:border-amber-500/50 hover:bg-amber-950/10 active:scale-95 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-500 rounded-[24px] flex items-center justify-center text-3xl md:text-4xl shadow-2xl shadow-amber-900/40 group-hover:scale-110 transition-transform">
                💉
              </div>
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-1">Vacinação</h2>
                <p className="text-amber-400 font-black uppercase tracking-widest text-[10px] md:text-sm">Calendário Sanitário</p>
              </div>
              {upcomingVaccinations.length > 0 && (
                <div className="absolute top-4 right-4 bg-amber-500 text-[#05070a] text-[10px] font-black px-3 py-1 rounded-full animate-pulse shadow-xl z-10">
                  {upcomingVaccinations.length} PRÓXIMAS
                </div>
              )}
            </button>
          </div>
          </div>
        ) : activeView === 'vacinacao' ? (
          <div className="flex-1 flex flex-col max-w-none mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <button 
                onClick={() => setActiveView('none')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all active:scale-95"
              >
                <span>⬅️</span>
                <span>Voltar</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden pb-4">
              {vacinacaoConfig ? (
                <VacinacaoCalendar sheep={sheep} groups={groups} plans={plans} paddocks={paddocks} config={vacinacaoConfig} />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-slate-400 font-medium">Nenhum calendário de vacinação configurado.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col max-w-none mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            {/* CABEÇALHO DA LISTA COM BOTÃO VOLTAR */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <button 
                onClick={() => setActiveView('none')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all active:scale-95"
              >
                <span>⬅️</span>
                <span>Voltar</span>
              </button>
              
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-lg ${
                  activeView === 'mural' ? 'bg-indigo-600' : 'bg-[#10b981]'
                }`}>
                  {activeView === 'mural' ? '📢' : '✅'}
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">
                  {activeView === 'mural' ? 'Mural de Avisos' : 'Tarefas do Dia'}
                </h2>
              </div>
            </div>

            {/* LISTAGEM ESPECÍFICA */}
            <div className="flex-1 bg-[#0a0f18]/60 border-2 border-slate-800/50 rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar dark-scrollbar p-4 md:p-6 space-y-4">
                {activeView === 'mural' ? (
                  avisos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <span className="text-6xl mb-4">📭</span>
                      <p className="font-black uppercase tracking-widest text-lg">Nenhum aviso</p>
                    </div>
                  ) : (
                    avisos.map(aviso => {
                      const isConfirmed = aviso.confirmacoes?.some(c => c.user === 'Operador');
                      return (
                        <div 
                          key={aviso.id} 
                          onClick={() => setViewingAviso(aviso)}
                          className={`p-6 md:p-8 rounded-[32px] border-2 transition-all cursor-pointer active:scale-[0.98] flex flex-col min-h-[180px] ${
                            aviso.prioridade === 'urgente' 
                              ? 'bg-rose-600/10 border-rose-500/30 shadow-lg' 
                              : 'bg-slate-900/40 border-slate-800/50'
                          } ${isConfirmed ? 'opacity-30 grayscale-[0.5]' : 'hover:border-indigo-500/50 hover:bg-slate-800/40'}`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              aviso.prioridade === 'urgente' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {aviso.prioridade}
                            </span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                              {new Date(aviso.created_at!).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <h3 className="text-xl md:text-2xl font-black uppercase mb-3 text-white leading-tight">{aviso.titulo}</h3>
                          <p className="text-base md:text-lg text-slate-400 line-clamp-3 md:line-clamp-4 leading-relaxed font-medium flex-1">
                            {aviso.conteudo}
                          </p>
                          <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-end">
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                              Ler aviso completo <span>➔</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  activeTasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <span className="text-6xl mb-4">🌟</span>
                      <p className="font-black uppercase tracking-widest text-lg">Tudo concluído</p>
                    </div>
                  ) : (
                    activeTasks.map(task => {
                      const isOverdue = task.dataPlanejada.split('T')[0] < today;
                      return (
                        <div 
                          key={task.id} 
                          onClick={() => {
                            setCompletingTask(task);
                          }}
                          className={`group p-6 md:p-8 rounded-[32px] border-2 transition-all active:scale-[0.98] cursor-pointer flex flex-col min-h-[200px] ${
                            isOverdue ? 'bg-rose-900/10 border-rose-900/30' : 'bg-slate-900/40 border-slate-800/50'
                          } hover:border-emerald-500/50 hover:bg-slate-800/40`}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`w-4 h-4 rounded-full ${isOverdue ? 'bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}></span>
                              <span className="text-2xl font-black text-white tabular-nums">{task.horaPlanejada}h</span>
                              {isOverdue && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-2 bg-rose-500/10 px-2 py-1 rounded-md">Atrasada</span>}
                            </div>
                            {task.protocolo && task.protocolo !== ProtocoloManejo.NENHUM && (
                              <span className="text-xs font-black bg-indigo-600 px-4 py-1.5 rounded-xl text-white uppercase animate-pulse shadow-lg shadow-indigo-900/20">
                                Protocolo
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-xl md:text-2xl font-black uppercase leading-tight mb-3 text-white">{task.titulo}</h3>
                          
                          <p className="text-sm md:text-base text-slate-400 line-clamp-2 mb-6 flex-1 font-medium">
                            {task.procedimento || 'Nenhuma instrução adicional fornecida.'}
                          </p>
                          
                          <div className="mt-auto pt-4 border-t border-slate-800/50 flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Grupo Alvo</span>
                              <span className="text-sm font-bold text-slate-300 uppercase">{task.grupoId || 'Geral'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-emerald-500 font-black uppercase text-xs tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                              <span>Abrir Tarefa</span>
                              <span className="text-lg">➔</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER ESTILO IMAGEM */}
      <footer className="p-6 border-t border-slate-800/30 flex justify-center items-center bg-[#05070a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.25em]">Sistema OviManager v4.0 • Conectado à Nuvem</p>
        </div>
      </footer>

      {/* MODAL DE MENSAGEM (AVISO) */}
      {viewingAviso && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-slate-950/95 backdrop-blur-xl">
          <div className="bg-slate-900 w-full max-w-3xl rounded-[48px] p-8 md:p-12 border border-slate-800 shadow-2xl animate-in zoom-in-95 flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <span className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest ${
                viewingAviso.prioridade === 'urgente' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {viewingAviso.prioridade}
              </span>
              <button 
                onClick={() => setViewingAviso(null)}
                className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center text-2xl hover:bg-rose-600 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>
            <h3 className="text-3xl md:text-5xl font-black uppercase mb-6 leading-tight text-white">{viewingAviso.titulo}</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar dark-scrollbar pr-2 mb-8">
              <p className="text-xl md:text-3xl font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">
                {viewingAviso.conteudo}
              </p>
            </div>
            <div className="flex justify-end gap-4">
              {!viewingAviso.confirmacoes?.some(c => c.user === 'Operador') ? (
                <button 
                  onClick={() => { handleConfirmAviso(viewingAviso.id); setViewingAviso(null); }}
                  className="px-12 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-lg tracking-widest shadow-2xl active:scale-95 transition-all"
                >
                  Confirmar Leitura
                </button>
              ) : (
                <button 
                  onClick={() => setViewingAviso(null)}
                  className="px-12 py-5 bg-slate-800 text-white rounded-3xl font-black uppercase text-lg tracking-widest shadow-2xl active:scale-95 transition-all"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXECUÇÃO AMPLIADO - TELA CHEIA */}
      {completingTask && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-6 bg-slate-950/95 backdrop-blur-xl">
          <div className="bg-slate-900 w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-[48px] p-6 md:p-12 border-0 md:border border-slate-800 shadow-2xl animate-in slide-in-from-bottom-10 flex flex-col overflow-hidden">
            
            <div className="flex justify-between items-start mb-8 shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-900/30 text-emerald-500 rounded-2xl flex items-center justify-center text-3xl">👷‍♂️</div>
                <div>
                  <h3 className="text-2xl md:text-4xl font-black uppercase leading-tight">Executar Tarefa</h3>
                  <p className="text-emerald-500 text-sm md:text-lg font-black uppercase tracking-widest mt-1">{completingTask.titulo}</p>
                </div>
              </div>
              <button 
                onClick={() => { setCompletingTask(null); setExecutor(''); setNotes(''); }}
                className="w-10 h-10 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center text-xl hover:bg-rose-600 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar dark-scrollbar pr-2 space-y-8">
              <div className="bg-slate-950 p-8 rounded-[32px] border border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-emerald-500 text-xl">📋</span>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Instruções e Orientação</h4>
                </div>
                <p className="text-xl md:text-2xl font-medium text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {completingTask.procedimento || "Nenhuma instrução específica fornecida para esta tarefa."}
                </p>
                
                <div className="mt-8 pt-8 border-t border-slate-800/50 flex flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-sm font-black uppercase tracking-widest">Horário:</span>
                    <span className="text-white font-black text-lg">{completingTask.horaPlanejada}h</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-sm font-black uppercase tracking-widest">Grupo:</span>
                    <span className="text-white font-black text-lg">{completingTask.grupoId || 'Geral'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-4 ml-2 tracking-widest">Seu Nome (Executor) *</label>
                  <input 
                    autoFocus 
                    className="w-full p-6 md:p-8 bg-slate-950 border-2 border-slate-800 rounded-[24px] md:rounded-[32px] font-black text-xl md:text-2xl uppercase outline-none focus:border-emerald-500 text-white transition-all" 
                    value={executor} 
                    onChange={e => setExecutor(e.target.value)} 
                    placeholder="DIGITE SEU NOME" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-4 ml-2 tracking-widest">Observações de Campo</label>
                  <textarea 
                    className="w-full p-6 md:p-8 bg-slate-950 border-2 border-slate-800 rounded-[24px] md:rounded-[32px] font-medium text-lg md:text-xl outline-none focus:border-emerald-500 text-white resize-none transition-all" 
                    rows={4} 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Relate aqui qualquer detalhe importante ocorrido durante a execução..." 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6 mt-8 shrink-0">
              <button 
                onClick={() => { setCompletingTask(null); setExecutor(''); setNotes(''); }} 
                className="py-4 md:py-5 text-slate-500 font-black uppercase text-xs md:text-sm tracking-widest hover:text-white transition-all bg-slate-800/50 rounded-2xl md:rounded-3xl"
              >
                Voltar
              </button>
              <div className="flex flex-col gap-2">
                {completingTask.protocolo && completingTask.protocolo !== ProtocoloManejo.NENHUM && (
                  <button 
                    onClick={() => {
                      if (onStartProtocol) {
                        onStartProtocol(completingTask);
                        setCompletingTask(null);
                        setExecutor('');
                        setNotes('');
                      }
                    }}
                    className="py-4 md:py-5 bg-indigo-600 text-white rounded-2xl md:rounded-3xl font-black uppercase text-xs md:text-sm tracking-widest shadow-2xl shadow-indigo-900/40 transition-all active:scale-95 w-full"
                  >
                    IR PARA PROTOCOLO
                  </button>
                )}
                <button 
                  onClick={handleComplete} 
                  disabled={!executor.trim()} 
                  className="py-4 md:py-5 bg-emerald-600 text-white rounded-2xl md:rounded-3xl font-black uppercase text-xs md:text-sm tracking-widest shadow-2xl shadow-emerald-900/40 disabled:opacity-20 transition-all active:scale-95 w-full"
                >
                  Concluir Tarefa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NoticeBoard;
