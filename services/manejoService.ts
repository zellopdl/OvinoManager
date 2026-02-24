
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Manejo, TipoManejo, StatusManejo, Recorrencia } from '../types';
import { getLocalDateString } from '../utils';

const LOCAL_STORAGE_KEY = 'ovimanager_manejo_data';

const getLocalManejos = (): Manejo[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalManejos = (data: Manejo[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

export const manejoService = {
  async getAll(): Promise<Manejo[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('manejos')
          .select('*, manejo_ovelhas(ovelha_id)')
          .order('data_planejada', { ascending: false });

        if (error) throw error;

        return (data || []).map(m => ({
          id: m.id,
          titulo: m.titulo,
          tipo: m.tipo as TipoManejo,
          recorrencia: (m.recorrencia as Recorrencia) || Recorrencia.NENHUMA,
          recorrenciaConfig: m.recorrencia_config || {},
          dataPlanejada: m.data_planejada,
          horaPlanejada: m.hora_planejada ? m.hora_planejada.substring(0, 5) : '08:00',
          dataExecucao: m.data_execucao,
          colaborador: m.colaborador,
          status: m.status as StatusManejo,
          procedimento: m.procedimento,
          observacoes: m.observacoes,
          ovelhasIds: m.manejo_ovelhas?.map((mo: any) => mo.ovelha_id) || [],
          grupoId: m.grupo_id,
          created_at: m.created_at
        }));
      } catch (err) {
        console.error("Erro ao buscar manejos:", err);
        if (err instanceof TypeError) return getLocalManejos();
        throw err;
      }
    }
    return getLocalManejos();
  },

  async create(manejo: Partial<Manejo>, ovelhasIds: string[]) {
    if (isSupabaseConfigured) {
      const { data: mData, error: mError } = await supabase
        .from('manejos')
        .insert([{
          titulo: manejo.titulo,
          tipo: manejo.tipo,
          recorrencia: manejo.recorrencia || Recorrencia.NENHUMA,
          recorrencia_config: manejo.recorrenciaConfig || {},
          grupo_id: manejo.grupoId || null,
          data_planejada: manejo.dataPlanejada,
          hora_planejada: manejo.horaPlanejada || '08:00',
          colaborador: manejo.colaborador,
          status: manejo.status,
          procedimento: manejo.procedimento || null,
          observacoes: manejo.observacoes || null
        }])
        .select()
        .single();

      if (mError) throw mError;

      if (!manejo.grupoId && ovelhasIds && ovelhasIds.length > 0) {
        const links = ovelhasIds.map(oid => ({
          manejo_id: mData.id,
          ovelha_id: oid
        }));
        const { error: lError } = await supabase.from('manejo_ovelhas').insert(links);
        if (lError) throw lError;
      }
      return mData;
    }

    const local = getLocalManejos();
    const newManejo = {
      ...manejo,
      id: crypto.randomUUID(),
      ovelhasIds: ovelhasIds || [],
      created_at: getLocalDateString()
    } as Manejo;
    local.push(newManejo);
    saveLocalManejos(local);
    return newManejo;
  },

  async update(id: string, manejo: Partial<Manejo>, ovelhasIds: string[]) {
    if (isSupabaseConfigured) {
      const { error: mError } = await supabase
        .from('manejos')
        .update({
          titulo: manejo.titulo,
          tipo: manejo.tipo,
          recorrencia: manejo.recorrencia,
          recorrencia_config: manejo.recorrenciaConfig,
          grupo_id: manejo.grupoId || null,
          data_planejada: manejo.dataPlanejada,
          hora_planejada: manejo.horaPlanejada,
          colaborador: manejo.colaborador,
          status: manejo.status,
          procedimento: manejo.procedimento || null,
          observacoes: manejo.observacoes || null
        })
        .eq('id', id);

      if (mError) throw mError;

      await supabase.from('manejo_ovelhas').delete().eq('manejo_id', id);
      
      if (!manejo.grupoId && ovelhasIds && ovelhasIds.length > 0) {
        const links = ovelhasIds.map(oid => ({
          manejo_id: id,
          ovelha_id: oid
        }));
        const { error: lError } = await supabase.from('manejo_ovelhas').insert(links);
        if (lError) throw lError;
      }
      return;
    }

    const local = getLocalManejos();
    const index = local.findIndex(m => m.id === id);
    if (index !== -1) {
      local[index] = { ...local[index], ...manejo, ovelhasIds: ovelhasIds || [] };
      saveLocalManejos(local);
    }
  },

  async updateStatus(id: string, status: StatusManejo, dataExecucao?: string, nextData?: string, nextContagem?: number) {
    const actualDataExec = dataExecucao || getLocalDateString();
    
    if (isSupabaseConfigured) {
      const { data: currentTask, error: fetchError } = await supabase
        .from('manejos')
        .select('*, manejo_ovelhas(ovelha_id)')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('manejos')
        .update({ status: StatusManejo.CONCLUIDO, data_execucao: actualDataExec })
        .eq('id', id);

      if (updateError) throw updateError;

      if (nextData && currentTask.recorrencia !== Recorrencia.NENHUMA) {
        const nextConfig = { ...(currentTask.recorrencia_config || {}), contagem: nextContagem || 1 };
        const { data: nextTask, error: createError } = await supabase
          .from('manejos')
          .insert([{
            titulo: currentTask.titulo, tipo: currentTask.tipo, recorrencia: currentTask.recorrencia,
            recorrencia_config: nextConfig, grupo_id: currentTask.grupo_id, data_planejada: nextData,
            hora_planejada: currentTask.hora_planejada,
            colaborador: currentTask.colaborador, status: StatusManejo.PENDENTE,
            procedimento: currentTask.procedimento, observacoes: currentTask.observacoes
          }])
          .select().single();
        
        if (!createError) {
          const ovelhasIds = currentTask.manejo_ovelhas?.map((mo: any) => mo.ovelha_id) || [];
          if (ovelhasIds.length > 0) {
            const links = ovelhasIds.map((oid: string) => ({ manejo_id: nextTask.id, ovelha_id: oid }));
            await supabase.from('manejo_ovelhas').insert(links);
          }
        }
      }
      return;
    }

    const local = getLocalManejos();
    const index = local.findIndex(m => m.id === id);
    if (index !== -1) {
      const current = local[index];
      current.status = StatusManejo.CONCLUIDO;
      current.dataExecucao = actualDataExec;
      if (nextData && current.recorrencia !== Recorrencia.NENHUMA) {
        const nextManejo: Manejo = {
          ...current, id: crypto.randomUUID(), status: StatusManejo.PENDENTE,
          dataPlanejada: nextData, dataExecucao: undefined,
          recorrenciaConfig: { ...(current.recorrenciaConfig || {}), contagem: nextContagem || 1 },
          created_at: getLocalDateString()
        };
        local.push(nextManejo);
      }
      saveLocalManejos(local);
    }
  },

  async delete(id: string) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('manejos').delete().eq('id', id);
      if (error) throw error;
    } else {
      const local = getLocalManejos().filter(m => m.id !== id);
      saveLocalManejos(local);
    }
  }
};
