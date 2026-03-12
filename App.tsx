
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './modulo/sistema/Layout.tsx';
import Dashboard from './modulo/dashboard/Dashboard.tsx';
import ChartsView from './modulo/analises/ChartsView.tsx';
import SheepTable from './modulo/rebanho/SheepTable.tsx';
import SheepForm from './modulo/rebanho/SheepForm.tsx';
import ManejoManager from './modulo/manejo/ManejoManager.tsx';
import KnowledgeAssistant from './modulo/suporte/KnowledgeAssistant.tsx';
import EntityManager from './modulo/cadastros/EntityManager.tsx';
import PaddockManager from './modulo/cadastros/PaddockManager.tsx';
import SupplierManager from './modulo/cadastros/SupplierManager.tsx';
import LogoGenerator from './modulo/sistema/LogoGenerator.tsx';
import WeightManager from './modulo/manejo/WeightManager.tsx';
import ECCManager from './modulo/manejo/ECCManager.tsx';
import FamachaManager from './modulo/manejo/FamachaManager.tsx';
import ReproductionManager from './modulo/reproducao/ReproductionManager.tsx';
import Login from './modulo/sistema/Login.tsx';
import NoticeBoard from './modulo/operacional/NoticeBoard.tsx';

import { Sheep, Breed, Supplier, Group, Paddock, BreedingPlan, Manejo, ProtocoloManejo, Perfil, StatusManejo } from './types.ts';
import { sheepService } from './modulo/rebanho/sheepService.ts';
import { entityService } from './modulo/cadastros/entityService.ts';
import { breedingPlanService } from './modulo/reproducao/breedingPlanService.ts';
import { manejoService } from './modulo/manejo/manejoService.ts';
import { getSheepInsight } from './modulo/dashboard/geminiService.ts';
import { supabase, isSupabaseConfigured } from './lib/supabase.ts';
import { SUPABASE_SCHEMA_SQL } from './constants.tsx';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingSheep, setEditingSheep] = useState<Sheep | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [perfilLoading, setPerfilLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeProtocolTask, setActiveProtocolTask] = useState<Manejo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'online' | 'local'>('connecting');
  const [aiStatus, setAiStatus] = useState<'online' | 'error' | 'none'>(
    (process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY) ? 'online' : 'none'
  );
  
  useEffect(() => {
    const checkAiKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (hasKey) setAiStatus('online');
      }
    };
    checkAiKey();
  }, []);

  const handleOpenAiKey = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setAiStatus('online');
    }
  };

  const [analysisSheep, setAnalysisSheep] = useState<Sheep | null>(null);
  const [analysisText, setAnalysisText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const [managerPassword, setManagerPassword] = useState(() => localStorage.getItem('ovi_manager_pwd') || '1234');
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [unlockInput, setUnlockInput] = useState('');

  const [sheep, setSheep] = useState<Sheep[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [paddocks, setPaddocks] = useState<Paddock[]>([]);
  const [breedingPlans, setBreedingPlans] = useState<BreedingPlan[]>([]);
  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      setPerfilLoading(true);
      const timeoutId = setTimeout(() => {
        console.warn("Perfil loading timeout");
        setPerfilLoading(false);
      }, 5000);

      supabase
        .from('perfis')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }: { data: any }) => {
          clearTimeout(timeoutId);
          if (data) {
            setPerfil(data);
            if (data.role === 'operador') {
              setActiveTab('noticeboard');
            }
          }
          setPerfilLoading(false);
        })
        .catch(() => {
          clearTimeout(timeoutId);
          setPerfilLoading(false);
        });
    } else {
      setPerfil(null);
      setPerfilLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
        setSession(session);
        setAuthLoading(false);
      }).catch(() => setAuthLoading(false));

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        setSession(session);
        setAuthLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      setAuthLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async (forceLocal = false) => {
    if (!session && isSupabaseConfigured) return;
    
    try {
      if (!forceLocal && isSupabaseConfigured) setConnectionStatus('connecting');
      else setConnectionStatus('local');
      
      // Carregamento em paralelo para máxima velocidade
      const [sData, bData, supData, gData, pData, bpData, mData] = await Promise.all([
        sheepService.getAll().catch(() => []),
        entityService.getAll('racas').catch(() => []),
        entityService.getAll('fornecedores').catch(() => []),
        entityService.getAll('grupos').catch(() => []),
        entityService.getAll('piquetes').catch(() => []),
        breedingPlanService.getAll().catch(() => []),
        manejoService.getAll().catch(() => [])
      ]);
      
      setSheep(sData || []); 
      setBreeds(bData || []); 
      setSuppliers(supData || []); 
      setGroups(gData || []); 
      setPaddocks((pData as Paddock[]) || []);
      setBreedingPlans(bpData || []);
      setManejos(mData || []);
      
      if (!forceLocal && isSupabaseConfigured) setConnectionStatus('online');
    } catch (err) {
      setConnectionStatus('local');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { 
    if (session || !isSupabaseConfigured) {
      loadInitialData(); 
    }

    // Inscrição em tempo real para manejos (importante para liberação dinâmica de módulos)
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('app_manejos_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'manejos' }, () => {
          loadInitialData();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadInitialData, session]);

  const handleAnalyzeSheep = async (s: Sheep) => {
    setAnalysisSheep(s);
    setAnalyzing(true);
    setAnalysisText('');
    
    // TRADUÇÃO DE IDs PARA NOMES REAIS PARA A IA
    const breedName = breeds.find(b => b.id === s.racaId)?.nome || 'SRD';
    const paddockName = paddocks.find(p => p.id === s.piqueteId)?.piquete || 'Área não definida';
    
    try {
      const res = await getSheepInsight(s, breedName, paddockName);
      setAnalysisText(res || "Não foi possível gerar análise.");
    } catch (err) {
      setAnalysisText("Erro ao conectar com a inteligência artificial.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUnlock = () => {
    if (unlockInput === managerPassword) {
      setIsSettingsUnlocked(true);
      setUnlockInput('');
    } else {
      alert("Senha incorreta!");
      setUnlockInput('');
    }
  };

  const copySqlSchema = () => { navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL); alert("SQL Copiado!"); };

  const handleLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      setPerfil(null);
      if (isSupabaseConfigured) {
        supabase.auth.signOut().catch(() => {});
      }
      window.location.replace('/');
    } catch (e) {
      window.location.replace('/');
    }
  };

  const HeaderActions = (
    <div className="flex items-center gap-2">
      <button 
        onClick={handleOpenAiKey}
        className={`flex items-center gap-2 px-3 py-1.5 border rounded-full transition-all ${aiStatus === 'online' ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100 hover:bg-rose-100'}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${aiStatus === 'online' ? 'bg-indigo-500 animate-pulse' : 'bg-rose-500'}`}></div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${aiStatus === 'online' ? 'text-indigo-600' : 'text-rose-600'}`}>
          {aiStatus === 'online' ? 'Gemini 3.0' : 'Habilitar IA'}
        </span>
      </button>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">{connectionStatus === 'online' ? 'Nuvem' : 'Local'}</span>
      </div>
    </div>
  );

  const handleSheepSubmit = async (data: Partial<Sheep>) => {
    setIsSaving(true);
    try {
      if (editingSheep) await sheepService.update(editingSheep.id, data);
      else await sheepService.create(data);
      await loadInitialData();
      setView('list');
    } catch (err: any) { alert("Erro ao salvar animal."); }
    finally { setIsSaving(false); }
  };

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center py-40 animate-pulse"><div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div></div>;
    const safeSheep = sheep || [];
    switch (activeTab) {
      case 'dashboard': return <Dashboard sheep={safeSheep} breeds={breeds} groups={groups} paddocks={paddocks} plans={breedingPlans} onRefresh={loadInitialData} />;
      case 'charts': return <ChartsView sheep={safeSheep} breeds={breeds} groups={groups} />;
      case 'guia': return <KnowledgeAssistant />;
      case 'manejo': return <ManejoManager sheep={safeSheep} paddocks={paddocks} groups={groups} onRefreshSheep={loadInitialData} managerPassword={managerPassword} />;
      case 'weight': return <WeightManager sheep={safeSheep} groups={groups} paddocks={paddocks} onRefresh={loadInitialData} />;
      case 'ecc': return <ECCManager sheep={safeSheep} groups={groups} paddocks={paddocks} onRefresh={loadInitialData} />;
      case 'famacha': return <FamachaManager sheep={safeSheep} groups={groups} paddocks={paddocks} onRefresh={loadInitialData} />;
      case 'repro': return <ReproductionManager sheep={safeSheep} groups={groups} onRefresh={loadInitialData} managerPassword={managerPassword} />;
      case 'sheep':
        return view === 'list' ? (
          <SheepTable sheep={safeSheep} breeds={breeds} suppliers={suppliers} groups={groups} paddocks={paddocks}
            onEdit={(s) => { setEditingSheep(s); setView('form'); }}
            onDelete={async (id) => { if(confirm("Confirma exclusão?")) { await sheepService.delete(id); await loadInitialData(); } }}
            onAdd={() => { setEditingSheep(undefined); setView('form'); }}
            onAnalyze={handleAnalyzeSheep} />
        ) : (
          <SheepForm sheep={editingSheep} breeds={breeds} suppliers={suppliers} groups={groups} paddocks={paddocks}
            onSubmit={handleSheepSubmit} 
            onCancel={() => setView('list')} 
            existingSheep={safeSheep} />
        );
      case 'racas': return <EntityManager title="Raças" tableName="racas" icon="🏷️" initialData={breeds} onRefresh={loadInitialData} sheep={safeSheep} />;
      case 'noticeboard': return <NoticeBoard onStartProtocol={(task) => {
        setActiveProtocolTask(task);
        if (task.protocolo === ProtocoloManejo.PESAGEM) setActiveTab('weight');
        else if (task.protocolo === ProtocoloManejo.FAMACHA) setActiveTab('famacha');
        else if (task.protocolo === ProtocoloManejo.ECC) setActiveTab('ecc');
        else if (task.protocolo === ProtocoloManejo.REPRODUCAO) setActiveTab('repro');
      }} />;
      case 'grupos': return <EntityManager title="Grupos" tableName="grupos" icon="👥" initialData={groups} onRefresh={loadInitialData} sheep={safeSheep} />;
      case 'piquetes': return <PaddockManager initialData={paddocks} onRefresh={loadInitialData} sheep={safeSheep} />;
      case 'suppliers': return <SupplierManager initialData={suppliers} onRefresh={loadInitialData} sheep={safeSheep} />;
      case 'settings': return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
          {!isSettingsUnlocked ? (
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl text-center">
              <h3 className="text-xl font-black text-slate-800 uppercase mb-8">Acesso Restrito</h3>
              <input type="password" autoFocus placeholder="Senha" className="w-full p-4 bg-slate-50 border rounded-2xl text-center mb-4" value={unlockInput} onChange={(e) => setUnlockInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} />
              <button onClick={handleUnlock} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Liberar</button>
            </div>
          ) : (
            <div className="space-y-6">
              <LogoGenerator />
              <div className="bg-white p-6 rounded-2xl border">
                <button onClick={copySqlSchema} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px]">Copiar Script SQL Supabase</button>
              </div>
              <button onClick={handleLogout} className="w-full py-4 bg-rose-50 text-rose-600 rounded-xl font-black uppercase text-[10px]">Sair do Sistema</button>
            </div>
          )}
        </div>
      );
      default: return null;
    }
  };

  const isOperator = perfil ? perfil.role === 'operador' : session?.user?.email === 'operador@ovimanager.com';

  // 1. Carregando Autenticação
  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Iniciando Sistema...</p>
      </div>
    </div>
  );

  // 2. Sem Sessão -> Tela de Login
  if (!session && isSupabaseConfigured) return <Login />;

  // 3. Com Sessão, mas carregando Perfil
  if (session && perfilLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Sincronizando Perfil...</p>
        <button 
          onClick={handleLogout}
          className="mt-8 px-6 py-2 bg-rose-600/20 text-rose-500 rounded-xl font-black uppercase text-[10px] tracking-widest border border-rose-500/30"
        >
          Cancelar e Sair
        </button>
      </div>
    </div>
  );

  // Se for operador e não estiver em um protocolo, mostra o Quadro de Avisos em tela cheia
  if (isOperator && !activeProtocolTask) {
    return <NoticeBoard key="operator-notice-board" onStartProtocol={(task) => {
      setActiveProtocolTask(task);
      // Mapeia o protocolo para a aba correta
      if (task.protocolo === ProtocoloManejo.PESAGEM) setActiveTab('weight');
      else if (task.protocolo === ProtocoloManejo.FAMACHA) setActiveTab('famacha');
      else if (task.protocolo === ProtocoloManejo.ECC) setActiveTab('ecc');
      else if (task.protocolo === ProtocoloManejo.REPRODUCAO) setActiveTab('repro');
    }} />;
  }

  const HeaderExtra = (
    <div className="flex items-center gap-4">
      {isOperator && activeProtocolTask && (
        <button 
          onClick={() => {
            setActiveProtocolTask(null);
            setActiveTab('noticeboard');
          }}
          className="px-6 py-2.5 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl animate-pulse flex items-center gap-2 hover:bg-rose-700 transition-all active:scale-95 border-2 border-rose-500/50"
        >
          <span>⬅️</span>
          <span>Finalizar e Voltar ao Mural</span>
        </button>
      )}
      {HeaderActions}
    </div>
  );

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      headerExtra={HeaderExtra} 
      isOperator={isOperator} 
      activeProtocolTask={activeProtocolTask}
    >
      <div className="min-h-[80vh] flex flex-col">{renderContent()}</div>
      {analysisSheep && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden p-8 animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-4 uppercase">Análise IA: {analysisSheep.nome}</h3>
            <div className="bg-indigo-50 p-6 rounded-2xl max-h-[50vh] overflow-y-auto custom-scrollbar italic text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
               {analyzing ? "Consultando inteligência biológica..." : analysisText}
            </div>
            <button onClick={() => setAnalysisSheep(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl mt-6 uppercase font-black tracking-widest active:scale-95 transition-all shadow-lg">Fechar</button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
