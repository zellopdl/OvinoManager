
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BreedingRecord, BreedingStatus } from '../types';
import { sheepService } from './sheepService';

const REPRO_STORAGE_KEY = 'ovimanager_repro_data';

export const reproService = {
  async getAll(): Promise<BreedingRecord[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('reproducao')
        .select('*')
        .order('data_cobertura', { ascending: false });
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        matrizId: d.matriz_id,
        reprodutorId: d.reprodutor_id,
        dataCobertura: d.data_cobertura,
        dataPrevisaoParto: d.data_previsao_parto,
        dataPartoReal: d.data_parto_real,
        status: d.status as BreedingStatus,
        observacoes: d.observacoes,
        created_at: d.created_at
      }));
    }
    const local = localStorage.getItem(REPRO_STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  },

  async create(record: Partial<BreedingRecord>) {
    // Gestação ovina média: 150 dias
    const date = new Date(record.dataCobertura!);
    date.setDate(date.getDate() + 150);
    const previsao = date.toISOString().split('T')[0];
    
    const newRecord = {
      ...record,
      dataPrevisaoParto: previsao,
      status: BreedingStatus.COBERTA
    };

    if (isSupabaseConfigured) {
      const payload = {
        matriz_id: record.matrizId,
        reprodutor_id: record.reprodutorId,
        data_cobertura: record.dataCobertura,
        data_previsao_parto: previsao,
        status: BreedingStatus.COBERTA,
        observacoes: record.observacoes
      };
      const { data, error } = await supabase.from('reproducao').insert([payload]).select();
      if (error) throw error;
      return data?.[0];
    }

    const local = await this.getAll();
    const item = { ...newRecord, id: crypto.randomUUID(), created_at: new Date().toISOString() } as BreedingRecord;
    local.push(item);
    localStorage.setItem(REPRO_STORAGE_KEY, JSON.stringify(local));
    return item;
  },

  async updateStatus(id: string, status: BreedingStatus, dataParto?: string) {
    const records = await this.getAll();
    const record = records.find(r => r.id === id);
    
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('reproducao')
        .update({ status, data_parto_real: dataParto })
        .eq('id', id);
      if (error) throw error;
    } else {
      const index = records.findIndex(r => r.id === id);
      if (index !== -1) {
        records[index].status = status;
        if (dataParto) records[index].dataPartoReal = dataParto;
        localStorage.setItem(REPRO_STORAGE_KEY, JSON.stringify(records));
      }
    }

    // Se for confirmada, atualiza a ovelha para prenha
    if (record && status === BreedingStatus.CONFIRMADA) {
      await sheepService.update(record.matrizId, { prenha: true });
    }
    // Se for parto ou falha, remove o status de prenha
    if (record && (status === BreedingStatus.PARTO || status === BreedingStatus.FALHA)) {
      await sheepService.update(record.matrizId, { prenha: false });
    }
  },

  async delete(id: string) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('reproducao').delete().eq('id', id);
      if (error) throw error;
    } else {
      const local = (await this.getAll()).filter(r => r.id !== id);
      localStorage.setItem(REPRO_STORAGE_KEY, JSON.stringify(local));
    }
  }
};
