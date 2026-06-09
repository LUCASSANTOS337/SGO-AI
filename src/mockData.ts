import { User, Activity, Vacation, ProductionGoal, Procedure, KnowledgeRating, AuditLog } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'leandro',
    nome: 'Leandro Menezes',
    email: 'leandro.menezes@asfeb.org.br',
    role: 'Colaborador',
    metaDiariaPadrao: 12.5,
    funcao: 'ANALISTA PLENO',
    senha: '123'
  },
  {
    id: 'lucas',
    nome: 'Lucas Alves',
    email: 'lucas.alves@empresa.com',
    role: 'Admin',
    metaDiariaPadrao: 12.5,
    funcao: 'COORDENAÇÃO'
  },
  {
    id: 'ila',
    nome: 'Ila Ramos',
    email: 'ila.ramos@empresa.com',
    role: 'Coordenação',
    metaDiariaPadrao: 0,
    funcao: 'COORDENAÇÃO'
  },
  {
    id: 'luan',
    nome: 'Luan Ferreira',
    email: 'luan.ferreira@empresa.com',
    role: 'Colaborador',
    metaDiariaPadrao: 12.5,
    funcao: 'ANALISTA PLENO'
  },
  {
    id: 'ana',
    nome: 'Ana Lucia',
    email: 'ana.lucia@empresa.com',
    role: 'Colaborador',
    metaDiariaPadrao: 12.5,
    funcao: 'ANALISTA JUNIOR'
  },
  {
    id: 'maria',
    nome: 'Maria da Paz',
    email: 'maria.paz@empresa.com',
    role: 'Colaborador',
    metaDiariaPadrao: 12.5,
    funcao: 'ANALISTA SENIÔR'
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    nome: 'Processamento JST',
    competencia: 'Junho/2026',
    responsavelOriginalId: 'luan',
    responsavelAtualId: 'luan',
    responsaveisAuxiliaresIds: ['ana'],
    prioridade: 'Crítica',
    status: 'Em andamento',
    dataLimite: '2026-06-15',
    recorrente: true,
    periodicidade: 'Mensal',
    mesesAtividadeComMesmoResponsavel: 12,
    comentarios: [
      {
        id: 'com-1',
        autorId: 'ila',
        autorNome: 'Ila Ramos',
        texto: 'Atenção com as faturas JST atrasadas da primeira quinzena.',
        dataHora: '2026-06-02 09:30'
      }
    ],
    anexos: [
      {
        id: 'att-1',
        nome: 'template_jst_junho.xlsx',
        tamanho: '24 KB',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    ]
  },
  {
    id: 'act-2',
    nome: 'Auditoria Orizon',
    competencia: 'Junho/2026',
    responsavelOriginalId: 'ana',
    responsavelAtualId: 'ana',
    responsaveisAuxiliaresIds: ['maria'],
    prioridade: 'Alta',
    status: 'Pendente',
    dataLimite: '2026-06-20',
    recorrente: true,
    periodicidade: 'Mensal',
    mesesAtividadeComMesmoResponsavel: 3,
    comentarios: [],
    anexos: []
  },
  {
    id: 'act-3',
    nome: 'Fechamento Klingo',
    competencia: 'Junho/2026',
    responsavelOriginalId: 'maria',
    responsavelAtualId: 'maria',
    responsaveisAuxiliaresIds: [],
    prioridade: 'Média',
    status: 'Concluída',
    dataLimite: '2026-06-10',
    recorrente: false,
    mesesAtividadeComMesmoResponsavel: 5,
    comentarios: [
      {
        id: 'com-2',
        autorId: 'maria',
        autorNome: 'Maria da Paz',
        texto: 'Klingo concluído com antecedência e faturas já conciliadas.',
        dataHora: '2026-06-03 14:15'
      }
    ],
    anexos: []
  },
  {
    id: 'act-4',
    nome: 'Reconciliação Bradesco',
    competencia: 'Junho/2026',
    responsavelOriginalId: 'lucas',
    responsavelAtualId: 'lucas',
    responsaveisAuxiliaresIds: ['luan'],
    prioridade: 'Alta',
    status: 'Em andamento',
    dataLimite: '2026-06-12',
    recorrente: true,
    periodicidade: 'Mensal',
    mesesAtividadeComMesmoResponsavel: 1,
    comentarios: [],
    anexos: []
  }
];

export const INITIAL_VACATIONS: Vacation[] = [
  {
    id: 'vac-1',
    colaboradorId: 'ana',
    dataInicio: '2026-06-10',
    dataFim: '2026-06-25',
    redistribuida: false,
    redistribuicoes: {}
  }
];

