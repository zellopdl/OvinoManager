
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Sheep } from "../types";

// Função para obter o cliente sempre com a chave mais recente do ambiente
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
};

const handleAIError = (error: any): string => {
  console.error("Erro Gemini:", error);
  
  let errorMessage = "";
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.message) {
    errorMessage = error.message;
  } else {
    errorMessage = JSON.stringify(error);
  }

  if (!process.env.GEMINI_API_KEY) {
    return "⚠️ CONFIGURAÇÃO PENDENTE: A variável de ambiente GEMINI_API_KEY não foi encontrada nas configurações do Vercel.";
  }

  if (errorMessage.includes("API key not valid") || 
      errorMessage.includes("INVALID_ARGUMENT") || 
      errorMessage.includes("400") ||
      errorMessage.includes("API_KEY_INVALID")) {
    return "❌ CHAVE INVÁLIDA: O Google recusou sua chave. Verifique se copiou corretamente no Vercel.";
  }

  if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("limit")) {
    return "⏳ LIMITE ATINGIDO: Sua cota gratuita do Gemini expirou para este minuto ou dia. Tente novamente em instantes.";
  }

  return `Ops! Erro técnico: ${errorMessage.substring(0, 50)}...`;
};

export const getSheepInsight = async (sheep: Sheep, breedName: string) => {
  try {
    const ai = getAIClient();
    const prompt = `
      Atue como um mestre em ovinocultura experiente. Analise o seguinte animal:
      - Nome/Brinco: ${sheep.nome} (#${sheep.brinco})
      - Sexo: ${sheep.sexo}
      - Raça: ${breedName}
      - Peso: ${sheep.peso}kg
      - Nascimento: ${sheep.nascimento}
      - Saúde: Famacha ${sheep.famacha}, ECC ${sheep.ecc}
      - Observações: ${sheep.obs || 'Nenhuma'}
      Forneça um parecer técnico direto sobre o estado nutricional e riscos sanitários. 
      Lembre-se: se for macho, o foco é em qualidade seminal e porte; se fêmea, foco em escore para reprodução/amamentação.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
    });

    return response.text;
  } catch (error: any) {
    return handleAIError(error);
  }
};

export const getHerdDailyInsights = async (herd: any[]) => {
  if (herd.length === 0) return [];
  try {
    const ai = getAIClient();
    const prompt = `
      Analise os dados deste rebanho de ovinos. 
      LEGENDA: b=brinco, n=nome, r=raça, p=peso, f=famacha, e=ecc, pr=prenha(true/false), i=nascimento, s=sexo(macho/femea).
      
      Gere insights estratégicos de alta precisão. 
      ATENÇÃO BIOLÓGICA: 
      1. Reprodutores (sexo "macho") NUNCA ficam prenhes. Não sugira protocolos de gestação para machos.
      2. Se um macho estiver em escore corporal baixo, foque na recuperação para a próxima estação de monta.
      3. Se fêmeas não estiverem prenhes e forem saudáveis, sugira protocolos de indução ou verificação de cio.
      
      IMPORTANTE: No campo "fundamentacao", forneça uma explicação técnica detalhada (mínimo 3 parágrafos) sobre por que essa ação é necessária, os riscos de não fazê-la e o passo-a-passo sugerido.
      
      Dados: ${JSON.stringify(herd)}
    `;
    
    // Mudança para gemini-3-flash-preview para economizar cota e evitar erro 429
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
                  raca: { type: Type.STRING },
                  categoria: { type: Type.STRING },
                  titulo: { type: Type.STRING },
                  descricao: { type: Type.STRING },
                  fundamentacao: { type: Type.STRING },
                  alvos: { type: Type.ARRAY, items: { type: Type.STRING } },
                  fonte: { type: Type.STRING }
                },
                required: ["prioridade", "categoria", "titulo", "descricao", "fundamentacao", "alvos", "fonte"]
              }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text || '{"insights": []}').insights || [];
  } catch (error: any) {
    console.error("Erro nos insights:", error);
    const errorMsg = handleAIError(error);
    return [{
      prioridade: 'alta',
      categoria: 'SISTEMA',
      titulo: 'Limite de IA Atingido',
      descricao: errorMsg,
      fundamentacao: "O Google Gemini possui limites de requisições por minuto no plano gratuito. " + 
                     "Isso acontece geralmente quando o rebanho é grande ou muitas análises são solicitadas ao mesmo tempo. " +
                     "\n\nCOMO RESOLVER:\n1. Aguarde 1 minuto e clique no botão 'Sincronizar' no Dashboard.\n" +
                     "2. Se o erro persistir, considere criar uma nova chave de API no Google AI Studio.",
      alvos: ['INFO'],
      fonte: 'Diagnóstico de Sistema'
    }];
  }
};

export const askKnowledgeAssistant = async (question: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Responda como um consultor especializado em ovinocultura brasileira: ${question}`,
    });
    return response.text;
  } catch (error: any) {
    return handleAIError(error);
  }
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
  } catch (error) {
    return null;
  }
};

export const generateAppLogo = async () => {
  try {
    const ai = getAIClient();
    const prompt = "A modern and professional logo for 'OviManager', a sheep farming management application. The design should combine a stylized minimalist sheep head with subtle technological elements like digital circuit lines or nodes. Flat design, clean lines, professional branding. Color palette: Emerald Green and Slate Blue. White background, high quality, vector style.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Erro ao gerar logotipo:", error);
    return null;
  }
};
