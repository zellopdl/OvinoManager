
import React, { useState, useEffect, useMemo } from 'react';
import { Manejo, StatusManejo, ProtocoloManejo } from '../../types';
import { manejoService } from '../manejo/manejoService';
import { avisoService, Aviso } from './avisoService';
import { getLocalDateString, formatBrazilianDate } from '../../utils';
import { supabase } from '../../lib/supabase';

interface NoticeBoardProps {
  onStartProtocol?: (task: Manejo) => void;
}

const NoticeBoard: React.FC<NoticeBoardProps> = ({ onStartProtocol }) => {
  const [view, setView] = useState<'home' | 'mural' | 'tarefas'>('home');
  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<Manejo | null>(null);
  const [viewingAviso, setViewingAviso] = useState<Aviso | null>(null);
  const [executor, setExecutor] = useState('');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);

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
      const [mTasks, aNotices] = await Promise.all([
        manejoService.getAll().catch(() => []),
        avisoService.getAll().catch(() => [])
      ]);
      setManejos(mTasks);
      setAvisos(aNotices);
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

  const renderHome = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 gap-4 md:gap-8 overflow-hidden">
      {/* RELÓGIO E DATA - TAMANHO OTIMIZADO PARA CABER EM QUALQUER TELA */}
      <div className="text-center space-y-1 md:space-y-2">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white tabular-nums leading-none drop-shadow-2xl">
          {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-sm sm:text-base md:text-xl font-black text-emerald-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">
          {formatBrazilianDate(today)}
        </p>
      </div>

      {/* BOTÕES DE OPÇÃO - LADO A LADO E MAIS COMPACTOS */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-3xl px-4">
        <button 
          onClick={() => setView('mural')}
          className="group relative bg-slate-900 border-2 md:border-4 border-slate-800 rounded-[24px] md:rounded-[48px] p-4 md:p-8 flex flex-col items-center gap-3 md:gap-6 transition-all hover:border-indigo-500 hover:bg-slate-800 active:scale-95 shadow-2xl"
        >
          <div className="w-12 h-12 md:w-20 md:h-20 bg-indigo-600 rounded-xl md:rounded-[28px] flex items-center justify-center text-2xl md:text-4xl shadow-xl shadow-indigo-900/40 group-hover:scale-110 transition-transform">
            📢
          </div>
          <div className="text-center">
            <h2 className="text-base md:text-2xl font-black uppercase tracking-tight text-white mb-0.5">Mural</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[7px] md:text-[10px]">Avisos e Alertas</p>
          </div>
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 w-7 h-7 md:w-10 md:h-10 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] md:text-base font-black shadow-xl animate-bounce">
              {unreadCount}
            </div>
          )}
        </button>

        <button 
          onClick={() => setView('tarefas')}
          className="group relative bg-slate-900 border-2 md:border-4 border-slate-800 rounded-[24px] md:rounded-[48px] p-4 md:p-8 flex flex-col items-center gap-3 md:gap-6 transition-all hover:border-emerald-500 hover:bg-slate-800 active:scale-95 shadow-2xl"
        >
          <div className="w-12 h-12 md:w-20 md:h-20 bg-emerald-600 rounded-xl md:rounded-[28px] flex items-center justify-center text-2xl md:text-4xl shadow-xl shadow-emerald-900/40 group-hover:scale-110 transition-transform">
            ✅
          </div>
          <div className="text-center">
            <h2 className="text-base md:text-2xl font-black uppercase tracking-tight text-white mb-0.5">Tarefas</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[7px] md:text-[10px]">Agenda do Dia</p>
          </div>
          {activeTasks.length > 0 && (
            <div className="absolute -top-2 -right-2 w-7 h-7 md:w-10 md:h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] md:text-base font-black shadow-xl">
              {activeTasks.length}
            </div>
          )}
        </button>
      </div>
    </div>
  );

  const renderMural = () => (
    <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-10 gap-8">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => setView('home')} className="w-12 h-12 md:w-16 md:h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-xl md:text-2xl hover:bg-slate-700 transition-all">⬅️</button>
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">Mural de Avisos</h2>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-emerald-500 font-black uppercase tracking-widest text-xs">Total: {avisos.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar dark-scrollbar pr-2 md:pr-4">
        {avisos.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="bg-slate-900/30 border border-slate-800 rounded-[48px] p-20 text-center max-w-2xl">
              <p className="text-slate-600 font-black uppercase tracking-widest text-2xl">Nenhum aviso no mural</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 pb-10">
            {avisos.map(aviso => {
              const isConfirmed = aviso.confirmacoes?.some(c => c.user === 'Operador');
              return (
                <div 
                  key={aviso.id} 
                  onClick={() => setViewingAviso(aviso)}
                  className={`p-6 md:p-8 rounded-[32px] md:rounded-[48px] border-2 md:border-4 transition-all cursor-pointer active:scale-[0.98] ${
                    aviso.prioridade === 'urgente' 
                      ? 'bg-rose-600 border-rose-500 shadow-2xl shadow-rose-900/20' 
                      : 'bg-slate-900 border-slate-800'
                  } ${isConfirmed ? 'opacity-40 grayscale-[0.5]' : ''}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[8px] md:text-xs font-black uppercase tracking-widest ${
                      aviso.prioridade === 'urgente' ? 'bg-white text-rose-600' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {aviso.prioridade}
                    </span>
                    <span className="text-[10px] md:text-sm font-black uppercase opacity-50">
                      {new Date(aviso.created_at!).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-3xl font-black uppercase mb-4 leading-tight line-clamp-2">{aviso.titulo}</h3>
                  <p className={`text-sm md:text-xl font-medium leading-relaxed mb-6 line-clamp-3 ${
                    aviso.prioridade === 'urgente' ? 'text-white' : 'text-slate-400'
                  }`}>
                    {aviso.conteudo}
                  </p>
                  
                  <div className="flex justify-end">
                    {isConfirmed ? (
                      <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-xs md:text-lg tracking-widest">
                        <span className="text-xl md:text-3xl">✓</span> Ciente
                      </div>
                    ) : (
                      <div className="text-[10px] md:text-sm font-black uppercase text-white/50">Toque para ler</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderTarefas = () => (
    <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-10 gap-8">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => setView('home')} className="w-12 h-12 md:w-16 md:h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-xl md:text-2xl hover:bg-slate-700 transition-all">⬅️</button>
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">Tarefas do Dia</h2>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-emerald-500 font-black uppercase tracking-widest text-xs">Pendentes: {activeTasks.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar dark-scrollbar pr-2 md:pr-4">
        {activeTasks.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="bg-emerald-900/10 border border-emerald-900/20 rounded-[60px] p-20 text-center max-w-2xl">
              <span className="text-9xl block mb-8">🌟</span>
              <h3 className="text-4xl font-black text-emerald-500 uppercase">Tudo Concluído!</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest mt-6 text-xl">Bom trabalho para hoje.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 pb-10">
            {activeTasks.map(task => {
              const isOverdue = task.dataPlanejada.split('T')[0] < today;
              return (
                <div 
                  key={task.id} 
                  onClick={() => setCompletingTask(task)}
                  className={`p-6 md:p-8 rounded-[32px] md:rounded-[48px] border-2 md:border-4 transition-all active:scale-[0.98] cursor-pointer ${
                    isOverdue ? 'bg-rose-900/20 border-rose-900/40' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[8px] md:text-xs font-black uppercase tracking-widest ${
                      isOverdue ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      {isOverdue ? 'Atrasado' : 'Hoje'}
                    </span>
                    <span className="text-xl md:text-3xl font-black text-slate-500 tabular-nums">{task.horaPlanejada}h</span>
                  </div>
                  
                  <h3 className="text-xl md:text-3xl font-black uppercase leading-tight mb-4 line-clamp-2">{task.titulo}</h3>
                  
                  <div className="flex justify-between items-center mt-auto">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-xl flex items-center justify-center text-lg">👥</div>
                      <p className="text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-widest">{task.grupoId || 'Geral'}</p>
                    </div>
                    <div className="flex gap-2 md:gap-4">
                      {task.protocolo && task.protocolo !== ProtocoloManejo.NENHUM && onStartProtocol && (
                        <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-black uppercase text-[8px] md:text-[10px] shadow-lg animate-pulse">
                          Protocolo
                        </div>
                      )}
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-xl md:text-2xl shadow-xl shadow-emerald-900/20">✓</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div 
      className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden"
      onClick={() => !audioEnabled && setAudioEnabled(true)}
    >
      {/* ALERTA DE ÁUDIO DESATIVADO */}
      {!audioEnabled && hasUrgentUnconfirmed && (
        <div className="fixed top-0 left-0 w-full bg-rose-600 text-white p-2 text-center z-[2000] font-black uppercase text-xs animate-pulse">
          Toque em qualquer lugar para ativar o alerta sonoro de urgência
        </div>
      )}

      {/* HEADER COMPACTO */}
      <header className="bg-slate-900/50 border-b border-slate-800 p-4 md:p-6 flex justify-between items-center shrink-0 relative z-50">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-600 rounded-[16px] md:rounded-[20px] flex items-center justify-center text-2xl md:text-3xl shadow-2xl shadow-emerald-900/20">🐑</div>
          <div>
            <h1 className="text-xl md:text-4xl font-black uppercase tracking-tighter leading-none">Quadro de Avisos</h1>
            <p className="text-emerald-500 text-[10px] md:text-sm font-black uppercase tracking-[0.2em] mt-1">Operação de Campo</p>
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          {view !== 'home' && (
            <div className="hidden sm:block text-right">
              <p className="text-2xl md:text-4xl font-black tracking-tighter text-white tabular-nums leading-none">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl flex items-center justify-center text-lg md:text-xl transition-all shadow-xl active:scale-90"
            title="Sair / Trocar Usuário"
          >
            🚪
          </button>
        </div>
      </header>

      {/* CONTEÚDO DINÂMICO */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        {view === 'home' && renderHome()}
        {view === 'mural' && renderMural()}
        {view === 'tarefas' && renderTarefas()}
      </main>

      {/* FOOTER - STATUS DO SISTEMA */}
      <footer className="p-4 md:p-8 border-t border-slate-800 flex justify-center items-center bg-slate-900/30 shrink-0 relative z-50">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <p className="text-[8px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Sistema OviManager v4.0 • Conectado à Nuvem</p>
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
              <button 
                onClick={handleComplete} 
                disabled={!executor.trim()} 
                className="py-4 md:py-5 bg-emerald-600 text-white rounded-2xl md:rounded-3xl font-black uppercase text-xs md:text-sm tracking-widest shadow-2xl shadow-emerald-900/40 disabled:opacity-20 transition-all active:scale-95"
              >
                Concluir Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NoticeBoard;
