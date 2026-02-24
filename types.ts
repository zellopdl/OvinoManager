
export enum Sexo {
  MACHO = 'macho',
  FEMEA = 'femea'
}

export enum Status {
  ATIVO = 'ativo',
  DESCARTE = 'descarte',
  OBITO = 'obito'
}

export enum Sanidade {
  SAUDAVEL = 'saudavel',
  ENFERMARIA = 'enfermaria',
  OBITO = 'obito'
}

export enum BreedingCycleResult {
  PENDENTE = 'pendente',
  PRENHA = 'prenha',
  VAZIA = 'vazia'
}

export interface BreedingPlanEwe {
  id: string; // ID na tabela lote_ovelhas
  loteId: string;
  eweId: string;
  tentativas: number;
  ciclo1: BreedingCycleResult;
  ciclo2: BreedingCycleResult;
  ciclo3: BreedingCycleResult;
  finalizado: boolean;
}

export interface BreedingPlan {
  id: string;
  nome: string;
  reprodutorId?: string;
  dataSincronizacao?: string;
  dataInicioMonta: string;
  status: 'em_monta' | 'concluido';
  ovelhas: BreedingPlanEwe[];
  created_at?: string;
}

export enum BreedingStatus {
  COBERTA = 'coberta',
  CONFIRMADA = 'confirmada',
  PARTO = 'parto',
  FALHA = 'falha'
}

export interface BreedingRecord {
  id: string;
  matrizId: string;
  reprodutorId: string;
  dataCobertura: string;
  dataPrevisaoParto: string;
  dataPartoReal?: string;
  status: BreedingStatus;
  loteOrigemId?: string;
  observacoes?: string;
  created_at?: string;
}

export enum TipoManejo {
  RECORRENTE = 'recorrente',
  SAZONAL = 'sazonal',
  IMPREVISIVEL = 'imprevisivel'
}

export enum StatusManejo {
  PENDENTE = 'pendente',
  CONCLUIDO = 'concluido',
  CANCELADO = 'cancelado'
}

export enum Recorrencia {
  NENHUMA = 'nenhuma',
  DIARIA = 'diaria',
  SEMANAL = 'semanal',
  MENSAL = 'mensal',
  ANUAL = 'anual'
}

export interface RecorrenciaConfig {
  intervalo?: number; // Ex: a cada '2' dias
  diasSemana?: number[]; // [1, 3, 5] para Seg, Qua, Sex
  diaMes?: number; // Dia 15
  mesAnual?: number; // Mês 0-11
  limiteRepeticoes?: number | null; // null = infinito (até encerrar)
  // Fix: Added 'contagem' property to track current iteration in recurring sequences
  contagem?: number;
}

export interface Breed {
  id: string;
  nome: string;
}

export interface Supplier {
  id: string;
  nome: string;
  endereco?: string;
  contato?: string;
  celular?: string;
  fornece?: string;
}

export interface Group {
  id: string;
  nome: string;
}

export interface Paddock {
  id: string;
  piquete: string;
  tamanho: number | null;
  lotacao: number;
  grama: string | null;
  created_at?: string;
}

export interface WeightHistory {
  id: string;
  ovelha_id: string;
  peso: number;
  data: string;
}

export interface Sheep {
  id: string;
  brinco: string;
  nome: string;
  nascimento: string;
  sexo: Sexo;
  racaId: string;
  origem: string;
  piqueteId: string;
  peso: number;
  saude: string;
  sanidade: Sanidade;
  famacha: number;
  ecc: number;
  grupoId: string;
  status: Status;
  prenha: boolean;
  pai?: string;
  mae?: string;
  obs?: string;
  createdAt: string;
  historicoPeso?: WeightHistory[];
}

export interface Manejo {
  id: string;
  titulo: string;
  tipo: TipoManejo;
  recorrencia: Recorrencia;
  recorrenciaConfig?: RecorrenciaConfig;
  dataPlanejada: string;
  horaPlanejada?: string;
  dataExecucao?: string;
  colaborador?: string;
  status: StatusManejo;
  procedimento?: string;
  observacoes?: string;
  ovelhasIds?: string[];
  grupoId?: string;
  created_at?: string;
  // Auditoria de Gerência
  editadoPorGerente?: boolean;
  dataUltimaEdicao?: string;
}

export interface KnowledgeEntry {
  id: string;
  titulo: string;
  assunto: string;
  conteudo: string;
  created_at?: string;
}

export interface DashboardStats {
  total: number;
  ativos: number;
  machos: number;
  femeas: number;
  mediaPeso: number;
}
