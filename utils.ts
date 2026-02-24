
export const calculateAge = (birthDateStr: string): string => {
  if (!birthDateStr) return "Data não informada";
  
  const birth = new Date(birthDateStr);
  const now = new Date();
  
  birth.setMinutes(birth.getMinutes() + birth.getTimezoneOffset());

  if (birth > now) return "Data futura";

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  
  if (parts.length === 0) return "Menos de 1 mês";
  return parts.join(' e ');
};

/**
 * Retorna a data atual local no formato YYYY-MM-DD
 * Evita o shift de fuso horário do toISOString()
 */
export const getLocalDateString = (date?: Date): string => {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formata uma string YYYY-MM-DD para DD/MM/YYYY sem riscos de fuso horário
 */
export const formatBrazilianDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

/**
 * Soma dias a uma string YYYY-MM-DD e retorna nova string YYYY-MM-DD
 * Usa meio-dia (12:00) para garantir que mudanças de horário de verão não pulem dias
 */
export const addDaysLocal = (dateStr: string, days: number): string => {
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
};

/**
 * Converte string para objeto Date local (meio-dia)
 */
export const parseLocalDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  try {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d, 12, 0, 0);
  } catch { return null; }
};

// Funções para manipulação de Áudio do Gemini Live / TTS
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
