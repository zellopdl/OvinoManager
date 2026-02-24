
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Sheep, Sanidade, Status } from '../../types';

const LOCAL_STORAGE_KEY = 'ovimanager_sheep_data';
const WEIGHT_STORAGE_KEY = 'ovimanager_weight_history';

const getLocalData = (): Sheep[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalData = (data: Sheep[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

const saveLocalWeight = (ovelhaId: string, peso: number, date?: string) => {
  const history = JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || '[]');
  history.push({
    id: crypto.randomUUID(),
    ovelha_id: ovelhaId,
    peso: peso,
    data: date || new Date().toISOString()
  });
  localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(history));
};

const mapToDb = (sheep: Partial<Sheep>) => {
  const payload: any = {};
  if (sheep.brinco !== undefined) payload.brinco = typeof sheep.brinco === 'string' ? sheep.brinco.trim() : sheep.brinco;
  if (sheep.nome !== undefined) payload.nome = typeof sheep.nome === 'string' ? sheep.nome.trim() : sheep.nome;
  if (sheep.nascimento !== undefined) payload.nascimento = sheep.nascimento || null;
  if (sheep.sexo !== undefined) payload.sexo = sheep.sexo;
  if (sheep.racaId !== undefined) payload.raca_id = sheep.racaId || null;
  if (sheep.origem !== undefined) payload.origem = sheep.origem || null;
  if (sheep.piqueteId !== undefined) payload.piquete_id = sheep.piqueteId || null;
  if (sheep.grupoId !== undefined) payload.grupo_id = sheep.grupoId || null;
  if (sheep.peso !== undefined) payload.peso = Number(sheep.peso) || 0;
  if (sheep.saude !== undefined) payload.saude = sheep.saude || '';
  if (sheep.sanidade !== undefined) payload.sanidade = sheep.sanidade;
  if (sheep.famacha !== undefined) payload.famacha = Number(sheep.famacha) || 1;
  if (sheep.ecc !== undefined) payload.ecc = Number(sheep.ecc) || 3;
  if (sheep.status !== undefined) payload.status = sheep.status;
  if (sheep.prenha !== undefined) payload.prenha = !!sheep.prenha;
  if (sheep.pai !== undefined) payload.pai = sheep.pai?.trim() || null;
  if (sheep.mae !== undefined) payload.mae = sheep.mae?.trim() || null;
  if (sheep.obs !== undefined) payload.obs = sheep.obs?.trim() || '';
  return payload;
};

export const sheepService = {
  async getAll(): Promise<Sheep[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('ovelhas')
        .select(`*, historico_peso (id, peso, data)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        brinco: item.brinco,
        nome: item.nome,
        nascimento: item.nascimento,
        sexo: item.sexo,
        racaId: item.raca_id,
        origem: item.origem || 'Nascido na Fazenda',
        piqueteId: item.piquete_id,
        peso: Number(item.peso) || 0,
        saude: item.saude,
        sanidade: item.sanidade as Sanidade || Sanidade.SAUDAVEL,
        famacha: item.famacha,
        ecc: Number(item.ecc) || 3,
        grupoId: item.grupo_id,
        status: item.status as Status,
        prenha: item.prenha || false,
        pai: item.pai,
        mae: item.mae,
        obs: item.obs,
        createdAt: item.created_at,
        historicoPeso: item.historico_peso
      })) as Sheep[];
    }
    return getLocalData();
  },

  async create(sheep: Partial<Sheep>) {
    if (isSupabaseConfigured) {
      const payload = mapToDb(sheep);
      const { data, error } = await supabase.from('ovelhas').insert([payload]).select();
      if (error) throw error;
      if (data?.[0]?.id && payload.peso > 0) {
        await supabase.from('historico_peso').insert([{
          ovelha_id: data[0].id,
          peso: payload.peso,
          data: new Date().toISOString()
        }]);
      }
      return data?.[0];
    }
    const local = getLocalData();
    const newSheep = { ...sheep, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as Sheep;
    local.push(newSheep);
    saveLocalData(local);
    if (newSheep.peso > 0) saveLocalWeight(newSheep.id, newSheep.peso);
    return newSheep;
  },

  async update(id: string, sheep: Partial<Sheep>, historyDate?: string) {
    if (isSupabaseConfigured) {
      const payload = mapToDb(sheep);
      const { data, error } = await supabase.from('ovelhas').update(payload).eq('id', id).select();
      if (error) throw error;
      if (sheep.peso !== undefined) {
        await supabase.from('historico_peso').insert([{
          ovelha_id: id,
          peso: Number(sheep.peso),
          data: historyDate || new Date().toISOString()
        }]);
      }
      return data?.[0];
    }
    const local = getLocalData();
    const index = local.findIndex(s => s.id === id);
    if (index !== -1) {
      const weightChanged = sheep.peso !== undefined && Number(sheep.peso) !== Number(local[index].peso);
      local[index] = { ...local[index], ...sheep };
      saveLocalData(local);
      if (weightChanged) saveLocalWeight(id, Number(sheep.peso), historyDate);
    }
  },

  async delete(id: string) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('ovelhas').delete().eq('id', id);
      if (error) throw error;
    } else {
      const local = getLocalData().filter(s => s.id !== id);
      saveLocalData(local);
    }
  }
};
