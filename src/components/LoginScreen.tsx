import React, { useState } from 'react';
import { Bot, Key, Mail, ShieldAlert, Eye, EyeOff, Sparkles, Sun, Moon } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginScreenProps {
  users: UserType[];
  onLogin: (user: UserType) => void;
  themeMode: 'claro' | 'escuro';
  toggleTheme: () => void;
}

export function LoginScreen({ users, onLogin, themeMode, toggleTheme }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    const foundUser = users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
    
    if (!foundUser) {
      setErrorMsg('Usuário não encontrado com este e-mail.');
      return;
    }

    // Default password to '123' if not explicitly defined
    const correctPassword = foundUser.senha || '123';

    if (password === correctPassword) {
      onLogin(foundUser);
    } else {
      setErrorMsg('Senha incorreta. Se for seu primeiro acesso, tente a senha temporária "123".');
    }
  };

  const handleQuickLogin = (user: UserType) => {
    setEmail(user.email);
    setPassword(user.senha || '123');
    setErrorMsg(null);
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-all duration-300 font-sans ${themeMode === 'escuro' ? 'bg-zinc-950 text-zinc-100 dark' : 'bg-zinc-50 text-zinc-900'}`}>
      
      {/* Top Header Row for decoration */}
      <header className="max-w-7xl w-full mx-auto px-4 py-4 flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg">
            <Bot size={20} />
          </div>
          <span className="font-black text-sm tracking-tight">
            SGO <span className="text-indigo-600 dark:text-indigo-400">AI</span>
          </span>
        </div>
        
        <button
          onClick={toggleTheme}
          className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 transition cursor-pointer"
        >
          {themeMode === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </header>

      {/* Main Centered Box card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-3xl p-8 shadow-xl space-y-6 animate-fade-in">
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
              <Key size={24} />
            </div>
            <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">Acesse o SGO AI</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Digite suas credenciais corporativas ou utilize o menu de simulação rápida abaixo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">ID ou E-mail Corporativo</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-zinc-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  placeholder="nome.sobrenome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Senha de Acesso</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-zinc-400">
                  <Key size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-zinc-450 hover:text-zinc-650 dark:hover:text-zinc-250 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>



            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl border border-rose-250 dark:border-rose-900/40 animate-shake flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] transition font-bold text-white text-xs rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
            >
              Entrar no Sistema
            </button>
          </form>



        </div>
      </main>

      {/* Modern footer details */}
      <footer className="py-4 text-center text-[10px] text-zinc-400 font-mono">
        SGO AI © 2026 – Sistema de Gestão Operacional Inteligente
      </footer>

    </div>
  );
}
