/**
 * SGO AI Type Definitions
 */

export type UserRole = 'Admin' | 'Coordenação' | 'Colaborador';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  avatar?: string;
  metaDiariaPadrao?: number;
  status?: 'Ativo' | 'Inativo' | 'Férias' | 'Afastado';
  senha?: string;
  funcao?: 'ANALISTA JUNIOR' | 'ANALISTA PLENO' | 'ANALISTA SENIÔR' | 'COORDENAÇÃO';
}

export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type ActivityStatus = 'Pendente' | 'Em andamento' | 'Concluída';

export interface Comment {
  id: string;
  autorId: string;
  autorNome: string;
  texto: string;
  dataHora: string;
}

export interface Attachment {
  id: string;
  nome: string;
  tamanho: string;
  mimeType: string;
  url?: string;
}

export interface Activity {
  id: string;
  nome: string;
  competencia: string; // e.g., "Junho/2026"
  responsavelOriginalId: string;
  responsavelAtualId: string;
  responsaveisAuxiliaresIds: string[];
  prioridade: Priority;
  status: ActivityStatus;
  dataLimite: string; // YYYY-MM-DD
  comentarios: Comment[];
  anexos: Attachment[];
  recorrente: boolean;
  periodicidade?: 'Mensal';
  mesesAtividadeComMesmoResponsavel: number; // For alarming rodízio (e.g. 12 months JST)
}

export interface Vacation {
  id: string;
  colaboradorId: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  redistribuida: boolean;
  redistribuicoes: { [atividadeId: string]: string }; // AtividadeId -> substitutoId
}

export interface ProductionGoal {
  id: string;
  nome: string; // e.g. "Faturamento Pagto 10"
  competencia: string;
  quantidadeTotal: number;
  diasUteis: number;
  participantesIds: string[];
  producaoAcumulada: { [colaboradorId: string]: number }; // total cumulative excluding today
  producaHoje: { [colaboradorId: string]: number }; // today's input
  diasRestantes: number; // initially equals diasUteis, decreases as days are processed
  historicoDiario: { [data: string]: { [colaboradorId: string]: number } };
  planilhaAnexo?: {
    nome: string;
    tamanho: string;
    url?: string;
  };
  faturas?: Invoice[];
}

export interface Invoice {
  numFatura: string;       // NUM_FATURA
  codCred: string;         // CODCRED
  cgcCpf: string;          // CGC_CPF
  nomeFantasia: string;    // NOME_FANTASIA
  vlFatura: number;        // VL_FATURA
  consulta: number;        // CONSULTA
  sadt: number;            // SADT
  resumoIntern: number;    // RESUMOINTERN
  honorarioIndivid: number;// HONORARIOINDIVID
  complexidade: number;    // (SADT * 1) + (HONORARIOINDIVID * 1) + (RESUMOINTERN * 2.5)
  responsavelId: string;   // ID of collaborator or 'COORDENACAO'
  status: 'Pendente' | 'Concluída';
}

export interface Procedure {
  id: string;
  titulo: string;
  descricao: string;
  passos: string[];
  autorId: string;
  status: 'Sugerido' | 'Aprovado';
  dataSugerida: string;
  pdfNome?: string;
  imageNome?: string;
}

export interface KnowledgeRating {
  colaboradorId: string;
  atividadeNome: string; // e.g. "JST", "Orizon", "Klingo"
  nivel: 1 | 2 | 3 | 4 | 5; // Scales 1-5
}

export interface AuditLog {
  id: string;
  usuarioNome: string;
  dataHora: string;
  acao: string;
  infoAnterior?: string;
  infoNova?: string;
}

export interface CompetenceState {
  competenciaAtual: string; // e.g. "Junho/2026"
  competenciasHistorico: string[];
  competenciasMasterFinished: string[]; // Competences marked as finished/closed
}

export interface Holiday {
  id: string;
  nome: string;
  tipo: 'Nacional' | 'Estadual' | 'Municipal';
  data: string; // YYYY-MM-DD
}
