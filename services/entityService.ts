
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const entityService = {
  async getAll(tableName: string) {
    if (isSupabaseConfigured) {
      try {
        const orderByColumn = tableName === 'piquetes' ? 'piquete' : 'nome';
        const { data, error } = await supabase.from(tableName).select('*').order(orderByColumn);
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        if (err.name === 'AbortError') return [];
        console.error(`Error fetching ${tableName}:`, err);
        return [];
      }
    }
    const data = localStorage.getItem(`ovimanager_entity_${tableName}`);
    return data ? JSON.parse(data) : [];
  },

  async create(tableName: string, payload: any) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from(tableName).insert([payload]).select();
        if (error) throw new Error(error.message);
        return data?.[0];
      } catch (err) {
        console.error(`Error creating in ${tableName}:`, err);
        throw err;
      }
    }

    const data = await this.getAll(tableName);
    const newItem = { ...payload, id: crypto.randomUUID() };
    data.push(newItem);
    localStorage.setItem(`ovimanager_entity_${tableName}`, JSON.stringify(data));
    return newItem;
  },

  async update(tableName: string, id: string, payload: any) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select();
        if (error) throw new Error(error.message);
        return data?.[0];
      } catch (err) {
        console.error(`Error updating ${tableName}:`, err);
        throw err;
      }
    }

    const data = await this.getAll(tableName);
    const index = data.findIndex((i: any) => i.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...payload };
      localStorage.setItem(`ovimanager_entity_${tableName}`, JSON.stringify(data));
    }
  },

  async delete(tableName: string, id: string) {
    console.log(`[entityService] DELETE -> ${tableName} (ID: ${id})`);
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        
        if (error) {
          console.error(`[entityService] Erro Supabase:`, error);
          if (error.code === '23503') {
            throw new Error("⚠️ Bloqueio do Banco: Este item possui registros (mesmo históricos) vinculados a ele.");
          }
          throw new Error(error.message);
        }

        // Delay estratégico para garantir que o Supabase propagou a deleção
        // antes de fazermos o próximo fetch.
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log(`[entityService] Item excluído com sucesso.`);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        throw err;
      }
    } else {
      const currentData = await this.getAll(tableName);
      const filteredData = currentData.filter((i: any) => i.id !== id);
      localStorage.setItem(`ovimanager_entity_${tableName}`, JSON.stringify(filteredData));
    }
  }
};
