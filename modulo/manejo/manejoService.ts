
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Manejo, TipoManejo, StatusManejo, Recorrencia } from '../../types';
import { getLocalDateString, addDaysLocal, parseLocalDate } from '../../utils';

const LOCAL_STORAGE_KEY = 'ovimanager_manejo_data';

const getLocalManejos = (): Manejo[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalManejos = (data: Manejo[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

function getNextOccurrenceDate(manejo: Manejo): string | null {
  const config = manejo.recorrenciaConfig || {};
  const current = manejo.dataPlanejada.split('T')[0];
  
  if (manejo.recorrencia === Recorrencia.DIARIA) {
    return addDaysLocal(current, config.intervalo || 1);
  }
  
  if (manejo.recorrencia === Recorrencia.SEMANAL) {
    const tempDate = parseLocalDate(current);
    if (!tempDate) return null;
    for (let d = 1; d <= 14; d++) {
      const check = new Date(tempDate);
      check.setDate(check.getDate() + d);
      if ((config.diasSemana || []).includes(check.getDay())) {
        return getLocalDateString(check);
      }
    }
  }
  
  if (manejo.recorrencia === Recorrencia.MENSAL) {
    const tempDate = parseLocalDate(current);
    if (!tempDate) return null;
    tempDate.setMonth(tempDate.getMonth() + 1);
    if (config.diaMes) tempDate.setDate(config.diaMes);
    return getLocalDateString(tempDate);
  }
  
  return null;
}

export const manejoService = {
  async getAll(): Promise<Manejo[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('manejos')
          .select('*, manejo_ovelhas(ovelha_id)')
          .order('data_planejada', { ascending: true });

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
          created_at: m.created_at,
          editadoPorGerente: m.editado_por_gerente,
          dataUltimaEdicao: m.data_ultima_edicao
        }));
      } catch (err) {
        console.error("Erro ao buscar manejos:", err);
        return getLocalManejos();
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
          procedimento: manejo.procedimento,
          tipo: manejo.tipo,
          recorrencia: manejo.recorrencia || Recorrencia.NENHUMA,
          recorrencia_config: manejo.recorrenciaConfig || {},
          grupo_id: manejo.grupoId || null,
          data_planejada: manejo.dataPlanejada,
          hora_planejada: manejo.horaPlanejada || '08:00',
          status: StatusManejo.PENDENTE
        }])
        .select()
        .single();

      if (mError) throw mError;

      if (!manejo.grupoId && ovelhasIds && ovelhasIds.length > 0) {
        const links = ovelhasIds.map(oid => ({
          manejo_id: mData.id,
          ovelha_id: oid
        }));
        await supabase.from('manejo_ovelhas').insert(links);
      }
      return mData;
    }

    const local = getLocalManejos();
    const newManejo = {
      ...manejo,
      id: crypto.randomUUID(),
      ovelhasIds: ovelhasIds || [],
      status: StatusManejo.PENDENTE,
      created_at: new Date().toISOString()
    } as Manejo;
    local.push(newManejo);
    saveLocalManejos(local);
    return newManejo;
  },

  async update(id: string, updateData: Partial<Manejo>) {
    const editTimestamp = new Date().toISOString();
    
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('manejos')
        .update({
          titulo: updateData.titulo,
          procedimento: updateData.procedimento,
          tipo: updateData.tipo,
          recorrencia: updateData.recorrencia,
          recorrencia_config: updateData.recorrenciaConfig,
          data_planejada: updateData.dataPlanejada,
          hora_planejada: updateData.horaPlanejada,
          grupo_id: updateData.grupoId || null,
          editado_por_gerente: true,
          data_ultima_edicao: editTimestamp,
          // Mantemos as observações originais a menos que explicitamente alteradas
          observacoes: updateData.observacoes
        })
        .eq('id', id);
      
      if (error) throw error;
    } else {
      const local = getLocalManejos();
      const idx = local.findIndex(m => m.id === id);
      if (idx !== -1) {
        local[idx] = { 
          ...local[idx], 
          ...updateData, 
          editadoPorGerente: true, 
          dataUltimaEdicao: editTimestamp 
        };
        saveLocalManejos(local);
      }
    }
  },

  async completeTask(manejo: Manejo, colaborador: string, observacoes: string) {
    const id = manejo.id;
    const timestamp = new Date().toISOString();
    
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('manejos')
        .update({
          status: StatusManejo.CONCLUIDO,
          data_execucao: timestamp,
          colaborador: colaborador.toUpperCase(),
          observacoes: observacoes
        })
        .eq('id', id);
      
      if (error) throw error;

      // Se for recorrente, cria a próxima ocorrência
      if (manejo.recorrencia !== Recorrencia.NENHUMA) {
        const nextDate = getNextOccurrenceDate(manejo);
        const config = manejo.recorrenciaConfig || {};
        const novaContagem = (config.contagem || 0) + 1;
        
        if (nextDate && (config.limiteRepeticoes === null || config.limiteRepeticoes === undefined || novaContagem < config.limiteRepeticoes)) {
          await this.create({
            ...manejo,
            dataPlanejada: nextDate,
            recorrenciaConfig: { ...config, contagem: novaContagem }
          }, manejo.ovelhasIds || []);
        }
      }
    } else {
      const local = getLocalManejos();
      const index = local.findIndex(m => m.id === id);
      if (index !== -1) {
        local[index].status = StatusManejo.CONCLUIDO;
        local[index].dataExecucao = timestamp;
        local[index].colaborador = colaborador.toUpperCase();
        local[index].observacoes = observacoes;

        // Se for recorrente, cria a próxima ocorrência localmente
        if (manejo.recorrencia !== Recorrencia.NENHUMA) {
          const nextDate = getNextOccurrenceDate(manejo);
          const config = manejo.recorrenciaConfig || {};
          const novaContagem = (config.contagem || 0) + 1;
          
          if (nextDate && (config.limiteRepeticoes === null || config.limiteRepeticoes === undefined || novaContagem < config.limiteRepeticoes)) {
            const nextManejo = {
              ...manejo,
              id: crypto.randomUUID(),
              dataPlanejada: nextDate,
              status: StatusManejo.PENDENTE,
              recorrenciaConfig: { ...config, contagem: novaContagem },
              created_at: new Date().toISOString()
            };
            local.push(nextManejo);
          }
        }
        saveLocalManejos(local);
      }
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
