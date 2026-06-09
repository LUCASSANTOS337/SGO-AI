import React, { useState } from 'react';
import { Bot, Key, ShieldCheck, ShieldAlert, Eye, EyeOff, Sparkles, LogOut, ArrowRight } from 'lucide-react';
import { User as UserType } from '../types';

interface ChangePasswordScreenProps {
  activeUser: UserType;
  onChangePassword: (newPw: string) => void;
  onLogout: () => void;
  themeMode: 'claro' | 'escuro';
}

export function ChangePasswordScreen({ activeUser, onChangePassword, onLogout, themeMode }: ChangePasswordScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedPw = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPw || !trimmedConfirm) {
      setErrorMsg('Por favor, preencha todos os campos de senha.');
      return;
    }

    if (trimmedPw === '123') {
      setErrorMsg('A nova senha não pode ser a senha temporária "123". Crie uma senha personalizada mais forte.');
      return;
    }

    if (trimmedPw.length < 4) {
      setErrorMsg('Por favor, crie uma senha com pelo menos 4 caracteres para garantir requisitos mínimos de segurança.');
      return;
    }

    if (trimmedPw !== trimmedConfirm) {
      setErrorMsg('As senhas não coincidem. Certifique-se de digitar exatamente a mesma senha nos dois campos.');
      return;
    }

    // Success! Change user password
    onChangePassword(trimmedPw);
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
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-850 text-xs text-zinc-500 font-bold transition cursor-pointer"
        >
          <LogOut size={13} /> Sair
        </button>
      </header>

      {/* Main Centered Box card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-3xl p-8 shadow-xl space-y-6 animate-fade-in">
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-605 dark:text-amber-400 rounded-2xl flex items-center justify-center shadow-inner">
              <Key size={24} className="animate-pulse" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">🔑 Troca de Senha Obrigatória</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Olá, <strong>{activeUser.nome}</strong>! Este é seu primeiro acesso ao sistema ou sua senha foi resetada. Por favor, cadastre uma nova senha pessoal de segurança.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* User display */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border dark:border-zinc-850 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-full font-bold text-xs flex items-center justify-center">
                {activeUser.nome.substring(0,2).toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wide">Colaborador</span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{activeUser.nome} ({activeUser.email})</span>
              </div>
            </div>

            {/* New Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Nova Senha Secundária</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-zinc-400">
                  <Key size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Cadastre uma senha forte"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            {/* Confirm New Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Confirme a Nova Senha</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-zinc-400">
                  <ShieldCheck size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirme exatamente a mesma senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  required
                />
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
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 hover:scale-[1.01] active:scale-[0.99] transition font-bold text-white text-xs rounded-xl shadow-lg shadow-green-100 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
            >
              Definir Senha e Acessar SGO <ArrowRight size={14} />
            </button>
          </form>

        </div>
      </main>

      {/* Modern footer details */}
      <footer className="py-4 text-center text-[10px] text-zinc-400 font-mono">
        SGO AI © 2026 – Sistema de Segurança Operacional
      </footer>

    </div>
  );
}
