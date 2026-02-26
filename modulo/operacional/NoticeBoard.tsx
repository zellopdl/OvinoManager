
import React, { useState, useEffect, useMemo } from 'react';
import { Manejo, StatusManejo } from '../../types';
import { manejoService } from '../manejo/manejoService';
import { avisoService, Aviso } from './avisoService';
import { getLocalDateString, formatBrazilianDate } from '../../utils';
import { supabase } from '../../lib/supabase';

const NoticeBoard: React.FC = () => {
  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<Manejo | null>(null);
  const [executor, setExecutor] = useState('');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);

  const hasUrgentUnconfirmed = useMemo(() => 
    avisos.some(a => a.prioridade === 'urgente' && !a.confirmacoes?.some(c => c.user === 'Operador')),
  [avisos]);

  useEffect(() => {
    let timeoutId: any;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1353/1353-preview.mp3'); // Som de telefone/alerta
    
    const playCycle = async () => {
      if (!hasUrgentUnconfirmed || !audioEnabled) return;

      for (let i = 0; i < 5; i++) {
        // Verifica novamente se ainda há urgentes antes de cada toque
        const stillHasUrgent = await avisoService.getAll().then(list => 
          list.some(a => a.prioridade === 'urgente' && !a.confirmacoes?.some(c => c.user === 'Operador'))
        ).catch(() => hasUrgentUnconfirmed);

        if (!stillHasUrgent) break;

        try {
          audio.currentTime = 0;
          await audio.play();
          await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3 segundos entre toques
        } catch (e) {
          console.warn("Áudio bloqueado pelo navegador. Toque na tela para ativar.");
          break;
        }
      }

      if (hasUrgentUnconfirmed && audioEnabled) {
        timeoutId = setTimeout(playCycle, 60000); // Pausa de 1 minuto
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

  const today = getLocalDateString();
  
  const activeTasks = useMemo(() => 
    manejos.filter(m => 
      m.status === StatusManejo.PENDENTE && 
      m.dataPlanejada.split('T')[0] <= today
    ).sort((a, b) => a.dataPlanejada.localeCompare(b.dataPlanejada)), 
  [manejos, today]);

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
    // Feedback visual imediato (Optimistic UI)
    setAvisos(prev => prev.map(a => {
      if (a.id === avisoId) {
        const currentConf = a.confirmacoes || [];
        return { ...a, confirmacoes: [...currentConf, { user: 'Operador', at: new Date().toISOString() }] };
      }
      return a;
    }));

    try {
      await avisoService.confirmRead(avisoId, 'Operador');
      // O real-time ou o loadData(true) vai sincronizar o estado final
      await loadData(true);
    } catch (e) {
      alert("Erro ao confirmar leitura.");
      await loadData(true); // Reverte o estado se der erro
    }
  };

  const handleLogout = () => {
    try {
      // Limpeza imediata de tudo
      localStorage.clear();
      sessionStorage.clear();
      
      // Tenta deslogar no fundo sem esperar
      if (supabase && supabase.auth) {
        supabase.auth.signOut().catch(() => {});
      }
      
      // Força o navegador a recarregar na tela de login IMEDIATAMENTE
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
      className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden"
      onClick={() => !audioEnabled && setAudioEnabled(true)}
    >
      {/* ALERTA DE ÁUDIO DESATIVADO */}
      {!audioEnabled && hasUrgentUnconfirmed && (
        <div className="fixed top-0 left-0 w-full bg-rose-600 text-white p-2 text-center z-[2000] font-black uppercase text-xs animate-pulse">
          Toque em qualquer lugar para ativar o alerta sonoro de urgência
        </div>
      )}
      {/* HEADER COMPACTO - ESTILO KIOSK */}
      <header className="bg-slate-900/50 border-b border-slate-800 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 relative z-50">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-600 rounded-[20px] flex items-center justify-center text-3xl shadow-2xl shadow-emerald-900/20">🐑</div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">Quadro de Avisos</h1>
            <p className="text-emerald-500 text-sm font-black uppercase tracking-[0.2em] mt-1">Operação de Campo • {formatBrazilianDate(today)}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center md:text-right">
            <p className="text-4xl md:text-5xl font-black tracking-tighter text-white tabular-nums leading-none">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-12 h-12 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl flex items-center justify-center text-xl transition-all shadow-xl active:scale-90"
            title="Sair / Trocar Usuário"
          >
            🚪
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 md:p-10 gap-6 md:gap-10 min-h-0">
        {/* COLUNA ESQUERDA: AVISOS URGENTES E MURAL */}
        <div className="flex-1 flex flex-col gap-6 md:gap-10 overflow-y-auto custom-scrollbar dark-scrollbar pr-2 md:pr-4 min-h-[300px] md:min-h-0">
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-400">Mural de Avisos Gerais</h2>
            </div>
            
            {avisos.length === 0 ? (
              <div className="bg-slate-900/30 border border-slate-800 rounded-[48px] p-12 text-center">
                <p className="text-slate-600 font-black uppercase tracking-widest text-lg">Nenhum aviso no mural</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {avisos.map(aviso => {
                  const isConfirmed = aviso.confirmacoes?.some(c => c.user === 'Operador');
                  return (
                    <div 
                      key={aviso.id} 
                      className={`p-10 rounded-[48px] border-4 transition-all ${
                        aviso.prioridade === 'urgente' 
                          ? 'bg-rose-600 border-rose-500 shadow-2xl shadow-rose-900/20' 
                          : 'bg-slate-900 border-slate-800'
                      } ${isConfirmed ? 'opacity-50 grayscale-[0.5]' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <span className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest ${
                          aviso.prioridade === 'urgente' ? 'bg-white text-rose-600' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {aviso.prioridade}
                        </span>
                        <span className="text-sm font-black uppercase opacity-50">
                          {new Date(aviso.created_at!).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h3 className="text-3xl md:text-4xl font-black uppercase mb-4 leading-tight">{aviso.titulo}</h3>
                      <p className={`text-xl md:text-2xl font-medium leading-relaxed mb-8 ${
                        aviso.prioridade === 'urgente' ? 'text-white' : 'text-slate-400'
                      }`}>
                        {aviso.conteudo}
                      </p>
                      
                      <div className="flex justify-end">
                        {!isConfirmed ? (
                          <button 
                            onClick={() => handleConfirmAviso(aviso.id)}
                            className={`px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all ${
                              aviso.prioridade === 'urgente' ? 'bg-white text-rose-600' : 'bg-emerald-600 text-white'
                            }`}
                          >
                            Confirmar Leitura
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 text-emerald-400 font-black uppercase text-sm tracking-widest">
                            <span className="text-2xl">✓</span> Ciente
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* COLUNA DIREITA: TAREFAS DO DIA */}
        <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col gap-6 md:gap-10 overflow-y-auto custom-scrollbar dark-scrollbar pr-2 md:pr-4 min-h-[300px] md:min-h-0">
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-400">Tarefas do Dia ({activeTasks.length})</h2>
            </div>

            {activeTasks.length === 0 ? (
              <div className="bg-emerald-900/10 border border-emerald-900/20 rounded-[48px] p-16 text-center">
                <span className="text-7xl block mb-6">🌟</span>
                <h3 className="text-2xl font-black text-emerald-500 uppercase">Tudo Concluído!</h3>
                <p className="text-slate-500 font-bold uppercase tracking-widest mt-4 text-sm">Bom trabalho para hoje.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeTasks.map(task => {
                  const isOverdue = task.dataPlanejada.split('T')[0] < today;
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => setCompletingTask(task)}
                      className={`p-8 rounded-[40px] border-4 transition-all active:scale-[0.98] cursor-pointer ${
                        isOverdue ? 'bg-rose-900/20 border-rose-900/40' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          isOverdue ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {isOverdue ? 'Atrasado' : 'Hoje'}
                        </span>
                        <span className="text-2xl font-black text-slate-500">{task.horaPlanejada}h</span>
                      </div>
                      
                      <h3 className="text-2xl font-black uppercase leading-tight mb-4">{task.titulo}</h3>
                      
                      {task.procedimento && (
                        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 mb-6">
                          <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Instrução do Gerente:</p>
                          <p className="text-lg font-bold text-slate-300 italic leading-relaxed">"{task.procedimento}"</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center text-lg">👥</div>
                          <p className="text-[10px] font-black text-slate-500 uppercase">{task.grupoId || 'Geral'}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-2xl shadow-xl shadow-emerald-900/20">✓</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* FOOTER - STATUS DO SISTEMA */}
      <footer className="p-8 border-t border-slate-800 flex justify-center items-center bg-slate-900/30 shrink-0 relative z-50">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Sistema OviManager v3.5 • Conectado à Nuvem</p>
        </div>
      </footer>

      {/* MODAL DE EXECUÇÃO AMPLIADO - TELA CHEIA */}
      {completingTask && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-6 bg-slate-950/95 backdrop-blur-xl">
          <div className="bg-slate-900 w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-[48px] p-6 md:p-12 border-0 md:border border-slate-800 shadow-2xl animate-in slide-in-from-bottom-10 flex flex-col overflow-hidden">
            
            {/* CABEÇALHO DO MODAL */}
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

            {/* CONTEÚDO SCROLLÁVEL */}
            <div className="flex-1 overflow-y-auto custom-scrollbar dark-scrollbar pr-2 space-y-8">
              
              {/* ORIENTAÇÃO DETALHADA */}
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

              {/* FORMULÁRIO DE REGISTRO */}
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

            {/* BOTÕES DE AÇÃO */}
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
