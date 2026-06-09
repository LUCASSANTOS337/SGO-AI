import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ProductionGoal, User, Holiday, Invoice } from '../types';
import { COMPETENCIAS_LIST } from '../utils/competencias';
import { 
  Calculator, Check, Play, ShieldAlert, Award, Calendar, Layers, Sparkles, UserCheck, Settings, ArrowRight,
  UploadCloud, FileSpreadsheet, Trash2, Paperclip, Download
} from 'lucide-react';

interface ProductionConfigProps {
  users: User[];
  holidays: Holiday[];
  activeUser: User | null;
  productionGoals: ProductionGoal[];
  onAddGoal: (goal: Omit<ProductionGoal, 'id' | 'producaoAcumulada' | 'producaHoje' | 'diasRestantes' | 'historicoDiario'>) => void;
  onDeleteGoal?: (goalId: string) => void;
  competenciaAtual: string;
}

export function ProductionConfig({
  users,
  holidays,
  activeUser,
  productionGoals,
  onAddGoal,
  onDeleteGoal,
  competenciaAtual
}: ProductionConfigProps) {
  const hasAccess = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação';

  // State
  const [competencia, setCompetencia] = useState(competenciaAtual || 'Julho/2026');
  const [tipo, setTipo] = useState<'Faturamento Pagto 10' | 'Faturamento Pagto 15' | 'Recurso de Glosa' | 'Outros'>('Faturamento Pagto 10');
  const [quantidadeTotal, setQuantidadeTotal] = useState<number>(1000);
  const [prazoFinal, setPrazoFinal] = useState<string>('2026-07-31');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    users.filter(u => u.role === 'Colaborador' || u.id === 'lucas').map(u => u.id)
  );

  const [spreadsheetFile, setSpreadsheetFile] = useState<{ nome: string; tamanho: string; url?: string } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Advanced States
  const [parsedInvoices, setParsedInvoices] = useState<any[]>([]);
  const [distributionMode, setDistributionMode] = useState<'igualitario' | 'carteira'>('igualitario');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const normalizeRow = (row: any) => {
    const findVal = (keys: string[]) => {
      for (const key of keys) {
        const foundKey = Object.keys(row).find(
          k => k.trim().replace(/[\s\-_]+/g, '').toUpperCase() === key.replace(/[\s\-_]+/g, '').toUpperCase()
        );
        if (foundKey !== undefined) return row[foundKey];
      }
      return undefined;
    };

    const parseBrazilianNumber = (rawVal: any, fieldName: string): number => {
      if (rawVal === undefined || rawVal === null) {
        console.log(`[Import] Campo: ${fieldName} | Valor Original: null/undefined | Valor Convertido: "0" | Valor Gravado: 0`);
        return 0;
      }
      
      const originalStr = String(rawVal).trim();
      if (originalStr === '' || originalStr === '0') {
        console.log(`[Import] Campo: ${fieldName} | Valor Original: "${originalStr}" | Valor Convertido: "0" | Valor Gravado: 0`);
        return 0;
      }

      let convertedStr = originalStr;

      // Rule 1, 2 & 3:
      if (originalStr.includes(',')) {
        // If there is a comma, dots are thousand separators. Remove them.
        convertedStr = originalStr.replace(/\./g, '');
        // Convert comma to dot
        convertedStr = convertedStr.replace(',', '.');
      } else {
        // If there's no comma, support standard decimal notation or integers.
      }

      const parsed = parseFloat(convertedStr);
      const gravado = isNaN(parsed) ? 0 : parsed;

      console.log(`[Import] Campo: ${fieldName} | Valor Original: "${originalStr}" | Valor Convertido: "${convertedStr}" | Valor Gravado: ${gravado}`);
      return gravado;
    };

    const numFatura = String(findVal(['NUM_FATURA', 'NUMEROFATURA', 'FATURA', 'NUM_FAT', 'NUM', 'INVOICE']) || '').trim();
    const codCred = String(findVal(['CODCRED', 'COD_CRED', 'CRED', 'CREDENCIADO']) || '').trim();
    const cgcCpf = String(findVal(['CGC_CPF', 'CGC', 'CPF', 'CNPJ']) || '').trim();
    const nomeFantasia = String(findVal(['NOME_FANTASIA', 'NOMEFANTASIA', 'NOME', 'FANTASIA', 'REMETENTE', 'CLIENTE']) || 'Sem Nome').trim();
    
    const vlFatura = parseBrazilianNumber(findVal(['VL_FATURA', 'VLFATURA', 'VALOR', 'VL_FAT', 'PRECO', 'TOTAL']), 'VL_FATURA');
    const consulta = parseBrazilianNumber(findVal(['CONSULTA', 'CONSUL']), 'CONSULTA');
    const sadt = parseBrazilianNumber(findVal(['SADT', 'SAD_T']), 'SADT');
    const resumoIntern = parseBrazilianNumber(findVal(['RESUMO_INTERN', 'RESUMOINTERN', 'RESUMO', 'INTERNACAO', 'INTERN']), 'RESUMO_INTERN');
    const honorarioIndivid = parseBrazilianNumber(findVal(['HONORARIO_INDIVID', 'HONORARIOINDIVID', 'HONORARIO', 'HONORARIOS']), 'HONORARIO_INDIVID');

    return {
      numFatura,
      codCred,
      cgcCpf,
      nomeFantasia,
      vlFatura,
      consulta,
      sadt,
      resumoIntern,
      honorarioIndivid
    };
  };

  const processFile = (file: File) => {
    setIsParsing(true);
    setParseError(null);
    const formattedSize = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${(file.size / 1024).toFixed(1)} KB`;
    
    const fileUrl = URL.createObjectURL(file);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const workbook = XLSX.read(text, { type: 'string' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const rawRows = XLSX.utils.sheet_to_json(sheet);
          
          if (rawRows.length === 0) {
            setParseError("A planilha selecionada está sem faturas válidas!");
            setIsParsing(false);
            return;
          }
          
          const normalized = rawRows.map(row => normalizeRow(row));
          setParsedInvoices(normalized);
          setSpreadsheetFile({
            nome: file.name,
            tamanho: formattedSize,
            url: fileUrl
          });
        } catch (err: any) {
          setParseError(`Erro ao ler CSV: ${err.message || err}`);
        }
        setIsParsing(false);
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const rawRows = XLSX.utils.sheet_to_json(sheet);
          
          if (rawRows.length === 0) {
            setParseError("A planilha Excel especificada está vazia!");
            setIsParsing(false);
            return;
          }

          const normalized = rawRows.map(row => normalizeRow(row));
          setParsedInvoices(normalized);
          setSpreadsheetFile({
            nome: file.name,
            tamanho: formattedSize,
            url: fileUrl
          });
        } catch (err: any) {
          setParseError(`Erro ao ler arquivo Excel: ${err.message || err}`);
        }
        setIsParsing(false);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Generate a mock dataset of 120 invoices with varying details so the user can easily test the system
  const handleGenerateMockInvoices = () => {
    const mockList = [];
    const names = [
      'Clinica de Olhos São José', 'Hosp Geral das Américas', 'Lab Diagnósticos Vida', 
      'Cardio Imagem Central', 'Ortopedia Trauma Sul', 'Pediatria e Saúde Integrada',
      'Neuro Imagem Avançada', 'Gastro Clinica Rio', 'Laboratório Alfa', 'Hosp São Lucas'
    ];
    
    for (let i = 1; i <= 120; i++) {
      const numFatura = `FAT-2026-${String(1000 + i)}`;
      const codCred = `CRED-${String(100 + (i % 15))}`;
      const cgcCpf = `12.345.678/0001-${String(10 + (i % 90))}`;
      const nomeFantasia = names[i % names.length];
      const vlFatura = Math.round((70 + Math.random() * 630) * 100) / 100;
      
      let consulta = 0;
      let sadt = 0;
      let resumoIntern = 0;
      let honorarioIndivid = 0;
      
      const typeRand = Math.random();
      if (typeRand < 0.15) {
        // Consulta Pura (15%) -> Goes directly to Coordenação automatically
        consulta = 1;
      } else if (typeRand < 0.5) {
        // SADT Simples (35%) -> SADT = 3
        sadt = Math.floor(1 + Math.random() * 4);
      } else if (typeRand < 0.75) {
        // Internações Complexas (25%) -> Internações + SADT + Honorários
        resumoIntern = Math.floor(1 + Math.random() * 2);
        sadt = Math.floor(1 + Math.random() * 2);
        honorarioIndivid = Math.floor(1 + Math.random() * 3);
      } else {
        // SADT + Honorários (25%) -> Mix
        sadt = Math.floor(1 + Math.random() * 3);
        honorarioIndivid = Math.floor(1 + Math.random() * 3);
      }
      
      mockList.push({
        numFatura,
        codCred,
        cgcCpf,
        nomeFantasia,
        vlFatura,
        consulta,
        sadt,
        resumoIntern,
        honorarioIndivid
      });
    }
    
    setParsedInvoices(mockList);
    setSpreadsheetFile({
      nome: 'planilha_faturamento_faturas_120.xlsx',
      tamanho: '24.2 KB',
      url: '#'
    });
    setParseError(null);
  };

  // ADVANCED DISTRIBUTION ALGORITHM (Greedy Multi-way balanced division)
  const getDistributionAnalysis = () => {
    const existingGoal = productionGoals.find(g => g.competencia === competencia && g.nome === tipo);
    const existingInvoices = existingGoal?.faturas || [];

    const jaDistribuidas: any[] = [];
    const novasLidas: any[] = [];

    parsedInvoices.forEach(inv => {
      const alreadyExists = existingInvoices.some(old => old.numFatura === inv.numFatura);
      if (alreadyExists) {
        jaDistribuidas.push(inv);
      } else {
        novasLidas.push(inv);
      }
    });

    const novasConsultasPuras: any[] = [];
    const novasDistribuiveis: any[] = [];

    novasLidas.forEach(inv => {
      const isConsultaPura = inv.consulta > 0 && inv.sadt === 0 && inv.resumoIntern === 0 && inv.honorarioIndivid === 0;
      if (isConsultaPura) {
        novasConsultasPuras.push(inv);
      } else {
        novasDistribuiveis.push(inv);
      }
    });

    const totalLido = parsedInvoices.length;
    const jaDistribuidosCount = jaDistribuidas.length;
    const novasCount = novasLidas.length;
    const consultasPurasCount = novasConsultasPuras.length;
    const distribuiveisCount = novasDistribuiveis.length;

    // Filter active selected analyst users
    const selectedCollaborators = users.filter(u => selectedParticipants.includes(u.id));
    const numAnalysts = selectedCollaborators.length || 1;

    // Determine target quantity per collaborator
    const targets: { [userId: string]: number } = {};
    selectedParticipants.forEach(id => {
      targets[id] = 0;
    });

    if (distribuiveisCount > 0 && selectedParticipants.length > 0) {
      if (distributionMode === 'igualitario') {
        const base = Math.floor(distribuiveisCount / numAnalysts);
        const remainder = distribuiveisCount % numAnalysts;
        selectedParticipants.forEach((pId, idx) => {
          targets[pId] = base + (idx < remainder ? 1 : 0);
        });
      } else {
        // Modo 2 – Balanceamento por Carteira (considerar saldo pendente existente)
        const workloads: { [id: string]: number } = {};
        selectedParticipants.forEach(id => {
          workloads[id] = existingInvoices.filter(f => f.responsavelId === id && f.status === 'Pendente').length;
        });

        for (let k = 0; k < distribuiveisCount; k++) {
          let bestUserId = selectedParticipants[0];
          let minBurden = workloads[bestUserId] + targets[bestUserId];

          selectedParticipants.forEach(id => {
            const burden = workloads[id] + targets[id];
            if (burden < minBurden) {
              minBurden = burden;
              bestUserId = id;
            }
          });

          targets[bestUserId]++;
        }
      }
    }

    // Weight complexity calculation
    const annotatedInvoices = novasDistribuiveis.map(inv => {
      const complexidade = Number(((inv.sadt * 1) + (inv.honorarioIndivid * 1) + (inv.resumoIntern * 2.5)).toFixed(2));
      return {
        ...inv,
        complexidade,
        status: 'Pendente' as 'Pendente' | 'Concluída'
      };
    });

    // Sort descending by complexity weight to distribute complex ones first (best balancing)
    annotatedInvoices.sort((a, b) => b.complexidade - a.complexidade);

    // Prepare buckets
    const buckets: { [id: string]: {
      userId: string;
      userNome: string;
      targetQty: number;
      invoices: any[];
      totalComplexity: number;
      internacoesCount: number;
      sadtQty: number;
      honorarioQty: number;
    }} = {};

    selectedCollaborators.forEach(u => {
      buckets[u.id] = {
        userId: u.id,
        userNome: u.nome,
        targetQty: targets[u.id],
        invoices: [],
        totalComplexity: 0,
        internacoesCount: 0,
        sadtQty: 0,
        honorarioQty: 0
      };
    });

    // Run greedy round-robin on complexity buckets
    annotatedInvoices.forEach(inv => {
      const candidates = Object.values(buckets).filter(b => b.invoices.length < b.targetQty);
      if (candidates.length > 0) {
        let bestBucket = candidates[0];
        candidates.forEach(cand => {
          if (cand.totalComplexity < bestBucket.totalComplexity) {
            bestBucket = cand;
          } else if (cand.totalComplexity === bestBucket.totalComplexity) {
            if (cand.invoices.length < bestBucket.invoices.length) {
              bestBucket = cand;
            }
          }
        });

        bestBucket.invoices.push({
          ...inv,
          responsavelId: bestBucket.userId
        });
        bestBucket.totalComplexity = Number((bestBucket.totalComplexity + inv.complexidade).toFixed(2));
        if (inv.resumoIntern > 0) {
          bestBucket.internacoesCount++;
        }
        bestBucket.sadtQty += inv.sadt;
        bestBucket.honorarioQty += inv.honorarioIndivid;
      }
    });

    const finalDistributedInvoices: any[] = [];
    Object.values(buckets).forEach(b => {
      finalDistributedInvoices.push(...b.invoices);
    });

    // Consultations automatically go to Coordination
    const coordInvoices = novasConsultasPuras.map(inv => ({
      ...inv,
      complexidade: 0,
      responsavelId: 'COORDENACAO',
      status: 'Pendente' as const
    }));

    return {
      existingInvoices,
      jaDistribuidas,
      novasLidas,
      novasConsultasPuras,
      novasDistribuiveis,
      totalLido,
      jaDistribuidosCount,
      novasCount,
      consultasPurasCount,
      distribuiveisCount,
      buckets: Object.values(buckets),
      finalDistributedInvoices,
      coordInvoices
    };
  };

  // Results State
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [calculatedMeta, setCalculatedMeta] = useState<number | null>(null);
  const [recessDetails, setRecessDetails] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  // Filter out inactive users
  const eligibleUsers = users.filter(u => u.status !== 'Inativo');

  const toggleParticipant = (uId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(uId) ? prev.filter(id => id !== uId) : [...prev, uId]
    );
  };

  // Business Days Calculator
  const handleCalculateMeta = () => {
    let startYear = 2026;
    let startMonthNum = 6; 

    const compLower = competencia.toLowerCase();
    if (compLower.includes('junho')) { startMonthNum = 5; }
    else if (compLower.includes('julho')) { startMonthNum = 6; }
    else if (compLower.includes('agosto')) { startMonthNum = 7; }
    else if (compLower.includes('setembro')) { startMonthNum = 8; }
    
    if (compLower.includes('2026')) { startYear = 2026; }
    else if (compLower.includes('2027')) { startYear = 2027; }

    const startDate = new Date(startYear, startMonthNum, 1);
    const endDate = new Date(prazoFinal);

    if (endDate < startDate) {
      alert("A data do Prazo Final não pode ser anterior ao início do mês da competência correspondente!");
      return;
    }

    let workingDaysCount = 0;
    const detectedHolidays: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); 
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const matchedHoliday = holidays.find(h => h.data === dateStr);

      if (isWeekend) {
        // skip
      } else if (matchedHoliday) {
        detectedHolidays.push(`${matchedHoliday.nome} (${day}/${month})`);
      } else {
        workingDaysCount++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const activeWorkingDays = workingDaysCount > 0 ? workingDaysCount : 20;
    const participantsCount = selectedParticipants.length || 1;

    // Use total count of invoices if uploaded, otherwise use specified quantidadeTotal code
    const faturasCount = parsedInvoices.length > 0 
      ? getDistributionAnalysis().finalDistributedInvoices.length 
      : quantidadeTotal;

    const rawTarget = faturasCount / activeWorkingDays / participantsCount;
    const finalTarget = Number(rawTarget.toFixed(2));

    setCalculatedDays(activeWorkingDays);
    setCalculatedMeta(finalTarget);
    setRecessDetails(detectedHolidays);
  };

  const handleSaveGoal = () => {
    if (calculatedDays === null || calculatedMeta === null) {
      alert("Por favor, acione primeiro o botão 'CALCULAR META' para homologar os valores operacionais.");
      return;
    }

    let finalFaturas: Invoice[] = [];
    const analysis = parsedInvoices.length > 0 ? getDistributionAnalysis() : null;

    if (analysis) {
      finalFaturas = [
        ...analysis.existingInvoices,
        ...analysis.finalDistributedInvoices,
        ...analysis.coordInvoices
      ];
    }

    const finalTotalQty = finalFaturas.length > 0 ? finalFaturas.length : quantidadeTotal;

    onAddGoal({
      nome: tipo,
      competencia,
      quantidadeTotal: finalTotalQty,
      diasUteis: calculatedDays,
      participantesIds: selectedParticipants,
      planilhaAnexo: spreadsheetFile || undefined,
      faturas: finalFaturas.length > 0 ? finalFaturas : undefined
    });

    setShowSuccess(`Configuração de Produção "${tipo}" salva com sucesso! ${
      finalFaturas.length > 0 
        ? `${finalFaturas.length} faturas registradas no total (Novas distribuídas e consultas purificadas na Coordenação).`
        : ''
    }`);

    setTimeout(() => {
      setShowSuccess(null);
      setCalculatedDays(null);
      setCalculatedMeta(null);
      setSpreadsheetFile(null);
      setParsedInvoices([]);
    }, 4500);
  };

  if (!hasAccess) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500 shadow-sm max-w-lg mx-auto space-y-4">
        <ShieldAlert className="mx-auto text-rose-500 animate-pulse" size={40} />
        <h3 className="text-zinc-900 dark:text-white font-extrabold text-sm uppercase tracking-wide">Acesso Restrito</h3>
        <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed">
          Esta central de configuração é restrita a usuários de nível <strong>Administrador</strong> ou <strong>Coordenação</strong>. Seu perfil atual de <strong>{activeUser?.role}</strong> não possui essa atribuição regulamentar.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Title */}
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 leading-none">
          📈 Configuração de Planejamento de Produção Mensal
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Ajuste as metas globais deduzindo apenas os expedientes úteis e escalando o ranking setorial.
        </p>
      </div>

      {showSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-zinc-850 text-emerald-800 dark:text-emerald-400 border border-emerald-150 dark:border-zinc-800 rounded-xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <Check size={14} className="stroke-2" />
          <span>{showSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Conf fields panel */}
        <div className="lg:col-span-7 space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Competência Operacional</label>
              <select
                value={competencia}
                onChange={e => {
                  setCompetencia(e.target.value);
                  setCalculatedDays(null);
                  setCalculatedMeta(null);
                  
                  // Auto shift final prazo estimation depending on chosen month/year dynamically
                  try {
                    const [mesNome, anoStr] = e.target.value.split('/');
                    const anoVal = parseInt(anoStr) || 2026;
                    const mesesMap: { [key: string]: number } = {
                      'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
                      'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
                    };
                    const mesVal = mesesMap[mesNome] !== undefined ? mesesMap[mesNome] : 5;
                    const lastDay = new Date(anoVal, mesVal + 1, 0).getDate();
                    const mesFormat = String(mesVal + 1).padStart(2, '0');
                    setPrazoFinal(`${anoVal}-${mesFormat}-${lastDay}`);
                  } catch (err) {
                    setPrazoFinal('2026-06-30');
                  }
                }}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-purple-650 dark:text-purple-400 font-bold cursor-pointer"
              >
                {COMPETENCIAS_LIST.map(comp => (
                  <option key={comp} value={comp} className="text-purple-600 dark:text-purple-450 font-bold bg-white dark:bg-zinc-900">
                    {comp}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Tipo da Fatura / Atividade</label>
              <select
                value={tipo}
                onChange={e => {
                  setTipo(e.target.value as any);
                  setCalculatedDays(null);
                  setCalculatedMeta(null);
                }}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white"
              >
                <option value="Faturamento Pagto 10">Faturamento Pagto 10</option>
                <option value="Faturamento Pagto 15">Faturamento Pagto 15</option>
                <option value="Recurso de Glosa">Recurso de Glosa</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Quantidade Total (Volume Programado)</label>
              <input
                type="number"
                required
                value={quantidadeTotal}
                onChange={e => {
                  setQuantidadeTotal(parseInt(e.target.value) || 0);
                  setCalculatedDays(null);
                  setCalculatedMeta(null);
                }}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Prazo Final da Entrega</label>
              <input
                type="date"
                required
                value={prazoFinal}
                onChange={e => {
                  setPrazoFinal(e.target.value);
                  setCalculatedDays(null);
                  setCalculatedMeta(null);
                }}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Spreadsheet Upload section */}
          <div className="space-y-2 select-none font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Anexar Planilha com Numeração de Faturas
              </label>
              <button 
                type="button" 
                onClick={handleGenerateMockInvoices}
                className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-extrabold underline flex items-center gap-1 cursor-pointer transition-all"
              >
                <Sparkles size={11} /> Simular Planilha de Teste (120 faturas)
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />

            {!spreadsheetFile ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-inner'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-750 bg-zinc-50/30 dark:bg-zinc-950/20'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-1.5 font-sans">
                  <UploadCloud className="text-zinc-400 dark:text-zinc-500 animate-pulse" size={26} />
                  <p className="font-extrabold text-zinc-700 dark:text-zinc-300 text-[11px]">
                    Arraste sua planilha para cá ou <span className="text-indigo-650 dark:text-indigo-400 underline font-black">clique para procurar</span>
                  </p>
                  <p className="text-[9px] text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Formatos suportados: .xlsx, .xls, .csv com as colunas NUM_FATURA, CODCRED, CGC_CPF, NOME_FANTASIA, VL_FATURA, CONSULTA, SADT, RESUMOINTERN, HONORARIOINDIVID.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 font-sans">
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/40 dark:border-emerald-900/30 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-emerald-100/70 dark:bg-emerald-950/65 text-emerald-650 dark:text-emerald-450 rounded-xl shrink-0">
                      <FileSpreadsheet size={18} />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="font-black text-[11px] text-zinc-800 dark:text-zinc-150 truncate leading-none flex items-center gap-1.5">
                        {spreadsheetFile.nome}
                        <span className="text-[8px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400 px-1 py-0.5 rounded font-mono font-bold uppercase tracking-wide">Excel / CSV lido</span>
                      </p>
                      <p className="text-[9px] text-zinc-500 mt-1.5 font-mono font-extrabold leading-none">
                        {spreadsheetFile.tamanho} • Foram identificadas {parsedInvoices.length} faturas brutas.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setSpreadsheetFile(null);
                        setParsedInvoices([]);
                        setParseError(null);
                      }}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200/60 dark:border-rose-900/43 transition cursor-pointer"
                      title="Remover planilha"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {parseError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-955/10 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-950/30 rounded-xl text-[10px] font-bold flex items-center gap-1.5 leading-tight animate-fade-in font-sans">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* ADVANCED DISTRIBUTOR CARD PANEL */}
          {parsedInvoices.length > 0 && (() => {
            const analysis = getDistributionAnalysis();
            return (
              <div className="space-y-4 bg-zinc-50/50 dark:bg-zinc-950/40 p-4 border dark:border-zinc-850 rounded-2xl animate-fade-in text-xs select-none font-sans">
                
                {/* Header and Mode Selector */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b dark:border-zinc-850 pb-3">
                  <div>
                    <h4 className="font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider text-[10px]">
                      ⚖️ Prévia da Distribuição de Faturas
                    </h4>
                    <p className="text-[9px] text-zinc-500">
                      Balanceamento automático de complexidade operacional e carteira.
                    </p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl border dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setDistributionMode('igualitario')}
                      className={`px-3 py-1 text-[10px] uppercase font-black tracking-wide rounded-lg transition-all cursor-pointer ${
                        distributionMode === 'igualitario'
                          ? 'bg-white dark:bg-zinc-800 text-purple-750 dark:text-purple-400 shadow-sm font-black'
                          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350'
                      }`}
                    >
                      Modo 1: Igualitário
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistributionMode('carteira')}
                      className={`px-3 py-1 text-[10px] uppercase font-black tracking-wide rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        distributionMode === 'carteira'
                          ? 'bg-white dark:bg-zinc-800 text-purple-750 dark:text-purple-400 shadow-sm font-black'
                          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350'
                      }`}
                    >
                      Modo 2: Carteira Pendente
                    </button>
                  </div>
                </div>

                {/* Resumo da Importação Grid */}
                <div>
                  <h5 className="font-bold text-zinc-400 text-[9px] uppercase tracking-wider mb-2">Resumo da Importação (Lote)</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="p-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl">
                      <p className="text-[9px] font-bold text-zinc-455 uppercase leading-none">Total Lido</p>
                      <p className="text-sm font-black text-zinc-900 dark:text-white mt-1 leading-none">{analysis.totalLido}</p>
                    </div>
                    <div className="p-2.5 bg-zinc-100/60 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl relative group">
                      <p className="text-[9px] font-bold text-zinc-455 uppercase flex items-center justify-center gap-1 leading-none">
                        Já Distribuídas
                      </p>
                      <p className="text-sm font-black text-zinc-550 dark:text-zinc-405 mt-1 leading-none">{analysis.jaDistribuidosCount}</p>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl">
                      <p className="text-[9px] font-bold text-zinc-455 uppercase leading-none">Novas Lidas</p>
                      <p className="text-sm font-black text-indigo-650 dark:text-indigo-400 mt-1 leading-none">{analysis.novasCount}</p>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl">
                      <p className="text-[9px] font-bold text-emerald-650 dark:text-emerald-450 uppercase leading-none">Consultas</p>
                      <p className="text-sm font-black text-emerald-600 mt-1 leading-none">{analysis.consultasPurasCount}</p>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl">
                      <p className="text-[9px] font-bold text-zinc-455 uppercase leading-none">Distribuíveis</p>
                      <p className="text-sm font-black text-purple-650 dark:text-purple-400 mt-1 leading-none">{analysis.distribuiveisCount}</p>
                    </div>
                  </div>
                  {analysis.jaDistribuidosCount > 0 && (
                    <p className="text-[9px] leading-relaxed text-indigo-600 dark:text-indigo-450 font-bold bg-indigo-50/40 dark:bg-zinc-900/30 p-2 rounded-lg border border-indigo-100 dark:border-indigo-950 mt-2 flex items-center gap-1.5">
                      <Check size={11} className="stroke-2 shrink-0 text-emerald-500" />
                      <span><strong>Importação Incremental Ativa</strong>: As {analysis.jaDistribuidosCount} faturas já existentes foram preservadas e suas atribuições, statuses e históricos continuam inalterados!</span>
                    </p>
                  )}
                </div>

                {/* Per Collaborator Balance Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-455 mt-2">
                    <span>Rateio Balançado por Colaborador Participante ({eligibleUsers.filter(u => selectedParticipants.includes(u.id)).length})</span>
                    <span className="text-[8px] bg-purple-100 dark:bg-zinc-800 text-purple-800 dark:text-purple-400 px-1.5 py-0.5 rounded font-mono">Diferença Máxima: 1 fatura</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {analysis.buckets.map(b => (
                      <div key={b.userId} className="p-3 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl space-y-2 relative overflow-hidden shadow-sm">
                        {/* Title and Badge */}
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-zinc-900 dark:text-white flex items-center gap-1 truncate">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 block shrink-0"></span>
                            {b.userNome}
                          </span>
                          <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                            {b.targetQty} faturas
                          </span>
                        </div>

                        {/* Inds */}
                        <div className="grid grid-cols-4 gap-1.5 text-center pt-2 border-t dark:border-zinc-850">
                          <div className="p-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                            <p className="text-[7px] uppercase font-bold text-zinc-400 tracking-wider leading-none">Comp.</p>
                            <span className="text-[10px] font-black text-zinc-950 dark:text-white leading-none mt-0.5 block">{b.totalComplexity} pt</span>
                          </div>
                          <div className="p-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                            <p className="text-[7px] uppercase font-bold text-zinc-400 tracking-wider leading-none">Intern.</p>
                            <span className="text-[10px] font-bold text-rose-500 leading-none mt-0.5 block">{b.internacoesCount}</span>
                          </div>
                          <div className="p-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                            <p className="text-[7px] uppercase font-bold text-zinc-400 tracking-wider leading-none">SADT</p>
                            <span className="text-[10px] font-bold text-indigo-505 leading-none mt-0.5 block">{b.sadtQty}</span>
                          </div>
                          <div className="p-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                            <p className="text-[7px] uppercase font-bold text-zinc-400 tracking-wider leading-none">Hono.</p>
                            <span className="text-[10px] font-bold text-amber-500 leading-none mt-0.5 block">{b.honorarioQty}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit table glimpse */}
                <div className="max-h-44 overflow-y-auto border border-zinc-150 dark:border-zinc-850 rounded-xl bg-white dark:bg-zinc-900">
                  <table className="w-full text-[9px] text-left text-zinc-550 border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 border-b dark:border-zinc-850">
                      <tr>
                        <th className="p-2 font-bold uppercase text-zinc-400">Nº Fatura</th>
                        <th className="p-2 font-bold uppercase text-zinc-400 font-sans">Remetente/Fantasia</th>
                        <th className="p-2 font-bold uppercase text-zinc-400 text-right">Valor bruto</th>
                        <th className="p-2 font-bold uppercase text-zinc-400 text-center">Complex.</th>
                        <th className="p-2 font-bold uppercase text-zinc-400 font-sans">Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-zinc-850">
                      {/* Top 15 to show preview */}
                      {analysis.finalDistributedInvoices.slice(0, 15).map((fat, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/60 transition-colors">
                          <td className="p-2 font-mono font-bold text-zinc-900 dark:text-zinc-100">{fat.numFatura}</td>
                          <td className="p-2 truncate max-w-[125px] font-semibold">{fat.nomeFantasia}</td>
                          <td className="p-2 text-right font-mono font-bold text-zinc-700 dark:text-zinc-300">
                            {fat.vlFatura.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-2 text-center font-mono font-extrabold text-amber-600">{fat.complexidade} pt</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-805 dark:text-indigo-400 rounded-md font-bold text-[8.5px]">
                              {eligibleUsers.find(u => u.id === fat.responsavelId)?.nome || fat.responsavelId}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {analysis.finalDistributedInvoices.length > 15 && (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-[9px] text-zinc-405 italic bg-zinc-50/20">
                            + {analysis.finalDistributedInvoices.length - 15} faturas distribuídas no mesmo lote científico...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })()}

          {/* Checklist of participants */}
          <div className="space-y-2 select-none font-sans">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center justify-between">
              <span>Selecione os Participantes da Meta ({selectedParticipants.length})</span>
              <span className="text-zinc-500 font-normal">Apenas operadores ativos</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-zinc-50/50 dark:bg-zinc-950/60 p-3.5 border dark:border-zinc-850 rounded-xl">
              {eligibleUsers.map(u => {
                const isSelected = selectedParticipants.includes(u.id);
                return (
                  <label 
                    key={u.id} 
                    className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition ${isSelected ? 'bg-indigo-50/40 border-indigo-200 dark:bg-zinc-850 dark:border-zinc-750' : 'bg-white border-zinc-150 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800'}`}
                  >
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleParticipant(u.id)}
                      className="rounded text-indigo-650 focus:ring-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-[9px] text-indigo-750 dark:text-indigo-400 shrink-0 select-none">
                        {u.nome ? u.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CO'}
                      </div>
                      <span className="font-extrabold text-purple-600 dark:text-purple-400 truncate">{u.nome}</span>
                      <span className="text-[9px] text-zinc-400">({u.role === 'Admin' ? 'Admin' : 'Colab'})</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCalculateMeta}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold transition text-white rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-xs font-sans"
            >
              <Calculator size={14} /> CALCULAR META Setorial
            </button>
          </div>

        </div>

        {/* Calculation Result sidebar */}
        <div className="lg:col-span-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-5 animate-fade-in text-xs select-none">
          
          <div className="space-y-4 font-sans">
            <h4 className="font-bold text-zinc-900 dark:text-white border-b pb-2 dark:border-zinc-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Settings size={13} className="text-zinc-400" /> Resultado de Simulação Operacional
            </h4>

            {calculatedDays !== null && calculatedMeta !== null ? (
              <div className="space-y-4">
                
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Volume Total Programado</span>
                  <div className="text-base font-black text-zinc-900 dark:text-white leading-none">
                    {parsedInvoices.length > 0 
                      ? `${getDistributionAnalysis().finalDistributedInvoices.length} faturas analíticas` 
                      : `${quantidadeTotal} faturas`
                    }
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Expedientes Úteis Encontrados</span>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400 leading-none">{calculatedDays} dias úteis</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Participantes Ativos</span>
                  <div className="text-base font-black text-zinc-800 dark:text-zinc-200 leading-none">{selectedParticipants.length} integrantes</div>
                </div>

                {recessDetails.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-amber-500">Feriados deduzidos ({recessDetails.length}):</span>
                    <div className="flex flex-wrap gap-1">
                      {recessDetails.map((det, i) => (
                        <span key={i} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-[9px] border border-amber-200/50 text-amber-700 dark:text-amber-400 rounded-lg">
                          {det}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-indigo-50/50 dark:bg-zinc-900 border border-indigo-150/40 dark:border-zinc-800 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-indigo-500 block text-[8px]">META DIÁRIA INDIVIDUAL ESTIMADA</span>
                  <div className="text-sm font-black text-indigo-700 dark:text-white flex items-baseline gap-1.5 leading-none">
                    {calculatedMeta}
                    <span className="text-[10px] font-normal text-zinc-400">faturas / dia por pessoa</span>
                  </div>
                  <p className="text-[9.5px] text-zinc-455 pt-1.5 border-t dark:border-zinc-850 leading-relaxed font-semibold">
                    Fórmula SGO: Qtd Atribuída ({
                      parsedInvoices.length > 0 
                        ? getDistributionAnalysis().finalDistributedInvoices.length 
                        : quantidadeTotal
                    }) ÷ {calculatedDays} d.u. ÷ {selectedParticipants.length} colab = {calculatedMeta}/dia
                  </p>
                </div>

              </div>
            ) : (
              <div className="text-center py-10 text-zinc-400 font-medium italic space-y-2">
                <Calculator size={30} className="mx-auto text-zinc-300 animate-bounce" />
                <p>Preencha os campos ao lado e execute o cálculo da meta de planejamento para liberar a homologação.</p>
              </div>
            )}
          </div>

          {calculatedMeta !== null && (
            <button
              onClick={handleSaveGoal}
              className="w-full text-center py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex justify-center items-center gap-1.5 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer font-sans"
            >
              Salvar e Registrar Lote de Metas <ArrowRight size={13} />
            </button>
          )}

        </div>

      </div>

      {/* SECTION: REGISTERED PRODUCTION PLANS/DISTRIBUTIONS */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 leading-none">
            <Layers size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Distribuições e Lotes de Metas Cadastrados</span>
          </h4>
          <p className="text-[11px] text-zinc-500 mt-1">
            Lista de planejamentos mensais de produção ativos para o setor. Você pode excluir uma distribuição para refazê-la se necessário.
          </p>
        </div>

        {productionGoals.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-950/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-455 italic">
            Nenhum lote de metas ou distribuição cadastrado até o momento.
          </div>
        ) : (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden">
            <table className="w-full text-left border-collapse text-[11px] select-none">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-800 font-bold uppercase text-[9px] tracking-wider text-zinc-400">
                <tr>
                  <th className="p-3">Competência</th>
                  <th className="p-3">Tipo / Lote</th>
                  <th className="p-3 text-center">Volume Total</th>
                  <th className="p-3 text-center">Dias Úteis</th>
                  <th className="p-3 text-center">Meta Individual</th>
                  <th className="p-3">Integrantes Alocados</th>
                  <th className="p-3 text-center">Faturas Analíticas</th>
                  <th className="p-3 text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-zinc-850">
                {productionGoals.map((goal) => {
                  const numParticipants = goal.participantesIds.length;
                  const dailyAverage = numParticipants > 0 && goal.diasUteis > 0 
                    ? (goal.quantidadeTotal / goal.diasUteis / numParticipants).toFixed(1)
                    : '0';

                  const excelAnexo = goal.planilhaAnexo;
                  const numFaturas = goal.faturas ? goal.faturas.length : 0;

                  return (
                    <tr key={goal.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                      <td className="p-3 font-bold text-zinc-950 dark:text-white">
                        {goal.competencia}
                      </td>
                      <td className="p-3 font-semibold text-indigo-650 dark:text-indigo-400 uppercase tracking-wide">
                        {goal.nome}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-zinc-805 dark:text-zinc-200">
                        {goal.quantidadeTotal} {goal.quantidadeTotal === 1 ? 'unidade' : 'unidades'}
                      </td>
                      <td className="p-3 text-center font-mono font-medium text-zinc-707 dark:text-zinc-303">
                        {goal.diasUteis} d.u.
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="px-2 py-0.5 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-lg font-extrabold text-[10px]">
                          {dailyAverage}/dia
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {goal.participantesIds.map(pId => {
                            const uName = users.find(u => u.id === pId)?.nome || pId;
                            return (
                              <span key={pId} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-600 dark:text-zinc-300 rounded" title={uName}>
                                {uName.split(' ')[0]}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {excelAnexo ? (
                          <div className="inline-flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/10">
                            <FileSpreadsheet size={10} />
                            <span>{numFaturas} faturas</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">Entrada manual</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {confirmDeleteId === goal.id ? (
                          <div className="flex flex-col gap-1 items-center justify-center min-w-[70px]">
                            <span className="text-[8px] font-bold text-rose-600 leading-none">Excluir?</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onDeleteGoal) {
                                    onDeleteGoal(goal.id);
                                  }
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] rounded cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold text-[9px] rounded cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!onDeleteGoal}
                            onClick={() => {
                              setConfirmDeleteId(goal.id);
                            }}
                            className={`p-1.5 rounded-lg border text-rose-600 border-rose-100 hover:bg-rose-50 dark:border-rose-955 dark:hover:bg-rose-955/30 transition-all ${onDeleteGoal ? 'cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed'}`}
                            title="Excluir Planejamento/Distribuição"
                          >
                            <Trash2 size={13} className="stroke-2" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
