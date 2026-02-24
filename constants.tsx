import React from 'react';

export const FAMACHA_OPTIONS = [
  { value: 1, label: '1 - Ótimo (Vermelho Vivo)' },
  { value: 2, label: '2 - Bom (Rosa)' },
  { value: 3, label: '3 - Atenção (Rosa Pálido)' },
  { value: 4, label: '4 - Ruim (Branco/Anêmico)' },
  { value: 5, label: '5 - Crítico (Severamente Anêmico)' },
];

export const ECC_OPTIONS = [
  { value: 1, label: '1 - Muito Magra (Caquética)' },
  { value: 2, label: '2 - Magra' },
  { value: 3, label: '3 - Ideal / Moderada' },
  { value: 4, label: '4 - Gorda' },
  { value: 5, label: '5 - Muito Gorda (Obesa)' },
];

export const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'descarte', label: 'Descarte' },
  { value: 'obito', label: 'Óbito' },
];

export const SANIDADE_OPTIONS = [
  { value: 'saudavel', label: 'Saudável' },
  { value: 'enfermaria', label: 'Enfermaria' },
  { value: 'obito', label: 'Óbito' },
];

export const SEXO_OPTIONS = [
  { value: 'macho', label: 'Macho' },
  { value: 'femea', label: 'Fêmea' },
];

export const PRENHA_OPTIONS = [
  { value: true, label: 'Prenha' },
  { value: false, label: 'Não Prenha' },
];

export const TIPO_MANEJO_OPTIONS = [
  { value: 'recorrente', label: 'Recorrente (Rotina Diária)' },
  { value: 'sazonal', label: 'Sazonal (Previsível/Planejado)' },
  { value: 'imprevisivel', label: 'Imprevisível (Emergência/Reparo)' },
];

export const RECORRENCIA_OPTIONS = [
  { value: 'nenhuma', label: 'Tarefa Única' },
  { value: 'diaria', label: 'Repetição Diária' },
  { value: 'semanal', label: 'Repetição Semanal' },
  { value: 'mensal', label: 'Repetição Mensal' },
  { value: 'anual', label: 'Repetição Anual' },
];

export const SUPABASE_SCHEMA_SQL = `-- SCRIPT DE ATUALIZAÇÃO OVIMANAGER v3.0

-- 1. Tabelas de Apoio
CREATE TABLE IF NOT EXISTS public.piquetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  piquete TEXT UNIQUE NOT NULL,
  tamanho REAL,
  lotacao REAL DEFAULT 0,
  grama TEXT
);

CREATE TABLE IF NOT EXISTS public.racas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  endereco TEXT,
  contato TEXT,
  celular TEXT,
  fornece TEXT
);

CREATE TABLE IF NOT EXISTS public.grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL
);

-- 2. Tabela Principal de Ovelhas
CREATE TABLE IF NOT EXISTS public.ovelhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brinco TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  nascimento DATE,
  sexo TEXT,
  raca_id UUID REFERENCES public.racas(id),
  origem TEXT,
  piquete_id UUID REFERENCES public.piquetes(id),
  peso NUMERIC DEFAULT 0,
  saude TEXT,
  sanidade TEXT DEFAULT 'saudavel',
  famacha INTEGER DEFAULT 1,
  ecc NUMERIC DEFAULT 3,
  grupo_id UUID REFERENCES public.grupos(id),
  status TEXT DEFAULT 'ativo',
  prenha BOOLEAN DEFAULT false,
  pai TEXT,
  mae TEXT,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Histórico de Pesagem
CREATE TABLE IF NOT EXISTS public.historico_peso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ovelha_id UUID REFERENCES public.ovelhas(id) ON DELETE CASCADE,
  peso NUMERIC NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Estações de Monta (Lotes)
CREATE TABLE IF NOT EXISTS public.lotes_monta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data_inicio_monta DATE NOT NULL,
  status TEXT DEFAULT 'em_monta',
  reprodutor_id UUID REFERENCES public.ovelhas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Ovelhas nos Lotes (Vínculos Individuais)
CREATE TABLE IF NOT EXISTS public.lote_ovelhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID REFERENCES public.lotes_monta(id) ON DELETE CASCADE,
  ovelha_id UUID REFERENCES public.ovelhas(id) ON DELETE CASCADE,
  tentativas INTEGER DEFAULT 1,
  ciclo1_resultado TEXT DEFAULT 'pendente',
  ciclo2_resultado TEXT DEFAULT 'pendente',
  ciclo3_resultado TEXT DEFAULT 'pendente',
  finalizado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Tabela de Reprodução (Confirmadas)
CREATE TABLE IF NOT EXISTS public.reproducao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matriz_id UUID REFERENCES public.ovelhas(id) ON DELETE CASCADE,
  reprodutor_id UUID REFERENCES public.ovelhas(id) ON DELETE SET NULL,
  data_cobertura DATE NOT NULL,
  data_previsao_parto DATE,
  data_parto_real DATE,
  status TEXT DEFAULT 'confirmada',
  lote_origem_id UUID REFERENCES public.lotes_monta(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
`;