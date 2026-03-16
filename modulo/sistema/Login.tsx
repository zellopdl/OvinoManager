
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cabanha, setCabanha] = useState<any>(null);

  useEffect(() => {
    const fetchCabanha = async () => {
      const { data } = await supabase.from('cabanha_info').select('*').limit(1).maybeSingle();
      if (data) setCabanha(data);
    };
    fetchCabanha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Cadastro realizado! Verifique seu e-mail ou faça login.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border border-slate-200">
        <div className="text-center mb-8">
          {cabanha?.logo_url ? (
            <img src={cabanha.logo_url} alt="Logo" className="w-20 h-20 bg-white rounded-3xl object-contain mx-auto mb-4 animate-in fade-in zoom-in duration-500" />
          ) : (
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">🐑</div>
          )}
          <h1 className="text-2xl font-black text-slate-900 uppercase leading-none">OVINO-MANAGER</h1>
          {cabanha?.nome && (
            <p className="text-sm font-bold text-emerald-600 uppercase mt-1">{cabanha.nome}</p>
          )}
          <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-widest">
            {isSignUp ? 'Crie sua conta' : 'Acesse o sistema'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase text-center">{error}</div>}
          {message && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase text-center">{message}</div>}
          
          <input type="email" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
          
          <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
            {loading ? 'Processando...' : isSignUp ? 'Criar Conta' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
          >
            {isSignUp ? 'Já tem conta? Faça Login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
