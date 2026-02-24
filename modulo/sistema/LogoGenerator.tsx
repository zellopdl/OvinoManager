
import React, { useState } from 'react';
import { generateAppLogo } from '../dashboard/geminiService';

const LogoGenerator: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => localStorage.getItem('ovi_generated_logo'));
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const url = await generateAppLogo();
    if (url) {
      setLogoUrl(url);
      localStorage.setItem('ovi_generated_logo', url);
    } else {
      alert("Erro ao gerar logo.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">🎨 Logotipo IA</h3>
      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 min-h-[200px] bg-slate-50">
        {loading ? <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div> : 
         logoUrl ? <img src={logoUrl} className="w-40 h-40 rounded-xl shadow-lg" alt="Logo" /> : 
         <p className="text-slate-400 font-black text-[10px] uppercase">Sem logo gerado</p>}
      </div>
      <button onClick={handleGenerate} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">
        Gerar Logotipo com IA
      </button>
    </div>
  );
};

export default LogoGenerator;
