import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, KeyRound, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { UsuarioLogado, PerfilUsuario } from '../types';

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose, token }) => {
  const [users, setUsers] = useState<UsuarioLogado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formulário de Novo Usuário
  const [isAdding, setIsAdding] = useState(false);
  const [username, setUsername] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<PerfilUsuario>('ADM');

  // Redefinir Senha
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Erro ao carregar usuários');
      }
    } catch {
      setError('Falha de comunicação com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setIsAdding(false);
      setResetUserId(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !nome.trim() || !senha) {
      setError('Preencha todos os campos para cadastrar o usuário');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: username.trim(),
          nome: nome.trim(),
          senha,
          perfil
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Usuário ${username} cadastrado com sucesso!`);
        setUsername('');
        setNome('');
        setSenha('');
        setIsAdding(false);
        fetchUsers();
      } else {
        setError(data.error || 'Erro ao cadastrar usuário');
      }
    } catch {
      setError('Falha de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!novaSenha || novaSenha.length < 4) {
      setError('A nova senha deve ter no mínimo 4 caracteres');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuarioId: userId,
          novaSenha
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Senha redefinida com sucesso!');
        setResetUserId(null);
        setNovaSenha('');
      } else {
        setError(data.error || 'Erro ao redefinir senha');
      }
    } catch {
      setError('Falha ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-zinc-900 border border-white/[0.1] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4">
        
        {/* Header do Modal */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Gestão de Usuários & Perfis
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  EXCLUSIVO T.I
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Controle de acessos e concessão de credenciais para a Torre de Controle
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagens de Feedback */}
        <div className="px-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="p-5 pt-0 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Botão de Adicionar / Toggle Form */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-300">
              Usuários Cadastrados ({users.length})
            </span>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancelar Cadastro' : 'Novo Usuário'}</span>
            </button>
          </div>

          {/* Formulário Novo Usuário */}
          {isAdding && (
            <form onSubmit={handleCreateUser} className="p-4 rounded-xl bg-zinc-950/70 border border-purple-500/30 space-y-3 animate-fade-in">
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                Cadastrar Novo Usuário
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-zinc-900 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Nome de Usuário (Login)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="Ex: carlos.operacao"
                    className="w-full bg-zinc-900 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Senha Inicial</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Perfil de Acesso</label>
                  <select
                    value={perfil}
                    onChange={(e) => setPerfil(e.target.value as PerfilUsuario)}
                    className="w-full bg-zinc-900 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-100"
                  >
                    <option value="ADM">ADM (Operações Completo)</option>
                    <option value="TI">T.I (Acesso Full & Infra)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          )}

          {/* Tabela de Usuários */}
          <div className="rounded-xl border border-white/[0.08] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-950/60 text-zinc-400 border-b border-white/[0.08] font-semibold text-[10px] uppercase">
                  <th className="py-2.5 px-3">Usuário</th>
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3 text-center">Perfil</th>
                  <th className="py-2.5 px-3 text-center">Último Login</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-zinc-200">
                {users.map((u) => (
                  <React.Fragment key={u.id}>
                    <tr className="hover:bg-zinc-800/30 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-100">
                        {u.username}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300">
                        {u.nome}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          u.perfil === 'TI'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {u.perfil === 'TI' ? 'T.I (FULL)' : 'ADM (OPERAÇÃO)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-zinc-400 font-mono text-[10px]">
                        {u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('pt-BR') : 'Nunca acessou'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setResetUserId(resetUserId === u.id ? null : u.id);
                            setNovaSenha('');
                          }}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition text-[10px] font-medium inline-flex items-center gap-1"
                          title="Redefinir senha"
                        >
                          <KeyRound className="w-3 h-3 text-amber-400" />
                          <span>Senha</span>
                        </button>
                      </td>
                    </tr>

                    {/* Linha inline para redefinição de senha */}
                    {resetUserId === u.id && (
                      <tr className="bg-zinc-950/80">
                        <td colSpan={5} className="py-2.5 px-4">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[11px] text-amber-300 font-medium">Nova Senha para {u.username}:</span>
                            <input
                              type="password"
                              value={novaSenha}
                              onChange={(e) => setNovaSenha(e.target.value)}
                              placeholder="Digite a nova senha"
                              className="bg-zinc-900 border border-white/[0.1] rounded px-2.5 py-1 text-xs text-zinc-100 font-mono w-48"
                            />
                            <button
                              onClick={() => handleResetPassword(u.id)}
                              className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setResetUserId(null)}
                              className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
