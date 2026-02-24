
import React, { useState } from 'react';
import { generateAppLogo } from '../services/geminiService';

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
      alert("Não foi possível gerar o logotipo. Verifique sua chave de API.");
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!logoUrl) return;
    const link = document.createElement('a');
    link.href = logoUrl;
    link.download = 'ovimanager-logo.png';
    link.click();
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
          <span className="text-base">🎨</span> Identidade Visual
        </h3>
        {logoUrl && (
          <button 
            onClick={handleDownload}
            className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all"
          >
            Baixar PNG
          </button>
        )}
      </div>
      
      <p className="text-[11px] text-slate-500 font-medium">
        Gere um logotipo profissional exclusivo para sua fazenda ou para o OviManager usando a potência criativa do Gemini.
      </p>

      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl p-8 min-h-[280px] bg-slate-50/50">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">Desenhando sua marca...</p>
          </div>
        ) : logoUrl ? (
          <div className="relative group">
            <img 
              src={logoUrl} 
              alt="OviManager Logo" 
              className="w-48 h-48 rounded-2xl shadow-2xl object-contain bg-white border border-slate-200"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
               <button onClick={handleGenerate} className="bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-[10px] uppercase">Regerar</button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-4xl opacity-20">🐑💻</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum logotipo gerado</p>
          </div>
        )}
      </div>

      {!loading && !logoUrl && (
        <button 
          onClick={handleGenerate}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
        >
          Gerar Logotipo com IA
        </button>
      )}
      
      {logoUrl && !loading && (
        <p className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
          Sua marca foi gerada exclusivamente para este dispositivo.
        </p>
      )}
    </div>
  );
};

export default LogoGenerator;