export const INITIAL_GOALS: ProductionGoal[] = [
  {
    id: 'goal-1',
    nome: 'Faturamento Pagto 10',
    competencia: 'Junho/2026',
    quantidadeTotal: 1000,
    diasUteis: 20,
    participantesIds: ['luan', 'ana', 'maria', 'lucas'],
    producaoAcumulada: {
      luan: 120,
      ana: 110,
      maria: 130,
      lucas: 125
    },
    producaHoje: {
      luan: 15,
      ana: 10, // Ana did 10 (she needs 12.5) -> meta não atingida!
      maria: 14,
      lucas: 13
    },
    diasRestantes: 12,
    historicoDiario: {
      '2026-06-01': { luan: 14, ana: 13, maria: 12, lucas: 13 },
      '2026-06-02': { luan: 15, ana: 12, maria: 14, lucas: 12 }
    }
  }
];

export const INITIAL_PROCEDURES: Procedure[] = [
  {
    id: 'proc-1',
    titulo: 'Processamento de Contas JST',
    descricao: 'Este procedimento detalha a ordem de checagem e importação das faturas JST no sistema ERP.',
    passos: [
      'Acesse o portal da JST de faturas com suas credenciais seguras.',
      'Baixe o arquivo unificado do mês corrente em formato .xlsx.',
      'Valide a consistência das datas e CNPJs contra o cadastro de fornecedores.',
      'Importe o arquivo na área fiscal do ERP e revise se houveram rejeições.'
    ],
    autorId: 'luan',
    status: 'Aprovado',
    dataSugerida: '2026-05-12'
  },
  {
    id: 'proc-2',
    titulo: 'Conciliação Financeira Orizon',
    descricao: 'Instruções para realizar a conferência dos repasses Orizon vs extrato bancário semanal.',
    passos: [
      'Extrair relatório financeiro consolidado do portal Orizon.',
      'Filtrar por data de repasse operacional da competência.',
      'Cruzar com os lançamentos de entrada no banco de destino.',
      'Se houver divergência, acionar o suporte de contas a receber.'
    ],
    autorId: 'ana',
    status: 'Sugerido',
    dataSugerida: '2026-06-01'
  }
];

export const INITIAL_KNOWLEDGE: KnowledgeRating[] = [
  { colaboradorId: 'lucas', atividadeNome: 'Processamento JST', nivel: 5 },
  { colaboradorId: 'lucas', atividadeNome: 'Auditoria Orizon', nivel: 4 },
  { colaboradorId: 'lucas', atividadeNome: 'Fechamento Klingo', nivel: 4 },
  { colaboradorId: 'lucas', atividadeNome: 'Reconciliação Bradesco', nivel: 5 },

  { colaboradorId: 'ila', atividadeNome: 'Processamento JST', nivel: 4 },
  { colaboradorId: 'ila', atividadeNome: 'Auditoria Orizon', nivel: 5 },

  { colaboradorId: 'luan', atividadeNome: 'Processamento JST', nivel: 5 },
  { colaboradorId: 'luan', atividadeNome: 'Auditoria Orizon', nivel: 2 },
  { colaboradorId: 'luan', atividadeNome: 'Fechamento Klingo', nivel: 1 },
  { colaboradorId: 'luan', atividadeNome: 'Reconciliação Bradesco', nivel: 3 },

  { colaboradorId: 'ana', atividadeNome: 'Processamento JST', nivel: 2 },
  { colaboradorId: 'ana', atividadeNome: 'Auditoria Orizon', nivel: 5 },
  { colaboradorId: 'ana', atividadeNome: 'Fechamento Klingo', nivel: 3 },
  { colaboradorId: 'ana', atividadeNome: 'Reconciliação Bradesco', nivel: 2 },

  { colaboradorId: 'maria', atividadeNome: 'Processamento JST', nivel: 1 },
  { colaboradorId: 'maria', atividadeNome: 'Auditoria Orizon', nivel: 3 },
  { colaboradorId: 'maria', atividadeNome: 'Fechamento Klingo', nivel: 5 },
  { colaboradorId: 'maria', atividadeNome: 'Reconciliação Bradesco', nivel: 1 }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    usuarioNome: 'Sistema',
    dataHora: '2026-06-01 08:00',
    acao: 'Abertura de Competência',
    infoAnterior: 'Nenhuma',
    infoNova: 'Competência Junho/2026 iniciada automaticamente.'
  },
  {
    id: 'log-2',
    usuarioNome: 'Lucas Alves',
    dataHora: '2026-06-01 10:15',
    acao: 'Alteração de Atividade',
    infoAnterior: 'Responsável: Ila Ramos',
    infoNova: 'Processamento JST atribuído para Luan Ferreira'
  }
];
