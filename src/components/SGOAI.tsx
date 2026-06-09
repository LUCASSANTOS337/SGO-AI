import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, X, CornerDownLeft, Loader2, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface SGOAIProps {
  systemState: any;
  activeUser: User | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const METADATA_HOT_PROMPTS = [
  { text: 'O que tenho para fazer hoje?', icon: '📋' },
  { text: 'Quem está de férias?', icon: '🌴' },
  { text: 'Quem está abaixo da meta?', icon: '⚠️' },
  { text: 'Quais atividades estão atrasadas?', icon: '⏰' },
  { text: 'Quem está substituindo Ana Lucia?', icon: '🔄' }, // Ana is in mock vacations
  { text: 'Qual a produção acumulada da competência?', icon: '📈' },
  { text: 'Quais atividades possuem risco operacional?', icon: '🛡️' }
];

export function SGOAI({ systemState, activeUser, isOpen, onClose }: SGOAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Olá **${activeUser?.nome || 'Operador'}**! Sou o **SGO AI**, o assistente inteligente da sua operação. 

Tenho visibilidade total e em tempo real sobre a competência **${systemState?.competence?.competenciaAtual || 'Junho/2026'}**. Você pode usar os botões rápidos abaixo ou me fazer qualquer pergunta sobre as atividades da equipe!`
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorStatus(null);
    const updatedMessages = [...messages, { role: 'user', content: textToSend } as ChatMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          systemState: systemState,
          activeUser: activeUser
        })
      });

      if (!response.ok) {
        let errMessage = "Falha no servidor Gemini";
        try {
          const errData = await response.json();
          errMessage = errData.error || errMessage;
        } catch(e){}
        throw new Error(errMessage);
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Erro de rede ou chave de API ausente.');
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: '⚠️ **Erro operacional**: Não consegui carregar a resposta do assistente do outro lado do servidor. Por favor, verifique se a sua chave `GEMINI_API_KEY` está configurada nos segredos ou tente novamente.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white dark:bg-zinc-950 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200 dark:shadow-none">
            <Bot size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 leading-none">
              SGO AI Assistente
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Conectado aos dados operacionais</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/40 dark:bg-zinc-950/20">
        {messages.map((message, index) => {
          const isAI = message.role === 'assistant';
          return (
            <div 
              key={index} 
              className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              <div className={`p-2 rounded-xl flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold ${
                isAI ? 'bg-indigo-50 border border-indigo-150 text-indigo-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
              }`}>
                {isAI ? 'AI' : (activeUser?.nome?.substring(0, 2).toUpperCase() || 'US')}
              </div>
              <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                isAI 
                  ? 'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none' 
                  : 'bg-indigo-600 text-white rounded-tr-none font-medium'
              } shadow-sm`}>
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs break-words">
                  {message.content.split('\n\n').map((paragraph, pIdx) => {
                    // Primitive bold parse mapping to maintain React-safety inside applets
                    const renderInline = (txt: string) => {
                      const pieces = txt.split('**');
                      return pieces.map((piece, pieceIdx) => 
                        pieceIdx % 2 === 1 ? <strong key={pieceIdx} className="font-semibold text-indigo-600 dark:text-indigo-400">{piece}</strong> : piece
                      );
                    };

                    if (paragraph.startsWith('-') || paragraph.startsWith('*')) {
                      return (
                        <ul key={pIdx} className="list-disc pl-4 space-y-1 my-1">
                          {paragraph.split('\n').map((li, lIdx) => (
                            <li key={lIdx}>{renderInline(li.replace(/^[\s-*]+/, ''))}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={pIdx} className="my-1.5">{renderInline(paragraph)}</p>;
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="p-2 bg-indigo-50 dark:bg-zinc-900 rounded-xl text-indigo-600 dark:text-indigo-400 animate-spin">
              <Loader2 size={16} />
            </div>
            <span className="text-[11px] text-zinc-500 font-medium">SGO AI está analisando os dados...</span>
          </div>
        )}

        {errorStatus && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/40 rounded-xl text-[11px] text-red-800 dark:text-red-300">
            <strong>Detalhes do erro:</strong> {errorStatus}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Prompts catalog card */}
      <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 select-none">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Sparkles size={13} className="text-indigo-500" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ações e Perguntas Rápidas</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
          {METADATA_HOT_PROMPTS.map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSendMessage(prompt.text)}
              disabled={isLoading}
              className="text-[11px] bg-zinc-50 dark:bg-zinc-900 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-zinc-800/80 transition-all border border-zinc-200/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-full flex items-center gap-1 text-left disabled:opacity-55"
            >
              <span>{prompt.icon}</span>
              <span>{prompt.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input container */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Perguntar sobre atividades, férias, metas..."
            className="w-full pr-12 pl-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white dark:placeholder-zinc-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 px-2 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-40 disabled:hover:bg-indigo-600"
          >
            <Send size={14} />
          </button>
        </form>
        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-2 text-center select-none">
          Processado de forma segura na nuvem usando Inteligência Artificial de ponta.
        </p>
      </div>
    </div>
  );
}
