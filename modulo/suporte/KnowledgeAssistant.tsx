
import React, { useState, useEffect } from 'react';
import { askKnowledgeAssistant } from '../dashboard/geminiService.ts';
import { knowledgeService } from './knowledgeService.ts';
import { KnowledgeEntry } from '../../types.ts';

const KnowledgeAssistant: React.FC = () => {
  const [q, setQ] = useState('');
  const [ans, setAns] = useState('');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);

  useEffect(() => {
    knowledgeService.getAll().then(setEntries);
  }, []);

  const handleAsk = async () => {
    if (!q.trim()) return;
    setLoading(true);
    const res = await askKnowledgeAssistant(q);
    setAns(res);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-amber-500 p-8 rounded-3xl text-white shadow-lg">
        <h2 className="text-xl font-black uppercase">Consultoria Técnica IA</h2>
        <p className="text-amber-50 text-[10px] font-black uppercase mt-1">Especialista virtual em ovinocultura</p>
      </div>
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <textarea 
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-500 font-medium text-sm" 
          rows={3} 
          placeholder="Ex: Como prevenir verminose no rebanho?" 
          value={q} 
          onChange={e => setQ(e.target.value)} 
        />
        <button onClick={handleAsk} disabled={loading || !q.trim()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
          {loading ? 'Consultando Genética...' : 'Solicitar Parecer Técnico'}
        </button>
        {ans && <div className="p-6 bg-amber-50 rounded-2xl italic text-sm border border-amber-100 text-slate-800 leading-relaxed whitespace-pre-wrap animate-in fade-in">{ans}</div>}
      </div>
    </div>
  );
};

export default KnowledgeAssistant;
