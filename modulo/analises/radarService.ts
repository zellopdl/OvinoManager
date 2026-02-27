
import { supabase } from '../../lib/supabase';
import { RadarAnalise } from '../../types';

export const radarService = {
  async getAll(): Promise<RadarAnalise[]> {
    const { data, error } = await supabase
      .from('radar_analises')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async save(analise: Omit<RadarAnalise, 'id' | 'created_at' | 'status'>): Promise<RadarAnalise> {
    const { data, error } = await supabase
      .from('radar_analises')
      .insert([{ ...analise, status: 'pendente' }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('radar_analises')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async markAsExecuted(id: string): Promise<void> {
    const { error } = await supabase
      .from('radar_analises')
      .update({ status: 'executado' })
      .eq('id', id);
    
    if (error) throw error;
  }
};
