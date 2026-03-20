import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { VacinacaoConfig } from './VacinacaoManager';

const TABLE_NAME = 'vacinacao_config';

// Helper to convert DB snake_case to camelCase
const mapFromDB = (data: any): VacinacaoConfig => ({
  hasRaiva: data.has_raiva,
  hasLeptospirose: data.has_leptospirose,
  hasPasteurelose: data.has_pasteurelose,
  hasLinfadenite: data.has_linfadenite,
  hasEctima: data.has_ectima,
  protocoloOficial: data.protocolo_oficial || '',
  tipoClostridiose: data.tipo_clostridiose || '8',
  vacinaRaivaDisp: data.vacina_raiva_disp,
  vacinaLeptoDisp: data.vacina_lepto_disp,
  vacinaPasteureloseDisp: data.vacina_pasteurelose_disp,
  outrasVacinas: data.outras_vacinas || '',
  temHistorico: data.tem_historico,
  historicoDetalhes: data.historico_detalhes || '',
  estacaoMonta: data.estacao_monta,
  prenhezMultipla: data.prenhez_multipla,
  reforcoGestacao: data.reforco_gestacao,
  mesAnual: data.mes_anual || 1,
  intervalo5Dias: data.intervalo_5_dias,
  quadroVisual: data.quadro_visual,
  agruparMensal: data.agrupar_mensal,
  diaBaseSemana: data.dia_base_semana || 3,
  diaBaseOrdem: data.dia_base_ordem || 2,
  intervaloEntreVacinas: data.intervalo_entre_vacinas || 5,
  updatedAt: data.updated_at,
});

// Helper to convert camelCase to DB snake_case
const mapToDB = (config: VacinacaoConfig): any => ({
  has_raiva: config.hasRaiva,
  has_leptospirose: config.hasLeptospirose,
  has_pasteurelose: config.hasPasteurelose,
  has_linfadenite: config.hasLinfadenite,
  has_ectima: config.hasEctima,
  protocolo_oficial: config.protocoloOficial,
  tipo_clostridiose: config.tipoClostridiose,
  vacina_raiva_disp: config.vacinaRaivaDisp,
  vacina_lepto_disp: config.vacinaLeptoDisp,
  vacina_pasteurelose_disp: config.vacinaPasteureloseDisp,
  outras_vacinas: config.outrasVacinas,
  tem_historico: config.temHistorico,
  historico_detalhes: config.historicoDetalhes,
  estacao_monta: config.estacaoMonta,
  prenhez_multipla: config.prenhezMultipla,
  reforco_gestacao: config.reforcoGestacao,
  mes_anual: config.mesAnual,
  intervalo_5_dias: config.intervalo5Dias,
  quadro_visual: config.quadroVisual,
  agrupar_mensal: config.agruparMensal,
  dia_base_semana: config.diaBaseSemana,
  dia_base_ordem: config.diaBaseOrdem,
  intervalo_entre_vacinas: config.intervaloEntreVacinas,
  updated_at: new Date().toISOString(),
});

export const vacinacaoService = {
  async getConfirmedVaccinations(sheepId?: string): Promise<string[]> {
    if (!isSupabaseConfigured) {
      const local = localStorage.getItem('ovi_vacinacao_history');
      const history = local ? JSON.parse(local) : [];
      if (sheepId) {
        return history
          .filter((h: string) => h.includes(`_sid:${sheepId}`))
          .map((h: string) => h.replace(`_sid:${sheepId}`, ''));
      }
      return history;
    }

    try {
      let query = supabase
        .from('vacinacao_history')
        .select('date, vaccine, type');
      
      if (sheepId) {
        query = query.like('type', `%_sid:${sheepId}`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data ? data.map((d: any) => `${d.date}_${d.vaccine}_${d.type}`) : [];
    } catch (err) {
      console.error('Erro ao buscar histórico de vacinação:', err);
      return [];
    }
  },

  async confirmVaccination(date: string, vaccine: string, type: string, sheepId?: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const local = localStorage.getItem('ovi_vacinacao_history');
      const history = local ? JSON.parse(local) : [];
      const entry = sheepId ? `${date}_${vaccine}_${type}_sid:${sheepId}` : `${date}_${vaccine}_${type}`;
      history.push(entry);
      localStorage.setItem('ovi_vacinacao_history', JSON.stringify(history));
      return;
    }

    try {
      const finalType = sheepId ? `${type}_sid:${sheepId}` : type;
      const { error } = await supabase
        .from('vacinacao_history')
        .insert([{ date, vaccine, type: finalType }]);
      
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao confirmar vacinação:', err);
      throw err;
    }
  },

  async getConfig(): Promise<VacinacaoConfig | null> {
    if (!isSupabaseConfigured) {
      const local = localStorage.getItem('ovi_vacinacao_config');
      return local ? JSON.parse(local) : null;
    }

    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar configuração de vacinação:', error);
        // Fallback to local if DB fails
        const local = localStorage.getItem('ovi_vacinacao_config');
        return local ? JSON.parse(local) : null;
      }

      if (!data) {
        const local = localStorage.getItem('ovi_vacinacao_config');
        return local ? JSON.parse(local) : null;
      }

      return mapFromDB(data);
    } catch (err) {
      console.error('Exceção ao buscar configuração de vacinação:', err);
      const local = localStorage.getItem('ovi_vacinacao_config');
      return local ? JSON.parse(local) : null;
    }
  },

  async saveConfig(config: VacinacaoConfig): Promise<void> {
    if (!isSupabaseConfigured) {
      localStorage.setItem('ovi_vacinacao_config', JSON.stringify(config));
      return;
    }

    try {
      // Check if one exists to update, or insert new
      const { data: existing } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error if no rows

      if (existing) {
        const { error } = await supabase
          .from(TABLE_NAME)
          .update(mapToDB(config))
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(TABLE_NAME)
          .insert([mapToDB(config)]);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Erro ao salvar no Supabase, salvando localmente:', err);
      // Fallback to localStorage if DB fails (e.g. missing columns)
      localStorage.setItem('ovi_vacinacao_config', JSON.stringify(config));
    }
  },

  async deleteConfig(): Promise<void> {
    if (!isSupabaseConfigured) {
      localStorage.removeItem('ovi_vacinacao_config');
      return;
    }

    try {
      const { data: existing, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Erro ao buscar configuração para deletar:', fetchError);
        throw fetchError;
      }

      if (existing) {
        const { error } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Erro ao deletar configuração de vacinação:', err);
      throw err;
    }
  }
};
