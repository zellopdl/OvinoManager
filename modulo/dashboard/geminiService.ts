
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Sheep } from "../../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// REGRAS GLOBAIS DE COMUNICAÇÃO PARA A IA (ESTRITAMENTE SEM IDs)
const SYSTEM_CORE_INSTRUCTIONS = `
  REGRAS DE IDENTIFICAÇÃO (CRÍTICO):
  1. NUNCA mencione códigos de banco de dados (IDs UUID como "dx88445"). Eles são inúteis para o produtor.
  2. SEMPRE identifique o animal pelo seu NOME e BRINCO. 
     Exemplo correto: "A ovelha LUNA (#BG-201) apresenta..." 
     Exemplo incorreto: "O animal apresenta..." ou "O ID 123 apresenta..."
  3. SEMPRE refira-se aos locais pelo NOME DO PIQUETE e aos agrupamentos pelo NOME DO GRUPO/LOTE.
  4. Ao gerar insights de rebanho, cite NOMINALMENTE quais animais estão com problemas.
  5. Use uma linguagem de consultor veterano: técnica, precisa, mas focada na identificação visual de campo.
`;

export const getSheepInsight = async (sheep: Sheep, breedName: string, paddockName: string) => {
  try {
    const ai = getAIClient();
    const prompt = `
      ${SYSTEM_CORE_INSTRUCTIONS}
      Analise tecnicamente este animal específico:
      - Animal: ${sheep.nome}
      - Identificação (Brinco): ${sheep.brinco}
      - Raça: ${breedName}
      - Localização Atual (Piquete): ${paddockName}
      - Peso Atual: ${sheep.peso}kg
      - Saúde (Famacha): ${sheep.famacha}
      - Condição Corporal (ECC): ${sheep.ecc}
      - Status Reprodutivo: ${sheep.prenha ? 'PRENHA' : 'VAZIA/NÃO CONFIRMADA'}
      
      Forneça um parecer técnico curto. Comece identificando o animal pelo Nome e Brinco.
    `;
    const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    return response.text;
  } catch (error) { return "Análise indisponível no momento."; }
};

export const getHerdDailyInsights = async (herd: any[]) => {
  if (herd.length === 0) return [];
  try {
    const ai = getAIClient();
    const prompt = `
      ${SYSTEM_CORE_INSTRUCTIONS}
      Analise o rebanho abaixo e gere insights estratégicos de manejo.
      
      DADOS DO REBANHO (Já processados para sua leitura):
      ${JSON.stringify(herd)}
      
      INSTRUÇÃO PARA O JSON:
      - No campo "alvos", você DEVE listar os NOMES dos animais afetados.
      - No campo "fundamentacao", cite nominalmente os exemplos encontrados. 
        Ex: "A ovelha LUNA (#101) está com ECC baixo, enquanto o padrão do grupo..."
      
      A saída deve ser um JSON seguindo este esquema:
    `;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  prioridade: { type: Type.STRING, enum: ["alta", "media", "baixa"] },
                  categoria: { type: Type.STRING },
                  titulo: { type: Type.STRING },
                  descricao: { type: Type.STRING },
                  fundamentacao: { type: Type.STRING },
                  alvos: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de NOMES ou BRINCOS dos animais" },
                  fonte: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"insights": []}').insights || [];
  } catch (error) { return []; }
};

export const generateAppLogo = async () => {
  try {
    const ai = getAIClient();
    const prompt = "A modern minimalist sheep head logo, emerald green and slate blue, vector style.";
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch { return null; }
};

export const askKnowledgeAssistant = async (question: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        ${SYSTEM_CORE_INSTRUCTIONS}
        Responda como um consultor sênior em ovinocultura brasileira: ${question}
      `,
    });
    return response.text;
  } catch { return "Erro ao consultar guia."; }
};

export const getSpeechForText = async (text: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch { return null; }
};
