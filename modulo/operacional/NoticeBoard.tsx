
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
  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<Manejo | null>(null);
  const [viewingAviso, setViewingAviso] = useState<Aviso | null>(null);
  const [executor, setExecutor] = useState('');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeView, setActiveView] = useState<'none' | 'mural' | 'tarefas'>('none');

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
      m.dataPlanejada.split('T')[0] === today
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
      <header className="bg-[#05070a] p-4 md:p-6 flex justify-between items-start shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#10b981] rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-900/20">
            <span className="filter brightness-0 invert">🐑</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight leading-none text-white">Quadro de Avisos</h1>
            <p className="text-[#10b981] text-[10px] md:text-sm font-black uppercase tracking-[0.15em] mt-0.5">Operação de Campo</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-rose-900/40 active:scale-95 transition-all border border-rose-500/50"
          >
            <span>SAIR</span>
            <span className="text-lg">🚪</span>
          </button>
        </div>
      </header>

      {/* RELÓGIO CENTRALIZADO ESTILO IMAGEM */}
      <div className="flex flex-col items-center justify-center py-2 shrink-0">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white tabular-nums leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </h2>
        <p className="text-sm md:text-lg font-black text-[#10b981] uppercase tracking-[0.3em] mt-1">
          {formatBrazilianDate(today)}
        </p>
      </div>

      {/* CONTEÚDO DINÂMICO */}
      <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6 pt-2">
        {activeView === 'none' ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center max-w-5xl mx-auto w-full">
            {/* BOTÃO MURAL */}
            <button 
              onClick={() => setActiveView('mural')}
              className="group relative h-[200px] md:h-[300px] bg-[#0a0f18]/60 border-4 border-slate-800/50 rounded-[48px] overflow-hidden shadow-2xl transition-all hover:border-indigo-500/50 hover:bg-indigo-950/10 active:scale-95 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-[24px] flex items-center justify-center text-3xl md:text-4xl shadow-2xl shadow-indigo-900/40 group-hover:scale-110 transition-transform">
                📢
              </div>
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-1">Mural de Avisos</h2>
                <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px] md:text-sm">e Alertas do Gerente</p>
              </div>
              {unreadCount > 0 && (
                <div className="absolute top-6 right-6 bg-rose-600 text-white text-sm font-black px-4 py-1.5 rounded-full animate-bounce shadow-xl">
                  {unreadCount} NOVOS
                </div>
              )}
            </button>

            {/* BOTÃO TAREFAS */}
            <button 
              onClick={() => setActiveView('tarefas')}
              className="group relative h-[200px] md:h-[300px] bg-[#0a0f18]/60 border-4 border-slate-800/50 rounded-[48px] overflow-hidden shadow-2xl transition-all hover:border-emerald-500/50 hover:bg-emerald-950/10 active:scale-95 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#10b981] rounded-[24px] flex items-center justify-center text-3xl md:text-4xl shadow-2xl shadow-emerald-900/40 group-hover:scale-110 transition-transform">
                ✅
              </div>
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-1">Tarefas Agenda</h2>
                <p className="text-[#10b981] font-black uppercase tracking-widest text-[10px] md:text-sm">do Dia de Trabalho</p>
              </div>
              <div className="absolute top-6 right-6 bg-emerald-600/20 text-[#10b981] text-sm font-black px-4 py-1.5 rounded-full border-2 border-emerald-500/20">
                {activeTasks.length} PENDENTES
              </div>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
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
                          className={`p-5 rounded-[24px] border-2 transition-all cursor-pointer active:scale-[0.98] ${
                            aviso.prioridade === 'urgente' 
                              ? 'bg-rose-600/10 border-rose-500/30 shadow-lg' 
                              : 'bg-slate-900/40 border-slate-800/50'
                          } ${isConfirmed ? 'opacity-30 grayscale-[0.5]' : 'hover:border-indigo-500/50 hover:bg-slate-800/40'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              aviso.prioridade === 'urgente' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {aviso.prioridade}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">
                              {new Date(aviso.created_at!).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <h3 className="text-lg md:text-xl font-black uppercase mb-2 text-white">{aviso.titulo}</h3>
                          <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed font-medium">
                            {aviso.conteudo}
                          </p>
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
                            if (task.protocolo && task.protocolo !== ProtocoloManejo.NENHUM) {
                              onStartProtocol?.(task);
                            } else {
                              setCompletingTask(task);
                            }
                          }}
                          className={`p-5 rounded-[24px] border-2 transition-all active:scale-[0.98] cursor-pointer ${
                            isOverdue ? 'bg-rose-900/10 border-rose-900/30' : 'bg-slate-900/40 border-slate-800/50'
                          } hover:border-emerald-500/50 hover:bg-slate-800/40`}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <span className={`w-3 h-3 rounded-full ${isOverdue ? 'bg-rose-500 animate-pulse' : 'bg-[#10b981]'}`}></span>
                              <span className="text-xl font-black text-white tabular-nums">{task.horaPlanejada}h</span>
                            </div>
                            {task.protocolo && task.protocolo !== ProtocoloManejo.NENHUM && (
                              <span className="text-[10px] font-black bg-indigo-600 px-3 py-1 rounded-lg text-white uppercase animate-pulse shadow-lg shadow-indigo-900/20">
                                Protocolo
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-lg md:text-xl font-black uppercase leading-tight mb-3 text-white">{task.titulo}</h3>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                              {task.grupoId || 'Geral'}
                            </span>
                            <div className="w-10 h-10 bg-emerald-600/20 text-[#10b981] rounded-xl flex items-center justify-center text-xl border border-emerald-500/20">
                              ✓
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
