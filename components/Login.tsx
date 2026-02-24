
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos.' 
        : 'Erro ao tentar acessar o sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200">
          <div className="p-10 text-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/20 mx-auto mb-8 animate-bounce">
              🐑
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">OviManager</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Gestão Inteligente de Ovinocultura</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 pt-0 space-y-5">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[11px] font-black uppercase text-center animate-in shake duration-300">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
              <input 
                type="email" 
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <input 
                type="password" 
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm tracking-widest"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/10 transition-all active:scale-95 flex items-center justify-center gap-3 ${
                loading ? 'bg-slate-300 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
              Acesso restrito a colaboradores autorizados
            </p>
          </div>
        </div>

        <p className="text-center mt-8 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
          &copy; {new Date().getFullYear()} OviManager Pro &bull; v2.6.0
        </p>
      </div>
    </div>
  );
};

export default Login;
