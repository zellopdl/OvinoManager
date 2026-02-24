
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">🐑</div>
          <h1 className="text-3xl font-black text-slate-900 uppercase">OviManager</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase text-center">{error}</div>}
          <input type="email" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
            {loading ? 'Acessando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
