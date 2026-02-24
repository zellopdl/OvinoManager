
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  headerExtra?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, headerExtra }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    const saved = localStorage.getItem('ovi_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ovi_sidebar_collapsed', String(isDesktopCollapsed));
  }, [isDesktopCollapsed]);

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: '📊', category: 'Principal' },
    { id: 'charts', label: 'Análises', icon: '📈', category: 'Principal' },
    { id: 'sheep', label: 'Rebanho', icon: '🐑', category: 'Principal' },
    { id: 'weight', label: 'Pesagem', icon: '⚖️', category: 'Operacional' },
    { id: 'repro', label: 'Reprodução', icon: '🧬', category: 'Operacional' },
    { id: 'manejo', label: 'Agenda', icon: '📅', category: 'Operacional' },
    { id: 'guia', label: 'Consultoria', icon: '💡', category: 'Suporte' },
    { id: 'racas', label: 'Raças', icon: '🏷️', category: 'Cadastros' },
    { id: 'piquetes', label: 'Piquetes', icon: '🌾', category: 'Cadastros' },
    { id: 'grupos', label: 'Grupos', icon: '👥', category: 'Cadastros' },
    { id: 'suppliers', label: 'Fornecedores', icon: '🚚', category: 'Cadastros' },
    { id: 'settings', label: 'Ajustes', icon: '⚙️', category: 'Sistema' },
  ];

  const bottomTabs = menuItems.filter(item => ['dashboard', 'sheep', 'manejo', 'guia'].includes(item.id));

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      try {
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        } else {
          localStorage.clear();
          window.location.reload();
        }
      } catch (e) {
        console.error("Erro ao sair:", e);
        window.location.reload();
      }
    }
  };

  return (
    <div className="flex h-safe-screen w-full bg-slate-50 overflow-hidden flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col bg-slate-900 text-white shadow-xl z-20 transition-all duration-300 ${isDesktopCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`p-5 border-b border-slate-800 flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-lg shadow-lg shrink-0">🐑</div>
          {!isDesktopCollapsed && <h1 className="text-lg font-black tracking-tight">OviManager</h1>}
        </div>
        
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar dark-scrollbar">
          {['Principal', 'Operacional', 'Suporte', 'Cadastros', 'Sistema'].map(cat => (
            <div key={cat} className="space-y-1">
              {!isDesktopCollapsed && <h3 className="px-3 text-[9px] uppercase tracking-widest text-slate-500 font-black mb-1">{cat}</h3>}
              {menuItems.filter(i => i.category === cat).map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center rounded-xl transition-all ${isDesktopCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'} ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>
                  <span className="text-base">{item.icon}</span>
                  {!isDesktopCollapsed && <span className="font-bold text-[11px] uppercase tracking-tight">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <button 
            onClick={handleLogout} 
            className={`w-full flex items-center rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all group ${isDesktopCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'}`}
            title="Sair do Sistema"
          >
            <span className="text-lg transition-transform group-hover:scale-110">🚪</span>
            {!isDesktopCollapsed && <span className="font-black text-[10px] uppercase tracking-widest">Sair do Sistema</span>}
          </button>
          
          <button onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)} className="w-full py-2 text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-tighter">
            {isDesktopCollapsed ? '➡️' : '⬅️ Recolher'}
          </button>
        </div>
      </aside>

      {/* Main Content Area - O Elevador Central */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="bg-white border-b border-slate-200 h-14 md:h-16 flex items-center justify-between px-4 md:px-8 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="md:hidden w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-sm shadow-sm">🐑</div>
            <h2 className="text-sm md:text-lg font-black text-slate-800 capitalize tracking-tight truncate max-w-[120px] sm:max-w-none">
              {menuItems.find(m => m.id === activeTab)?.label || 'OviManager'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 scale-90 md:scale-100 origin-right">
            {headerExtra}
          </div>
        </header>

        {/* Scroll Container Principal com padding extra para Mobile Nav */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50/50">
          <div className="max-w-7xl mx-auto p-3 md:p-8 pb-32 md:pb-12 view-transition">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav - Fixo */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center h-16 pb-safe z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] rounded-t-[24px]">
        {bottomTabs.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'}`}>
            <span className={`text-xl ${activeTab === item.id ? 'scale-110' : ''}`}>{item.icon}</span>
            <span className="text-[8px] font-black uppercase">{item.label}</span>
          </button>
        ))}
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-slate-400">
          <span className="text-xl">☰</span>
          <span className="text-[8px] font-black uppercase">Mais</span>
        </button>
      </nav>

      {/* Menu Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
           <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300 custom-scrollbar">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                 {menuItems.map(item => (
                    <button key={item.id} onClick={() => handleTabClick(item.id)} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${activeTab === item.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                       <span className="text-lg">{item.icon}</span>
                       <span className="font-bold text-[10px] uppercase">{item.label}</span>
                    </button>
                 ))}
              </div>

              <div className="pt-4 border-t border-slate-100 mb-6">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-4 p-5 bg-rose-50 text-rose-600 rounded-[24px] font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-sm border border-rose-100"
                >
                  <span className="text-2xl">🚪</span>
                  Sair do Sistema
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
