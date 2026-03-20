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

export const SUPABASE_SCHEMA_SQL = `-- SCRIPT DE INSTALAÇÃO OVIMANAGER v3.1
-- Este script cria toda a estrutura do banco de dados do zero.

-- 0. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  nome TEXT UNIQUE NOT NULL,
  system_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir Grupos do Sistema (Essenciais para a lógica)
-- Garantir que a coluna system_group existe caso a tabela já tenha sido criada
ALTER TABLE public.grupos ADD COLUMN IF NOT EXISTS system_group BOOLEAN DEFAULT false;

-- Garantir que a coluna nome é única para o ON CONFLICT funcionar
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.grupos'::regclass 
    AND contype = 'u' 
    AND conkey @> ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.grupos'::regclass AND attname = 'nome')]
  ) THEN
    ALTER TABLE public.grupos ADD CONSTRAINT grupos_nome_unique UNIQUE (nome);
  END IF;
END $$;

INSERT INTO public.grupos (nome, system_group) VALUES 
('PRENHA', true),
('DESCARTE', true),
('FARMACIA', true),
('VAZIA', true),
('QUARENTENA', true),
('GERAL', true)
ON CONFLICT (nome) DO UPDATE SET system_group = true;

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

-- 3. Históricos
CREATE TABLE IF NOT EXISTS public.historico_peso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ovelha_id UUID REFERENCES public.ovelhas(id) ON DELETE CASCADE,
  peso NUMERIC NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.historico_ecc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ovelha_id UUID REFERENCES public.ovelhas(id) ON DELETE CASCADE,
  ecc NUMERIC NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.historico_famacha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ovelha_id UUID REFERENCES public.ovelhas(id) ON DELETE CASCADE,
  famacha INTEGER NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Reprodução
CREATE TABLE IF NOT EXISTS public.lotes_monta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data_inicio_monta DATE NOT NULL,
  status TEXT DEFAULT 'em_monta',
  reprodutor_id UUID REFERENCES public.ovelhas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

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

-- 5. Manejos e Tarefas
CREATE TABLE IF NOT EXISTS public.manejos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  procedimento TEXT,
  protocolo TEXT,
  tipo TEXT DEFAULT 'recorrente',
  recorrencia TEXT DEFAULT 'nenhuma',
  recorrencia_config JSONB DEFAULT '{}',
  grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL,
  data_planejada DATE NOT NULL,
  hora_planejada TIME DEFAULT '08:00',
  status TEXT DEFAULT 'pendente',
  data_execucao TIMESTAMP WITH TIME ZONE,
  colaborador TEXT,
  observacoes TEXT,
  editado_por_gerente BOOLEAN DEFAULT false,
  data_ultima_edicao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Garantir coluna protocolo se a tabela já existia
ALTER TABLE public.manejos ADD COLUMN IF NOT EXISTS protocolo TEXT;

CREATE TABLE IF NOT EXISTS public.manejo_ovelhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manejo_id UUID REFERENCES public.manejos(id) ON DELETE CASCADE,
  ovelha_id UUID REFERENCES public.ovelhas(id) ON DELETE CASCADE
);

-- 6. Comunicação e Configuração
CREATE TABLE IF NOT EXISTS public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  prioridade TEXT DEFAULT 'normal',
  autor TEXT,
  confirmacoes JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vacinacao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  has_raiva BOOLEAN DEFAULT false,
  has_leptospirose BOOLEAN DEFAULT false,
  has_pasteurelose BOOLEAN DEFAULT false,
  has_linfadenite BOOLEAN DEFAULT false,
  has_ectima BOOLEAN DEFAULT false,
  protocolo_oficial TEXT,
  tipo_clostridiose TEXT DEFAULT '8',
  vacina_raiva_disp BOOLEAN DEFAULT false,
  vacina_lepto_disp BOOLEAN DEFAULT false,
  vacina_pasteurelose_disp BOOLEAN DEFAULT false,
  outras_vacinas TEXT,
  tem_historico BOOLEAN DEFAULT false,
  historico_detalhes TEXT,
  estacao_monta BOOLEAN DEFAULT false,
  prenhez_multipla BOOLEAN DEFAULT false,
  reforco_gestacao BOOLEAN DEFAULT false,
  mes_anual INTEGER DEFAULT 1,
  intervalo_5_dias BOOLEAN DEFAULT false,
  quadro_visual BOOLEAN DEFAULT true,
  agrupar_mensal BOOLEAN DEFAULT false,
  dia_base_semana INTEGER DEFAULT 3,
  dia_base_ordem INTEGER DEFAULT 2,
  intervalo_entre_vacinas INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Garantir colunas novas se a tabela já existia
ALTER TABLE public.vacinacao_config ADD COLUMN IF NOT EXISTS agrupar_mensal BOOLEAN DEFAULT false;
ALTER TABLE public.vacinacao_config ADD COLUMN IF NOT EXISTS dia_base_semana INTEGER DEFAULT 3;
ALTER TABLE public.vacinacao_config ADD COLUMN IF NOT EXISTS dia_base_ordem INTEGER DEFAULT 2;
ALTER TABLE public.vacinacao_config ADD COLUMN IF NOT EXISTS intervalo_entre_vacinas INTEGER DEFAULT 5;

CREATE TABLE IF NOT EXISTS public.vacinacao_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  vaccine TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cabanha_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Tabelas Adicionais (Radar e Conhecimento)
CREATE TABLE IF NOT EXISTS public.radar_analises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  fundamentacao TEXT,
  prioridade TEXT DEFAULT 'media',
  categoria TEXT,
  alvos TEXT[] DEFAULT '{}',
  fonte TEXT,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conhecimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  assunto TEXT,
  conteudo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'operador',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Segurança (RLS)
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.piquetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ovelhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_peso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_ecc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_famacha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_monta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lote_ovelhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproducao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manejos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manejo_ovelhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacinacao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacinacao_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabanha_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radar_analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conhecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso total (Simplificado para o ambiente atual)
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Acesso total %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Política específica para proteger grupos do sistema
DROP POLICY IF EXISTS "Proteger grupos do sistema - Delete" ON public.grupos;
CREATE POLICY "Proteger grupos do sistema - Delete" ON public.grupos FOR DELETE USING (NOT system_group);

DROP POLICY IF EXISTS "Proteger grupos do sistema - Update" ON public.grupos;
CREATE POLICY "Proteger grupos do sistema - Update" ON public.grupos FOR UPDATE USING (NOT system_group) WITH CHECK (NOT system_group);
`;
