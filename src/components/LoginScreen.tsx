import React, { useState } from 'react';
import { Radio, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { UsuarioLogado } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UsuarioLogado, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Informe o usuário e a senha para acessar.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Credenciais inválidas. Verifique seu usuário e senha.');
        setIsLoading(false);
        return;
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      console.error('Erro ao conectar ao servidor:', err);
      setError('Falha de comunicação com o servidor. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-500/10 via-sky-500/10 to-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Card Principal */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Header do Card */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-500 to-indigo-600 flex items-center justify-center text-zinc-950 shadow-glow-emerald">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                  Control Tower
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  CDFT
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Torre de Controle Operacional & Escalas Logísticas
              </p>
            </div>
          </div>

          {/* Alerta de Erro */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-2.5 text-rose-300 text-xs animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulário de Acesso */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Usuário de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: ti ou adm"
                  autoFocus
                  autoCapitalize="none"
                  autoComplete="username"
                  className="w-full bg-zinc-950/80 border border-white/[0.1] focus:border-emerald-500/70 rounded-xl pl-9 pr-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-zinc-950/80 border border-white/[0.1] focus:border-emerald-500/70 rounded-xl pl-9 pr-10 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-glow-emerald active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Perfis de Acesso / Atalhos Rápidos */}
          <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block text-center">
              Selecione o perfil de credenciais
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('ti', 'ti@controltower2026')}
                className="p-2.5 rounded-xl bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/30 text-left transition group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-bold text-purple-300">T.I (Full)</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9px] text-zinc-400">Acesso completo + DB</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('adm', 'adm@controltower2026')}
                className="p-2.5 rounded-xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 text-left transition group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-bold text-emerald-300">ADM (Operação)</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9px] text-zinc-400">Todas funções operacionais</p>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé informativo */}
        <p className="text-center text-[11px] text-zinc-600">
          Control Tower Logística &copy; {new Date().getFullYear()} • Autenticação Segura
        </p>
      </div>
    </div>
  );
};
