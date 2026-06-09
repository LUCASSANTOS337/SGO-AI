import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Server-side initialization of Gemini SDK
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// API endpoint for SGO AI Chat Assistant
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemState, activeUser } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Campo 'messages' é obrigatório e precisa ser um array." });
    }

    if (!ai) {
      return res.status(503).json({
        error: "O Assistente de IA não está configurado. Por favor, adicione sua GEMINI_API_KEY no painel de Secrets da plataforma."
      });
    }

    // Compile an expansive prompt contextualizing the AI with the entire, real-time simulated client state
    const formattedDate = new Date().toLocaleDateString('pt-BR');

    const contextInstruction = `
Você é o SGO AI, o Assistente de Inteligência Artificial do Sistema de Gestão Operacional (SGO).
Seu objetivo é auxiliar os membros da equipe (Colaboradores, Coordenação e Administração) fornecendo respostas rápidas, precisas e analíticas sobre a operação em tempo real.

DADOS DA OPERAÇÃO ATUAL (DATA DE HOJE: ${formattedDate}):
--------------------------------------------------
Usuário Logado no Momento: ${JSON.stringify(activeUser)}

ESTADO DO SISTEMA EM TEMPO REAL:
${JSON.stringify(systemState, null, 2)}
--------------------------------------------------

INSTRUÇÕES DE RESPOSTA E COMPORTAMENTO:
1. Responda em Português do Brasil (PT-BR), sempre de forma profissional, atenciosa e objetiva. Evite falar em jargões técnicos sobre a estrutura do JSON. Fale como se estivesse vendo as telas do sistema.
2. Seja preciso ao responder perguntas como:
   - "O que tenho para fazer hoje?": Responda listando as atividades onde o 'responsavelAtualId' coincide com o id do Usuário Logado ("${activeUser?.id || ''}"). Informe nome da atividade, status e prioridade.
   - "Quem está de férias?": Procure na lista de férias (vacations) e identifique quem tem férias ativas ou agendadas.
   - "Quem está substituindo Ila Ramos?" (ou qualquer outro colaborador): Analise a atribuição de férias do colaborador em férias ("redistribuicoes" mapeando atividadeId para o id do substituto).
   - "Quais atividades estão atrasadas?" ou "Atividades vencendo em 5 dias": Verifique as atividades com status diferente de 'Concluída' e cujo campo 'dataLimite' indica atraso ou vencimento próximo.
   - "Quem está abaixo da meta?": Analise as metas de produção ('productionGoals'). Para cada participante da meta, calcule a meta diária e compare com o que foi produzido hoje.
   - "Risco operacional": Destaque atividades com classificação crítica ou que possuem apenas um executor com domínio avançado/especialista na matriz de conhecimento.
3. Não invente dados fantasiosos. Se determinada informação não for encontrada no estado atual, explique educadamente.
4. Mantenha as respostas concisas e formate-as elegantemente com Markdown (use negritos, listas e tabelas se necessário).
`.trim();

    // Map the user conversation history correctly. We can do this by forming inline parts.
    // Let's pass the context as part of the prompt
    const contents: any[] = [];
    
    // Add structured history
    messages.forEach((msg: any) => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: contextInstruction,
        temperature: 0.2, // Lower temperature to keep output factual and analytic
      }
    });

    const responseText = response.text || "Desculpe, não consegui obter uma resposta adequada.";
    res.json({ text: responseText });
    
  } catch (err: any) {
    console.error("Erro no processamento do SGO AI:", err);
    res.status(500).json({ error: "Erro interno ao processar a resposta do Assistente SGO AI.", details: err.message });
  }
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiConfigured: !!ai });
});

// Vite middleware for development or Static File serving for production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configurando middleware do Vite para o modo de desenvolvimento...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Configurando distribuição estática para o modo de produção...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SGO AI] Servidor operacional iniciado na porta ${PORT}`);
  });
}).catch(err => {
  console.error("Falha ao inicializar o servidor SGO AI:", err);
});
