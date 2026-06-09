import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { 
  User as UserIcon, UserPlus, Edit2, Trash2, Key, Users, ShieldAlert, Check, X, Mail, Shield, ToggleLeft
} from 'lucide-react';

interface CollaboratorsManagerProps {
  users: User[];
  activeUser: User | null;
  onAddUser: (user: Omit<User, 'id'>) => void;
  onEditUser: (userId: string, updatedFields: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string) => void;
}

export function CollaboratorsManager({
  users,
  activeUser,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onResetPassword
}: CollaboratorsManagerProps) {
  // Check authorization
  const hasAccess = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação';

  // Local Form state
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Fields state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Colaborador');
  const [status, setStatus] = useState<'Ativo' | 'Inativo' | 'Férias' | 'Afastado'>('Ativo');
  const [funcao, setFuncao] = useState<'ANALISTA JUNIOR' | 'ANALISTA PLENO' | 'ANALISTA SENIÔR' | 'COORDENAÇÃO'>('ANALISTA JUNIOR');
  
  // Notice banners
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingUserId(null);
    setNome('');
    setEmail('');
    setRole('Colaborador');
    setStatus('Ativo');
    setFuncao('ANALISTA JUNIOR');
    setShowForm(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setNome(user.nome);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status || 'Ativo');
    setFuncao(user.funcao || 'ANALISTA JUNIOR');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;

    if (editingUserId) {
      onEditUser(editingUserId, { nome, email, role, status, funcao });
      showNotification(`Colaborador "${nome}" editado com sucesso!`);
    } else {
      onAddUser({
        nome,
        email,
        role,
        status,
        funcao,
        metaDiariaPadrao: role === 'Colaborador' ? 12.5 : 0,
        senha: '123' // default initial password
      });
      showNotification(`Colaborador "${nome}" de cadastro efetuado!`);
    }

    setShowForm(false);
  };

  const handleDelete = (user: User) => {
    if (user.id === 'lucas') {
      showNotification('Operação inválida: Lucas Alves é o administrador padrão e não pode ser excluído!');
      return;
    }
    onDeleteUser(user.id);
    showNotification(`Colaborador "${user.nome}" removido do sistema.`);
    setConfirmDeleteId(null);
  };

  const handleResetPwd = (user: User) => {
    onResetPassword(user.id);
    showNotification(`Senha de ${user.nome} resetada com sucesso para "123"!`);
  };

  if (!hasAccess) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500 shadow-sm max-w-lg mx-auto space-y-4">
        <ShieldAlert className="mx-auto text-rose-500 animate-pulse" size={40} />
        <h3 className="text-zinc-900 dark:text-white font-extrabold text-sm uppercase tracking-wide">Acesso Restrito</h3>
        <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed">
          Esta central é restrita a usuários de nível <strong>Administrador</strong> ou <strong>Coordenação</strong>. Seu perfil atual de <strong>{activeUser?.role}</strong> não possui essa atribuição regulamentar.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Upper header action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            👥 Gestão de Colaboradores de Back Office
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Cadastre novos integrantes, ajuste permissões e mude o status operacional instantaneamente.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 transition font-bold text-white text-xs rounded-xl shadow-sm"
          >
            <UserPlus size={14} /> Novo Colaborador
          </button>
        )}
      </div>

      {notification && (
        <div className="p-3 bg-indigo-50 dark:bg-zinc-850 text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-zinc-800 rounded-xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <Check size={14} className="stroke-2 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Editor & Creator Form Panel */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/65 dark:border-zinc-850 rounded-2xl space-y-4 animate-fade-in text-xs">
          <h4 className="font-bold text-zinc-850 dark:text-white flex items-center gap-1">
            {editingUserId ? '✏ Editar Colaborador' : '✨ Cadastrar Novo Colaborador'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome Completo</label>
              <input
                type="text"
                required
                placeholder="Ex: Ila Ramos"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">E-mail Corporativo</label>
              <input
                type="email"
                required
                placeholder="Ex: ila.ramos@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nível de Acesso (Perfil)</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white"
              >
                <option value="Colaborador">Colaborador (Executor de metas)</option>
                <option value="Coordenação">Coordenação (Aprovador)</option>
                <option value="Admin">Administrador (Permissões totais)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status Operacional</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white"
              >
                <option value="Ativo">🟢 Ativo (Sinal de prontidão)</option>
                <option value="Inativo">🔴 Inativo</option>
                <option value="Férias">🏖 Férias (Redistribuição disponível)</option>
                <option value="Afastado">⚠️ Afastado</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Função</label>
              <select
                value={funcao}
                onChange={e => setFuncao(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white font-bold text-indigo-600 dark:text-indigo-400"
              >
                <option value="ANALISTA JUNIOR">ANALISTA JUNIOR</option>
                <option value="ANALISTA PLENO">ANALISTA PLENO</option>
                <option value="ANALISTA SENIÔR">ANALISTA SENIÔR</option>
                <option value="COORDENAÇÃO">COORDENAÇÃO</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-xl hover:text-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      )}

      {/* Grid of registered collaborators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map(user => {
          const userStatus = user.status || 'Ativo';
          
          return (
            <div 
              key={user.id} 
              className="p-4 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-800 rounded-2xl flex flex-col justify-between gap-4 transition hover:border-zinc-250 dark:hover:border-zinc-750"
            >
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <UserIcon size={18} className="text-indigo-650 dark:text-indigo-400" />
                </div>
                
                <div className="space-y-1 text-xs truncate">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-purple-600 dark:text-purple-400 block truncate text-xs">{user.nome}</span>
                    {user.funcao && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-violet-100/80 border border-violet-200 dark:bg-violet-950/30 dark:border-violet-905 text-violet-700 dark:text-violet-405 tracking-wide select-none">
                        💼 {user.funcao}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                    <Mail size={11} /> {user.email}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1 font-bold text-[9px] uppercase tracking-wider select-none">
                    <span className={`px-2 py-0.5 rounded-full border ${
                      user.role === 'Admin' ? 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/20' :
                      user.role === 'Coordenação' ? 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/20' :
                      'bg-zinc-100 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-850'
                    }`}>
                      {user.role}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full border ${
                      userStatus === 'Ativo' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-930' :
                      userStatus === 'Inativo' ? 'bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:border-red-930' :
                      userStatus === 'Férias' ? 'bg-sky-50 border-sky-100 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-930' :
                      'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-930'
                    }`}>
                      {userStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action row bottom */}
              <div className="flex justify-between items-center pt-3 border-t dark:border-zinc-850/80">
                <span className="text-[10px] font-mono text-zinc-400">Meta: {user.metaDiariaPadrao || 0} / u</span>
                
                <div className="flex items-center gap-1.5 text-[10px]">
                  
                  {/* Reset password trigger */}
                  <button
                    onClick={() => handleResetPwd(user)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-805 transition"
                    title="Resetar senha para '123'"
                  >
                    <Key size={12} />
                  </button>

                  {/* Edit profile trigger */}
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-805 transition"
                    title="Editar informações"
                  >
                    <Edit2 size={12} />
                  </button>

                  {/* Delete user */}
                  {confirmDeleteId === user.id ? (
                    <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 p-1 rounded-lg animate-scale-in">
                      <span className="text-[8px] font-bold text-rose-600 px-1 font-sans">Excluir?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-extrabold rounded cursor-pointer animate-fade-in"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[9px] font-bold rounded cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(user.id)}
                      className="p-1.5 rounded-lg text-zinc-550 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                      title="Excluir cadastro"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}

                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
