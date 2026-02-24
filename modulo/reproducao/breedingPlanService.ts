import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { BreedingPlan, BreedingPlanEwe, BreedingCycleResult, BreedingStatus, Group } from '../../types';
import { sheepService } from '../rebanho/sheepService';
import { reproService } from './reproService';
import { entityService } from '../cadastros/entityService';

export const breedingPlanService = {
  async getAll(): Promise<BreedingPlan[]> {
    if (!isSupabaseConfigured) return [];
    
    // Busca os lotes
    const { data: lotes, error: errLotes } = await supabase
      .from('lotes_monta')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (errLotes) throw errLotes;

    // Busca os animais vinculados em todos os lotes
    const { data: ovelhasLote, error: errOvelhas } = await supabase
      .from('lote_ovelhas')
      .select('*');
    
    if (errOvelhas) {
       console.warn("Tabela lote_ovelhas não encontrada. Certifique-se de rodar o SQL de migração.");
       return (lotes || []).map(l => ({ ...l, ovelhas: [] }));
    }

    return (lotes || []).map(l => ({
      id: l.id,
      nome: l.nome,
      reprodutorId: l.reprodutor_id,
      dataInicioMonta: l.data_inicio_monta,
      status: l.status,
      ovelhas: (ovelhasLote || [])
        .filter(o => o.lote_id === l.id)
        .map(o => ({
          id: o.id,
          loteId: o.lote_id,
          eweId: o.ovelha_id,
          tentativas: o.tentativas,
          ciclo1: o.ciclo1_resultado as BreedingCycleResult,
          ciclo2: o.ciclo2_resultado as BreedingCycleResult,
          ciclo3: o.ciclo3_resultado as BreedingCycleResult,
          finalizado: o.finalizado
        })),
      created_at: l.created_at
    }));
  },

  async create(plan: Partial<BreedingPlan>) {
    const { data, error } = await supabase
      .from('lotes_monta')
      .insert([{
        nome: plan.nome,
        data_inicio_monta: plan.dataInicioMonta,
        reprodutor_id: plan.reprodutorId,
        status: plan.status || 'em_monta'
      }])
      .select();
    
    if (error) throw error;
    return data?.[0];
  },

  async delete(id: string) {
    // Ao deletar o lote, liberamos as ovelhas primeiro
    const { data: ovelhas } = await supabase.from('lote_ovelhas').select('ovelha_id').eq('lote_id', id);
    
    if (ovelhas && ovelhas.length > 0) {
      const vaziaId = await breedingPlanService.getOrCreateVaziaGroup();
      await Promise.all(ovelhas.map(o => 
        sheepService.update(o.ovelha_id, { grupoId: vaziaId || undefined, prenha: false })
      ));
    }
    
    const { error } = await supabase.from('lotes_monta').delete().eq('id', id);
    if (error) throw error;
  },

  async addEwe(loteId: string, eweId: string) {
    // Cria o vínculo na tabela de ligação
    const { error: errLink } = await supabase.from('lote_ovelhas').insert([{
      lote_id: loteId,
      ovelha_id: eweId
    }]);
    if (errLink) throw errLink;

    // Altera o grupo da ovelha para 'EM MONTA'
    let emMontaGroup = await breedingPlanService.getGroupByName('EM MONTA');
    if (!emMontaGroup) {
      const created = await entityService.create('grupos', { nome: 'EM MONTA' });
      emMontaGroup = created?.id;
    }
    
    await sheepService.update(eweId, { grupoId: emMontaGroup || null });
  },

  async removeEwe(loteOvelhaId: string, eweId: string, loteId: string) {
    // 1. Remove o vínculo pelo ID primário da tabela de ligação
    const { error } = await supabase
      .from('lote_ovelhas')
      .delete()
      .eq('id', loteOvelhaId);
    
    if (error) throw error;

    // 2. Retorna o animal para o grupo 'VAZIAS'
    const vaziaId = await breedingPlanService.getOrCreateVaziaGroup();
    await sheepService.update(eweId, { grupoId: vaziaId || null, prenha: false });

    // 3. Limpa qualquer registro de reprodução confirmado que tenha sido gerado por este lote
    try {
      const records = await reproService.getAll();
      const pendente = records.find(r => 
        r.matrizId === eweId && 
        r.loteOrigemId === loteId && 
        r.status === BreedingStatus.CONFIRMADA
      );
      if (pendente) await reproService.delete(pendente.id);
    } catch (e) {
      console.warn("Aviso: Falha ao limpar histórico de repro, mas animal removido do lote.");
    }
  },

  async updateEweResult(loteId: string, eweId: string, ciclo: 1 | 2 | 3, resultado: BreedingCycleResult) {
    const isPrenha = resultado === BreedingCycleResult.PRENHA;
    const isVaziaFinal = ciclo === 3 && resultado === BreedingCycleResult.VAZIA;
    const finalizado = isPrenha || isVaziaFinal;

    const column = `ciclo${ciclo}_resultado`;
    const payload: any = { [column]: resultado, finalizado };
    
    if (!isPrenha && !finalizado && ciclo < 3) {
      payload.tentativas = ciclo + 1;
    }

    const { error } = await supabase
      .from('lote_ovelhas')
      .update(payload)
      .match({ lote_id: loteId, ovelha_id: eweId });
    
    if (error) throw error;

    if (isPrenha) {
      const { data: lote } = await supabase.from('lotes_monta').select('*').eq('id', loteId).single();
      await reproService.create({
        matrizId: eweId,
        reprodutorId: lote.reprodutor_id,
        dataCobertura: lote.data_inicio_monta,
        status: BreedingStatus.CONFIRMADA,
        loteOrigemId: loteId
      });
      await sheepService.update(eweId, { prenha: true });
    }
  },

  async getOrCreateVaziaGroup(): Promise<string | null> {
    const groups = await entityService.getAll('grupos') as Group[];
    const found = groups.find(g => ['VAZIA', 'VAZIAS', 'MATRIZES VAZIAS'].includes(g.nome.toUpperCase().trim()));
    if (found) return found.id;
    const created = await entityService.create('grupos', { nome: 'VAZIAS' });
    return created?.id || null;
  },

  async getGroupByName(name: string): Promise<string | null> {
    const groups = await entityService.getAll('grupos') as Group[];
    const found = groups.find(g => g.nome.toUpperCase().trim() === name.toUpperCase().trim());
    return found?.id || null;
  }
};