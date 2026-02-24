
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { KnowledgeEntry } from '../../types';

const LOCAL_STORAGE_KEY = 'ovimanager_knowledge_data';

const getLocalKnowledge = (): KnowledgeEntry[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalKnowledge = (data: KnowledgeEntry[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

export const knowledgeService = {
  async getAll(): Promise<KnowledgeEntry[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('conhecimento')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
    return getLocalKnowledge();
  },

  async create(entry: Partial<KnowledgeEntry>) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('conhecimento')
        .insert([entry])
        .select();

      if (error) throw error;
      return data?.[0];
    }
    const local = getLocalKnowledge();
    const newEntry = {
      ...entry,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    } as KnowledgeEntry;
    local.push(newEntry);
    saveLocalKnowledge(local);
    return newEntry;
  },

  async delete(id: string) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('conhecimento').delete().eq('id', id);
      if (error) throw error;
    } else {
      const local = getLocalKnowledge().filter(e => e.id !== id);
      saveLocalKnowledge(local);
    }
  }
};
