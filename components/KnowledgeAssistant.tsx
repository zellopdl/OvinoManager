
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { askKnowledgeAssistant, getSpeechForText } from '../services/geminiService';
import { knowledgeService } from '../services/knowledgeService';
import { KnowledgeEntry } from '../types';
import { decodeBase64, decodeAudioData } from '../utils';

const KnowledgeAssistant: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    try {
      const data = await knowledgeService.getAll();
      setEntries(data);
    } catch (e) { console.error(e); }
  };

  const groupedEntries = useMemo(() => {
    const groups: Record<string, number> = {};
    entries.forEach(entry => {
      const subject = (entry.assunto || 'GERAL').toUpperCase();
      groups[subject] = (groups[subject] || 0) + 1;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      return entries.filter(e => e.titulo.toLowerCase().includes(query) || e.conteudo.toLowerCase().includes(query));
    }
    if (activeSubject) return entries.filter(e => e.assunto.toUpperCase() === activeSubject);
    return [];
  }, [entries, searchTerm, activeSubject]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true); setAnswer('');
    try {
      const res = await askKnowledgeAssistant(question);
      setAnswer(res || "Sem resposta da IA.");
    } catch (err) {
      setAnswer("Falha na comunicação com a IA técnica.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!answer || isSaving) return;
    setIsSaving(true);
    try {
      const tituloSugerido = question.length > 40 ? question.substring(0, 37) + "..." : question;
      
      await knowledgeService.create({
        titulo: tituloSugerido.toUpperCase(),
        assunto: 'CONSULTORIA',
        conteudo: answer
      });
      
      await loadEntries();
      alert("Conhecimento salvo na biblioteca com sucesso!");
    } catch (e) {
      alert("Erro ao salvar na biblioteca.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSpeak = async () => {
    if (!answer) return;
    if (audioStatus === 'playing') {
      audioSourceRef.current?.stop(); setAudioStatus('paused'); return;
    }
    try {
      setAudioStatus('loading');
      const base64Audio = await getSpeechForText(answer);
      if (!base64Audio) { setAudioStatus('idle'); return; }
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const buffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer; source.connect(ctx.destination);
      source.onended = () => setAudioStatus('idle');
      audioSourceRef.current = source; source.start(); setAudioStatus('playing');
    } catch (e) { setAudioStatus('idle'); }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm("Deseja remover este item da biblioteca?")) return;
    try {
      await knowledgeService.delete(id);
      await loadEntries();
    } catch (e) {
      alert("Erro ao excluir.");
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500 pb-4">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-2xl shadow-md text-white shrink-0">
        <h2 className="text-xl font-black flex items-center gap-2">💡 Guia do Rebanho</h2>
        <p className="mt-1 text-amber-50 text-[11px] font-medium opacity-90 max-w-xl">Consultoria técnica global para seu rebanho.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        <div className="lg:col-span-7 flex flex-col space-y-4 overflow-hidden">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col shrink-0">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">✨ Nova Consulta</h3>
            <textarea 
              rows={3}
              placeholder="Ex: Como prevenir verminose em climas úmidos?"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 transition-all resize-none text-base font-medium"
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
            <button 
              onClick={handleAsk} 
              disabled={loading || !question.trim()} 
              className={`w-full py-3 text-white font-black text-xs rounded-xl shadow-md uppercase tracking-widest transition-all ${
                loading ? 'bg-slate-400' : 'bg-slate-900 active:scale-95 hover:bg-black'
              }`}
            >
              {loading ? 'PESQUISANDO...' : 'OBTER RESPOSTA'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {answer && (
              <div className="p-5 rounded-xl border shadow-inner animate-in slide-in-from-top-2 bg-amber-50 border-amber-100 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="px-3 py-1 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-700">
                    IA Técnica
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSpeak} 
                      className={`h-8 px-3 bg-white text-amber-700 border border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${audioStatus === 'playing' ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      {audioStatus === 'loading' ? '⏳' : audioStatus === 'playing' ? 'Parar' : '🔊 Ouvir'}
                    </button>
                    <button 
                      onClick={handleSave} 
                      disabled={isSaving}
                      className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      {isSaving ? 'Salvando...' : '💾 Salvar no Guia'}
                    </button>
                  </div>
                </div>
                <div className="text-sm leading-relaxed font-medium text-slate-800 italic whitespace-pre-wrap">
                  {answer}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col space-y-4 overflow-hidden">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 shrink-0">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">📚 Sua Biblioteca</h3>
            <input 
              type="text" 
              placeholder="Buscar na biblioteca..." 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm font-bold" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
            {!searchTerm && !activeSubject && (
              <div className="grid grid-cols-2 gap-3">
                {groupedEntries.map(([name, count]) => (
                  <button key={name} onClick={() => setActiveSubject(name)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 text-left h-28 flex flex-col justify-between group transition-all">
                    <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-sm font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors">{name.charAt(0)}</div>
                    <div><h4 className="font-black text-slate-800 text-[10px] uppercase truncate">{name}</h4><p className="text-[9px] font-bold text-slate-400">{count} registro(s)</p></div>
                  </button>
                ))}
                {entries.length === 0 && (
                  <div className="col-span-full py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Biblioteca Vazia</p>
                  </div>
                )}
              </div>
            )}

            {(activeSubject || searchTerm) && (
              <div className="space-y-3">
                <button onClick={() => setActiveSubject(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 hover:text-slate-600 transition-colors">
                  ← Voltar para Categorias
                </button>
                {filteredEntries.map(entry => (
                  <div key={entry.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm group hover:border-amber-200 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-slate-800 text-xs uppercase pr-4">{entry.titulo}</h4>
                      <button onClick={() => handleDeleteEntry(entry.id)} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                    </div>
                    <p className="text-slate-500 text-[11px] line-clamp-3 leading-relaxed italic">{entry.conteudo}</p>
                    <button 
                      onClick={() => { setAnswer(entry.conteudo); setQuestion(entry.titulo); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                      className="mt-3 w-full py-2 bg-slate-50 text-slate-600 font-black text-[9px] uppercase rounded-lg border border-slate-100 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeAssistant;
