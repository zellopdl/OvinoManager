
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Sheep, Sanidade, Status } from '../../types';

const LOCAL_STORAGE_KEY = 'ovimanager_sheep_data';
const WEIGHT_STORAGE_KEY = 'ovimanager_weight_history';
const ECC_STORAGE_KEY = 'ovimanager_ecc_history';
const FAMACHA_STORAGE_KEY = 'ovimanager_famacha_history';

const getLocalData = (): Sheep[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  const sheep = data ? JSON.parse(data) : [];
  
  // Vincular históricos locais
  const weights = JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || '[]');
  const eccs = JSON.parse(localStorage.getItem(ECC_STORAGE_KEY) || '[]');
  const famachas = JSON.parse(localStorage.getItem(FAMACHA_STORAGE_KEY) || '[]');

  return sheep.map((s: Sheep) => ({
    ...s,
    historicoPeso: weights.filter((w: any) => w.ovelha_id === s.id),
    historicoECC: eccs.filter((e: any) => e.ovelha_id === s.id),
    historicoFamacha: famachas.filter((f: any) => f.ovelha_id === s.id)
  }));
};

const saveLocalData = (data: Sheep[]) => {
  // Remove os históricos antes de salvar para não duplicar no JSON principal
  const cleanData = data.map(({ historicoPeso, historicoECC, historicoFamacha, ...rest }) => rest);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanData));
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

const saveLocalECC = (ovelhaId: string, ecc: number, date?: string) => {
  const history = JSON.parse(localStorage.getItem(ECC_STORAGE_KEY) || '[]');
  history.push({
    id: crypto.randomUUID(),
    ovelha_id: ovelhaId,
    ecc: ecc,
    data: date || new Date().toISOString()
  });
  localStorage.setItem(ECC_STORAGE_KEY, JSON.stringify(history));
};

const saveLocalFamacha = (ovelhaId: string, famacha: number, date?: string) => {
  const history = JSON.parse(localStorage.getItem(FAMACHA_STORAGE_KEY) || '[]');
  history.push({
    id: crypto.randomUUID(),
    ovelha_id: ovelhaId,
    famacha: famacha,
    data: date || new Date().toISOString()
  });
  localStorage.setItem(FAMACHA_STORAGE_KEY, JSON.stringify(history));
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
        .select(`*, 
          historico_peso (id, peso, data),
          historico_ecc (id, ecc, data),
          historico_famacha (id, famacha, data)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((item: any) => ({
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
        historicoPeso: item.historico_peso,
        historicoECC: item.historico_ecc,
        historicoFamacha: item.historico_famacha
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
      
      const historyPromises = [];
      const timestamp = historyDate || new Date().toISOString();
      
      if (sheep.peso !== undefined && !isNaN(Number(sheep.peso))) {
        historyPromises.push(
          supabase.from('historico_peso').insert([{
            ovelha_id: id,
            peso: Number(sheep.peso),
            data: timestamp
          }]).then(({ error }: { error: any }) => { if (error) console.error("Erro historico_peso:", error); })
        );
      }

      if (sheep.ecc !== undefined && !isNaN(Number(sheep.ecc))) {
        historyPromises.push(
          supabase.from('historico_ecc').insert([{
            ovelha_id: id,
            ecc: Number(sheep.ecc),
            data: timestamp
          }]).then(({ error }: { error: any }) => { if (error) console.error("Erro historico_ecc:", error); })
        );
      }

      if (sheep.famacha !== undefined && !isNaN(Number(sheep.famacha))) {
        historyPromises.push(
          supabase.from('historico_famacha').insert([{
            ovelha_id: id,
            famacha: Number(sheep.famacha),
            data: timestamp
          }]).then(({ error }: { error: any }) => { if (error) console.error("Erro historico_famacha:", error); })
        );
      }

      if (historyPromises.length > 0) {
        await Promise.all(historyPromises);
      }
      
      return data?.[0];
    }
    const local = getLocalData();
    const index = local.findIndex(s => s.id === id);
    if (index !== -1) {
      const weightChanged = sheep.peso !== undefined && Number(sheep.peso) !== Number(local[index].peso);
      const eccChanged = sheep.ecc !== undefined && Number(sheep.ecc) !== Number(local[index].ecc);
      const famachaChanged = sheep.famacha !== undefined && Number(sheep.famacha) !== Number(local[index].famacha);

      local[index] = { ...local[index], ...sheep };
      saveLocalData(local);
      
      if (weightChanged) saveLocalWeight(id, Number(sheep.peso), historyDate);
      if (eccChanged) saveLocalECC(id, Number(sheep.ecc), historyDate);
      if (famachaChanged) saveLocalFamacha(id, Number(sheep.famacha), historyDate);
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
