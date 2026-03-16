import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface CabanhaInfo {
  id?: string;
  nome: string;
  logo_url: string | null;
}

export const cabanhaService = {
  async getInfo(): Promise<CabanhaInfo | null> {
    if (!isSupabaseConfigured) {
      const local = localStorage.getItem('ovi_cabanha_info');
      return local ? JSON.parse(local) : null;
    }

    try {
      const { data, error } = await supabase
        .from('cabanha_info')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao buscar info da cabanha:', err);
      return null;
    }
  },

  async saveInfo(info: CabanhaInfo): Promise<void> {
    if (!isSupabaseConfigured) {
      localStorage.setItem('ovi_cabanha_info', JSON.stringify(info));
      return;
    }

    try {
      const existing = await this.getInfo();
      
      if (existing && existing.id) {
        const { error } = await supabase
          .from('cabanha_info')
          .update({
            nome: info.nome,
            logo_url: info.logo_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cabanha_info')
          .insert([{
            nome: info.nome,
            logo_url: info.logo_url
          }]);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Erro ao salvar info da cabanha:', err);
      throw err;
    }
  }
};
