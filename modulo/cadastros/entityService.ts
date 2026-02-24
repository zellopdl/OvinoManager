
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const entityService = {
  async getAll(tableName: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from(tableName).select('*').order(tableName === 'piquetes' ? 'piquete' : 'nome');
      if (error) return [];
      return data || [];
    }
    const data = localStorage.getItem(`ovimanager_entity_${tableName}`);
    return data ? JSON.parse(data) : [];
  },

  async create(tableName: string, payload: any) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from(tableName).insert([payload]).select();
      if (error) throw error;
      return data?.[0];
    }
    const data = await this.getAll(tableName);
    const newItem = { ...payload, id: crypto.randomUUID() };
    data.push(newItem);
    localStorage.setItem(`ovimanager_entity_${tableName}`, JSON.stringify(data));
    return newItem;
  },

  async update(tableName: string, id: string, payload: any) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select();
      if (error) throw error;
      return data?.[0];
    }
    const data = await this.getAll(tableName);
    const index = data.findIndex((i: any) => i.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...payload };
      localStorage.setItem(`ovimanager_entity_${tableName}`, JSON.stringify(data));
    }
  },

  async delete(tableName: string, id: string) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    } else {
      const currentData = await this.getAll(tableName);
      const filteredData = currentData.filter((i: any) => i.id !== id);
      localStorage.setItem(`ovimanager_entity_${tableName}`, JSON.stringify(filteredData));
    }
  }
};
