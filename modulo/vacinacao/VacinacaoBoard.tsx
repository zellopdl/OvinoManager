import React from 'react';
import { VacinacaoConfig } from './VacinacaoManager';
import { Sheep, Group } from '../../types';

interface Props {
  config: VacinacaoConfig;
  sheep: Sheep[];
  groups: Group[];
}

const VacinacaoBoard: React.FC<Props> = ({ config, sheep, groups }) => {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const mesAnualNome = meses[config.mesAnual - 1];

  const quarentenaGroup = groups.find(g => g.nome.toLowerCase().includes('quarentena'));
  const quarentenaSheep = quarentenaGroup ? sheep.filter(s => s.grupoId === quarentenaGroup.id) : [];

  const renderBlock = (title: string, color: string, items: string[]) => (
    <div className={`p-6 rounded-3xl border ${color} shadow-sm h-full`}>
      <h4 className="font-black uppercase text-sm mb-4 tracking-tight">{title}</h4>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm font-medium">
            <span className="mt-1 text-lg leading-none">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
      
      {/* 1. PROTOCOLO DE ENTRADA / SINCRONIZAÇÃO */}
      <div className="bg-slate-900 p-8 rounded-[40px] shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500"></div>
        
        <div className="mb-8 border-b border-slate-800 pb-6">
          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white">🔄 Protocolo de Entrada</h3>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Para animais recém-adquiridos ou sem histórico vacinal</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
            <h4 className="font-black uppercase text-sm mb-4 text-amber-400">Dia 0 (Chegada / Quarentena)</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm font-medium text-slate-300">
                <span className="text-amber-400 mt-1">•</span>
                <span>1ª Dose Clostridiose ({config.tipoClostridiose !== 'nenhuma' ? `${config.tipoClostridiose} cepas` : 'Verificar disponibilidade'})</span>
              </li>
              {config.hasRaiva && config.vacinaRaivaDisp && (
                <li className="flex items-start gap-3 text-sm font-medium text-slate-300">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>Vacina contra Raiva (Dose única anual)</span>
                </li>
              )}
              <li className="flex items-start gap-3 text-sm font-medium text-slate-300">
                <span className="text-amber-400 mt-1">•</span>
                <span>Avaliação clínica geral, vermifugação (se necessário) e isolamento.</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
            <h4 className="font-black uppercase text-sm mb-4 text-orange-400">Dia 30 (Fim da Quarentena)</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm font-medium text-slate-300">
                <span className="text-orange-400 mt-1">•</span>
                <span>Reforço Clostridiose ({config.tipoClostridiose !== 'nenhuma' ? `${config.tipoClostridiose} cepas` : 'Verificar disponibilidade'})</span>
              </li>
              <li className="flex items-start gap-3 text-sm font-medium text-slate-300">
                <span className="text-orange-400 mt-1">•</span>
                <span>Fim do isolamento. O animal está sincronizado e passa a seguir o Calendário Anual do Plantel.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* LISTA DE ANIMAIS EM QUARENTENA */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h4 className="font-black uppercase text-sm mb-4 text-white flex items-center gap-2">
            <span>🐑 Animais em Sincronização (Grupo: Quarentena)</span>
            {quarentenaGroup && (
              <span className="bg-slate-800 text-slate-300 py-0.5 px-2 rounded-full text-[10px]">{quarentenaSheep.length}</span>
            )}
          </h4>
          
          {!quarentenaGroup ? (
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-sm text-slate-400 font-medium">💡 Crie um grupo chamado <strong className="text-white">"Quarentena"</strong> no menu Grupos para listar os animais recém-chegados aqui.</p>
            </div>
          ) : quarentenaSheep.length === 0 ? (
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-sm text-slate-400 font-medium">Nenhum animal em quarentena no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quarentenaSheep.map(s => (
                <div key={s.id} className="bg-slate-800 p-3 rounded-2xl border border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">🐑</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{s.nome}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Brinco: {s.brinco}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. CALENDÁRIO ANUAL DO PLANTEL (ROTINA) */}
      {config.quadroVisual && (
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-emerald-500 to-rose-500"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-100 pb-6 gap-4">
            <div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter">📅 Calendário do Plantel</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Rotina para animais já sincronizados</p>
            </div>
            <div className="text-left md:text-right">
              <span className="inline-block px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase">Mês Base: {mesAnualNome}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* CORDEIROS / RECÉM-NASCIDOS */}
            {renderBlock(
              "🐑 Cordeiros (Recém-nascidos)", 
              "bg-emerald-50/50 border-emerald-100 text-emerald-900", 
              [
                `Aos 40 dias de vida: 1ª Dose Clostridiose (${config.tipoClostridiose} cepas)`,
                "Aos 70 dias de vida: Reforço Clostridiose (30 dias após a 1ª dose)",
                ...(config.hasEctima ? ["Aos 15 dias: Vacina Ectima Contagioso (Escarificação)"] : []),
                "Aos 3 meses (90 dias): 1ª Dose de outras vacinas (se houver necessidade na região)",
                "Aos 4 meses (120 dias): 2ª Dose de outras vacinas (30 dias após a 1ª dose)",
                "⚠️ Regra: Se houver mais de uma vacina extra, dar intervalo de 5 dias entre elas."
              ]
            )}

            {/* ADULTOS: VAZIAS E REPRODUTORES */}
            {renderBlock(
              "🐑 Adultos (Vazias e Reprodutores)", 
              "bg-indigo-50/50 border-indigo-100 text-indigo-900", 
              [
                `Pré-Monta: 1 dose de reforço da Clostridiose (${config.tipoClostridiose} cepas)`,
                "Pré-Monta: Demais vacinas necessárias (Raiva, Leptospirose, Pasteurelose, etc.)",
                "⚠️ Regra: Aplicar as demais vacinas na mesma época da Clostridiose, mas com intervalo mínimo de 5 dias entre vacinas diferentes."
              ]
            )}

            {/* MATRIZES PRENHAS */}
            {renderBlock(
              "🤰 Matrizes Prenhas", 
              "bg-rose-50/50 border-rose-100 text-rose-900", 
              [
                `Aos 100 dias de gestação (último terço): Vacina de Clostridiose (${config.tipoClostridiose} cepas)`,
                "A vacinação no terço final garante a transferência de imunidade (colostro) para os cordeiros que vão nascer."
              ]
            )}

            {/* RECRIA E OBSERVAÇÕES */}
            {renderBlock(
              "🔄 Recria & Campanhas Gerais", 
              "bg-slate-50 border-slate-200 text-slate-700 md:col-span-2 lg:col-span-3", 
              [
                "Animais da RECRIA que ficarem na propriedade devem ser mudados para os grupos de Reprodutores ou Vazias. A partir daí, caem na regra de Adultos (Pré-Monta).",
                ...(config.protocoloOficial ? [`Protocolo Oficial Obrigatório: ${config.protocoloOficial}`] : []),
                "Lembrete: Animais em Quarentena seguem o Protocolo de Entrada (Dia 0 e Dia 30) antes de entrarem neste calendário."
              ]
            )}

          </div>
        </div>
      )}

      {/* DETALHES TÉCNICOS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Resumo Técnico do Protocolo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Clostridiose</p>
            <p className="font-black text-sm text-slate-700">{config.tipoClostridiose !== 'nenhuma' ? `${config.tipoClostridiose} Cepas` : 'Não Configurada'}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Raiva</p>
            <p className="font-black text-sm text-slate-700">{config.hasRaiva && config.vacinaRaivaDisp ? 'Ativada' : 'Desativada'}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Leptospirose</p>
            <p className="font-black text-sm text-slate-700">{config.hasLeptospirose && config.vacinaLeptoDisp ? 'Ativada' : 'Desativada'}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pasteurelose</p>
            <p className="font-black text-sm text-slate-700">{config.hasPasteurelose && config.vacinaPasteureloseDisp ? 'Ativada' : 'Desativada'}</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default VacinacaoBoard;
