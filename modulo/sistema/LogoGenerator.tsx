
import React, { useState, useEffect } from 'react';
import { generateAppLogo } from '../dashboard/geminiService';
import { cabanhaService, CabanhaInfo } from './cabanhaService';

const LogoGenerator: React.FC = () => {
  const [farmName, setFarmName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadInfo = async () => {
      const info = await cabanhaService.getInfo();
      if (info) {
        setFarmName(info.nome);
        setLogoUrl(info.logo_url);
      } else {
        // Fallback for old local storage
        const oldLogo = localStorage.getItem('ovi_generated_logo');
        if (oldLogo) setLogoUrl(oldLogo);
      }
    };
    loadInfo();
  }, []);

  const handleGenerate = async () => {
    if (!farmName.trim()) {
      alert("Por favor, informe o nome da Cabanha antes de gerar o logotipo.");
      return;
    }
    
    setLoading(true);
    const url = await generateAppLogo(farmName);
    if (url) {
      setLogoUrl(url);
      localStorage.setItem('ovi_generated_logo', url); // Keep local backup
      await handleSave(farmName, url);
    } else {
      alert("Erro ao gerar logo.");
    }
    setLoading(false);
  };

  const handleSave = async (nameToSave: string, urlToSave: string | null) => {
    setSaving(true);
    try {
      await cabanhaService.saveInfo({
        nome: nameToSave,
        logo_url: urlToSave
      });
    } catch (err) {
      console.error("Erro ao salvar informações da cabanha", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNameOnly = async () => {
    if (!farmName.trim()) return;
    await handleSave(farmName, logoUrl);
    alert("Nome da Cabanha salvo com sucesso!");
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">🎨 Identidade da Cabanha</h3>
      
      <div className="space-y-2">
        <label className="block text-xs font-black text-slate-500 uppercase">Nome da Cabanha</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            placeholder="Ex: Cabanha São José"
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm focus:border-indigo-500 outline-none"
          />
          <button 
            onClick={handleSaveNameOnly}
            disabled={saving || !farmName.trim()}
            className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 min-h-[200px] bg-slate-50">
        {loading ? <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div> : 
         logoUrl ? <img src={logoUrl} className="w-40 h-40 rounded-xl shadow-lg object-contain" alt="Logo" /> : 
         <p className="text-slate-400 font-black text-[10px] uppercase">Sem logo gerado</p>}
      </div>
      <button 
        onClick={handleGenerate} 
        disabled={loading || !farmName.trim()}
        className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
      >
        {loading ? 'Gerando...' : 'Gerar Logotipo com IA'}
      </button>
    </div>
  );
};

export default LogoGenerator;
