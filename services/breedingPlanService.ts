
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BreedingPlan, BreedingPlanEwe, BreedingCycleResult, Status, BreedingStatus } from '../types';
import { sheepService } from './sheepService';
import { reproService } from './reproService';
import { entityService } from './entityService';

const STORAGE_KEY = 'ovimanager_breeding_plans';

const getLocalPlans = (): BreedingPlan[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalPlans = (plans: BreedingPlan[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

export const breedingPlanService = {
  async getAll(): Promise<BreedingPlan[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('lotes_monta')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return (data || []).map(d => ({
          id: d.id,
          nome: d.nome,
          reprodutorId: d.reprodutor_id,
          dataSincronizacao: d.data_sincronizacao,
          dataInicioMonta: d.data_inicio_monta,
          status: d.status,
          ovelhas: d.ovelhas_json || [],
          created_at: d.created_at
        }));
      } catch (err) {
        console.error("Erro Supabase (breedingPlanService.getAll):", err);
        return getLocalPlans();
      }
    }
    return getLocalPlans();
  },

  async create(plan: Partial<BreedingPlan>) {
    /**
     * Fix: dataSincronizacao is now part of BreedingPlan interface.
     */
    const payload = {
      nome: plan.nome,
      data_sincronizacao: plan.dataSincronizacao,
      data_inicio_monta: plan.dataInicioMonta,
      status: plan.status || 'em_monta',
      reprodutor_id: plan.reprodutorId,
      ovelhas_json: plan.ovelhas || []
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('lotes_monta').insert([payload]).select();
      if (error) throw error;
      return data?.[0];
    }
    
    const local = getLocalPlans();
    const newItem = { ...plan, id: crypto.randomUUID(), created_at: new Date().toISOString() } as BreedingPlan;
    local.push(newItem);
    saveLocalPlans(local);
    return newItem;
  },

  async update(id: string, plan: Partial<BreedingPlan>) {
    if (isSupabaseConfigured) {
      const payload: any = {};
      if (plan.nome !== undefined) payload.nome = plan.nome;
      /**
       * Fix: dataSincronizacao is now part of BreedingPlan interface.
       */
      if (plan.dataSincronizacao !== undefined) payload.data_sincronizacao = plan.dataSincronizacao;
      if (plan.dataInicioMonta !== undefined) payload.data_inicio_monta = plan.dataInicioMonta;
      if (plan.status !== undefined) payload.status = plan.status;
      if (plan.ovelhas !== undefined) payload.ovelhas_json = plan.ovelhas;
      if (plan.reprodutorId !== undefined) payload.reprodutor_id = plan.reprodutorId;

      const { error } = await supabase.from('lotes_monta').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const local = getLocalPlans();
      const index = local.findIndex(p => p.id === id);
      if (index !== -1) {
        local[index] = { ...local[index], ...plan };
        saveLocalPlans(local);
      }
    }
  },

  async returnEweToVazias(eweId: string) {
    try {
      const allGroups = await entityService.getAll('grupos');
      const vaziasGroup = allGroups.find((g: any) => 
        ['VAZIAS', 'VAZIA', 'MATRIZES VAZIAS'].includes(g.nome.toUpperCase().trim())
      );
      // Remove o vínculo de prenhez e volta para o grupo de vazias
      await sheepService.update(eweId, { grupoId: vaziasGroup ? vaziasGroup.id : null, prenha: false });
    } catch (e) { console.error("Erro ao retornar animal para vazias:", e); }
  },

  async delete(id: string) {
    const plans = await breedingPlanService.getAll();
    const plan = plans.find(p => p.id === id);
    
    // Libera todos os animais do lote antes de deletar
    if (plan && plan.ovelhas && plan.ovelhas.length > 0) {
      await Promise.all(plan.ovelhas.map(o => breedingPlanService.returnEweToVazias(o.eweId)));
    }

    if (isSupabaseConfigured) {
      /**
       * Fixed bug: changed table from 'manejos' to 'lotes_monta' to correctly delete the breeding plan.
       */
      const { error } = await supabase.from('lotes_monta').delete().eq('id', id);
      if (error) throw error;
    } else {
      const local = getLocalPlans().filter(p => p.id !== id);
      saveLocalPlans(local);
    }
  },

  async removeEwe(planId: string, eweId: string) {
    const plans = await breedingPlanService.getAll();
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    const updatedOvelhas = (plan.ovelhas || []).filter(o => o.eweId !== eweId);
    await breedingPlanService.update(planId, { ovelhas: updatedOvelhas });
    await breedingPlanService.returnEweToVazias(eweId);
  },

  async updateEweResult(planId: string, eweId: string, cycle: number, result: BreedingCycleResult) {
    const plans = await breedingPlanService.getAll();
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    let shouldCreateRepro = false;
    const updatedOvelhas = (plan.ovelhas || []).map(o => {
      if (o.eweId === eweId) {
        /**
         * Fix: Using ciclo1, ciclo2, ciclo3 properties instead of results object to match BreedingPlanEwe interface.
         */
        let finalized = o.finalizado;
        if (result === BreedingCycleResult.PRENHA) {
          finalized = true;
          shouldCreateRepro = true;
        } else if (cycle === 3 && result === BreedingCycleResult.VAZIA) {
          finalized = true;
        }

        return {
          ...o,
          finalizado: finalized,
          tentativas: cycle,
          ciclo1: cycle === 1 ? result : o.ciclo1,
          ciclo2: cycle === 2 ? result : o.ciclo2,
          ciclo3: cycle === 3 ? result : o.ciclo3,
        };
      }
      return o;
    });

    await breedingPlanService.update(planId, { ovelhas: updatedOvelhas });

    if (shouldCreateRepro) {
      await reproService.create({
        matrizId: eweId,
        /**
         * Fix: reprodutorId is obtained from the plan; BreedingPlanEwe does not have this property.
         */
        reprodutorId: plan.reprodutorId,
        dataCobertura: plan.dataInicioMonta || new Date().toISOString().split('T')[0],
        status: BreedingStatus.CONFIRMADA,
      });
      await sheepService.update(eweId, { prenha: true });
    }
  }
};
