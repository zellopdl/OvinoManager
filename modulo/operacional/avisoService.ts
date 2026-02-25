
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  prioridade: 'normal' | 'alta' | 'urgente';
  autor?: string;
  created_at?: string;
}

export const avisoService = {
  async getAll(): Promise<Aviso[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('avisos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Erro ao buscar avisos (tabela pode não existir):", e);
      return [];
    }
  },

  async create(aviso: Partial<Aviso>) {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from('avisos')
      .insert([aviso])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('avisos').delete().eq('id', id);
    if (error) throw error;
  },

  async confirmRead(avisoId: string, userName: string) {
    if (!isSupabaseConfigured) return;
    
    // Get current confirmations
    const { data: aviso } = await supabase
      .from('avisos')
      .select('confirmacoes')
      .eq('id', avisoId)
      .single();
    
    const currentConfirmations = aviso?.confirmacoes || [];
    const alreadyConfirmed = currentConfirmations.some((c: any) => c.user === userName);
    
    if (alreadyConfirmed) return;

    const newConfirmation = {
      user: userName,
      at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('avisos')
      .update({
        confirmacoes: [...currentConfirmations, newConfirmation]
      })
      .eq('id', avisoId);

    if (error) throw error;
  }
};
