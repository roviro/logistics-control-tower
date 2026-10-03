import React from 'react';
import { 
  Radio, 
  Calendar, 
  Upload, 
  FileSpreadsheet, 
  MessageSquare, 
  Printer, 
  Users, 
  Clock, 
  AlertTriangle, 
  Truck, 
  RefreshCw, 
  Activity, 
  ArrowUpRight, 
  ClipboardList, 
  ThermometerSnowflake, 
  BarChart3, 
  UserCheck,
  CalendarRange,
  Database,
  LogOut
} from 'lucide-react';
import { EscalaCompleta, UsuarioLogado } from '../types';
import { UsersModal } from './UsersModal';

interface HeaderProps {
  dataOperacao: string;
  setDataOperacao: (date: string) => void;
  dateMode?: 'single' | 'range';
  setDateMode?: (mode: 'single' | 'range') => void;
  dataInicio?: string;
  setDataInicio?: (date: string) => void;
  dataFim?: string;
  setDataFim?: (date: string) => void;
  onApplyPeriodo?: () => void;
  escalaCompleta: EscalaCompleta | null;
  wsConnected: boolean;
  clientsCount: number;
  onOpenImport: () => void;
  onOpenWhatsApp: () => void;
  onExportExcel: () => void;
  onDownloadBackup?: () => void;
  onPrintPatio: () => void;
  onRefresh: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: UsuarioLogado | null;
  onLogout?: () => void;
  token?: string;
}

export const Header: React.FC<HeaderProps> = ({
  dataOperacao,
  setDataOperacao,
  dateMode = 'single',
  setDateMode,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  onApplyPeriodo,
  escalaCompleta,
  wsConnected,
  clientsCount,
  currentUser,
  onLogout,
  token,
  onOpenImport,
  onOpenWhatsApp,
  onExportExcel,
  onDownloadBackup,
  onPrintPatio,
  onRefresh,
  activeTab,
  setActiveTab
}) => {
  const totalTransf = escalaCompleta?.transferencias.length || 0;
  const totalDist = escalaCompleta?.distribuicoes.length || 0;
  const totalPlantoes = escalaCompleta?.plantoes.length || 0;
  const totalPassagens = escalaCompleta?.passagens?.length || 0;
  const pendentesPassagem = escalaCompleta?.passagens?.filter(p => p.status === 'NÃO REALIZADO').length || 0;
  const totalTemperaturas = escalaCompleta?.temperaturas?.length || 0;
  const foraTempCount = escalaCompleta?.temperaturas?.filter(t => t.fora_da_faixa).length || 0;
  const totalAjudantes = escalaCompleta?.ajudantes?.length || 0;

  const estourados = escalaCompleta?.transferencias.filter(t => t.status_jornada === 'ESTOURADO').length || 0;
  const alertas = escalaCompleta?.transferencias.filter(t => t.status_jornada === 'ALERTA 1H').length || 0;
  const atrasosDist = escalaCompleta?.distribuicoes?.filter(d => d.status_primeira_loja === 'ATRASO').length || 0;

  const [isUsersModalOpen, setIsUsersModalOpen] = React.useState(false);

  return (
    <header className="bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-40 shadow-subtle print:hidden transition-all">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 py-3.5 space-y-3.5">
        
        {/* Linha 1: Brand, Date & Ações */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Logo & Título estilo Linear */}
          <div className="flex items-center space-x-3.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-950 shadow-glow-emerald">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-base font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                  Control Tower
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wide">
                  CDFT
                </span>
                {wsConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-900 border border-white/[0.08] text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{clientsCount} online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    reconectando...
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-normal">
                Torre de Controle Operacional, Escalas de Motoristas & Pátio
              </p>
            </div>
          </div>

          {/* Barra de Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Data / Período */}
            <div className="flex items-center gap-1.5">
              <div className="flex bg-zinc-900 border border-white/[0.08] p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setDateMode && setDateMode('single')}
                  className={`px-2 py-1 rounded transition ${dateMode !== 'range' ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-400'}`}
                >
                  Dia Único
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode && setDateMode('range')}
                  className={`px-2 py-1 rounded transition ${dateMode === 'range' ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-400'}`}
                >
                  Período
                </button>
              </div>

              {dateMode === 'range' ? (
                <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-white/[0.08] rounded-lg px-2 py-1 shadow-sm">
                  <CalendarRange className="w-3.5 h-3.5 text-emerald-400" />
                  <input
                    type="date"
                    value={dataInicio || dataOperacao}
                    onChange={(e) => setDataInicio && setDataInicio(e.target.value)}
                    className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer font-mono"
                    title="Data Início"
                  />
                  <span className="text-zinc-500 text-xs">até</span>
                  <input
                    type="date"
                    value={dataFim || dataOperacao}
                    onChange={(e) => setDataFim && setDataFim(e.target.value)}
                    className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer font-mono"
                    title="Data Fim"
                  />
                  {onApplyPeriodo && (
                    <button
                      onClick={onApplyPeriodo}
                      className="px-2 py-0.5 rounded text-[11px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
                    >
                      Filtrar
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center bg-zinc-900/90 border border-white/[0.08] rounded-lg px-2.5 py-1.5 shadow-sm hover:border-white/20 transition">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 mr-2" />
                  <input
                    type="date"
                    value={dataOperacao}
                    onChange={(e) => setDataOperacao(e.target.value)}
                    className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer font-mono"
                  />
                </div>
              )}
            </div>

            <button
              onClick={onRefresh}
              title="Recarregar Dados"
              className="p-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition border border-white/[0.08]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-white/[0.1] hidden sm:block mx-1" />

            {/* Ação Primária */}
            <button
              onClick={onOpenImport}
              title="Importar Romaneio (Atalho: Ctrl+I)"
              aria-label="Importar Romaneio Preliminar ou PDF"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-glow-emerald active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Importar</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[9px] bg-emerald-600/50 text-zinc-950 font-mono rounded">^I</kbd>
            </button>

            {/* Ações Secundárias */}
            <button
              onClick={onOpenWhatsApp}
              title="Disparos e Resumos para WhatsApp"
              aria-label="Abrir central de disparo WhatsApp"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800/80 text-zinc-200 transition border border-white/[0.08] active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={onExportExcel}
              title="Exportar planilha consolidada XLSX"
              aria-label="Exportar para Excel XLSX"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800/80 text-zinc-200 transition border border-white/[0.08] active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>Exportar</span>
            </button>

            {/* Exclusivo T.I: Backup DB */}
            {onDownloadBackup && currentUser?.perfil === 'TI' && (
              <button
                onClick={onDownloadBackup}
                title="Download de snapshot SQLite (logistics.db) - Exclusivo T.I"
                aria-label="Baixar backup do banco de dados SQLite"
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 transition border border-purple-500/30 active:scale-95"
              >
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>Backup DB</span>
              </button>
            )}

            {/* Exclusivo T.I: Gestão de Usuários */}
            {currentUser?.perfil === 'TI' && (
              <button
                onClick={() => setIsUsersModalOpen(true)}
                title="Gestão de Usuários e Senhas (Exclusivo T.I)"
                aria-label="Abrir gestão de usuários"
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 transition border border-purple-500/30 active:scale-95"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Usuários</span>
              </button>
            )}

            <button
              onClick={onPrintPatio}
              title="Visualização e Impressão do Pátio A4 (Atalho: Ctrl+P)"
              aria-label="Imprimir grade do pátio em formato A4"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800/80 text-zinc-200 transition border border-white/[0.08] active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-purple-400" />
              <span>Imprimir</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[9px] bg-zinc-800 text-zinc-400 font-mono rounded">^P</kbd>
            </button>

            {/* Usuário Logado & Logout */}
            {currentUser && (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-white/[0.08]">
                <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-white/[0.08] rounded-lg px-2.5 py-1">
                  <div className={`w-2 h-2 rounded-full ${currentUser.perfil === 'TI' ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span className="text-xs font-semibold text-zinc-200 uppercase tracking-tight">
                    {currentUser.username}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider ${
                    currentUser.perfil === 'TI'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {currentUser.perfil === 'TI' ? 'T.I' : 'ADM'}
                  </span>
                </div>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Encerrar Sessão (Sair)"
                    aria-label="Sair do sistema"
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 transition active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Linha 2: Bento Grid Unificado de Navegação & Métricas em Tempo Real (8 Áreas em 1 Visão) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          
          {/* 1. Dashboard Executivo */}
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group select-none ${
              activeTab === 'dashboard'
                ? 'bg-zinc-900 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold flex items-center gap-1.5 truncate text-[11px] ${
                activeTab === 'dashboard' ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                <BarChart3 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                Dashboard
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-zinc-100 tabular-nums">
                KPIs
              </span>
              <span className="text-[10px] text-emerald-400/80 font-medium">visão 360°</span>
            </div>
            {activeTab === 'dashboard' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400"></div>
            )}
          </button>

          {/* 2. Transferências */}
          <button 
            type="button"
            onClick={() => setActiveTab('transferencias')}
            className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group select-none ${
              estourados > 0
                ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30'
                : activeTab === 'transferencias'
                  ? 'bg-zinc-900 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold flex items-center gap-1.5 truncate text-[11px] ${
                estourados > 0 ? 'text-rose-400' : activeTab === 'transferencias' ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                <Radio className={`w-3.5 h-3.5 shrink-0 ${estourados > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
                Transf.
              </span>
              {estourados > 0 ? (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              ) : alertas > 0 ? (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              ) : null}
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-lg font-bold font-mono tabular-nums ${estourados > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                {totalTransf}
              </span>
              <span className={`text-[10px] font-medium ${
                estourados > 0 ? 'text-rose-400 font-bold' : alertas > 0 ? 'text-amber-400' : 'text-emerald-400/80'
              }`}>
                {estourados > 0 ? `${estourados} estour.` : alertas > 0 ? `${alertas} alerta` : 'ao vivo'}
              </span>
            </div>
            {activeTab === 'transferencias' && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${estourados > 0 ? 'bg-rose-400' : 'bg-emerald-400'}`}></div>
            )}
          </button>

          {/* 3. Distribuição */}
          <button 
            type="button"
            onClick={() => setActiveTab('distribuicao')}
            className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group select-none ${
              activeTab === 'distribuicao'
                ? atrasosDist > 0 ? 'bg-zinc-900 border-rose-500/50 shadow-md ring-1 ring-rose-500/30' : 'bg-zinc-900 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
                : atrasosDist > 0 ? 'bg-rose-950/20 hover:bg-zinc-900/80 border-rose-500/30 hover:border-rose-500/50' : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold flex items-center gap-1.5 truncate text-[11px] ${
                activeTab === 'distribuicao' ? (atrasosDist > 0 ? 'text-rose-400' : 'text-sky-400') : (atrasosDist > 0 ? 'text-rose-300' : 'text-zinc-400 group-hover:text-zinc-200')
              }`}>
                <Truck className={`w-3.5 h-3.5 shrink-0 ${atrasosDist > 0 ? 'text-rose-400' : 'text-sky-400'}`} />
                Distribuição
              </span>
              {atrasosDist > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-lg font-bold font-mono tabular-nums ${atrasosDist > 0 ? 'text-rose-300' : 'text-zinc-100'}`}>
                {totalDist}
              </span>
              <span className={`text-[10px] font-medium ${
                atrasosDist > 0 ? 'text-rose-400 font-bold' : 'text-zinc-400'
              }`}>
                {atrasosDist > 0 ? `${atrasosDist} atraso${atrasosDist > 1 ? 's' : ''}` : 'rotas ativas'}
              </span>
            </div>
            {activeTab === 'distribuicao' && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${atrasosDist > 0 ? 'bg-rose-500' : 'bg-sky-400'}`}></div>
            )}
          </button>

          {/* 4. Visão & Impressão Pátio */}
          <button 
            type="button"
            onClick={() => setActiveTab('patio')}
            className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group select-none ${
              activeTab === 'patio'
                ? 'bg-zinc-900 border-purple-500/50 shadow-md ring-1 ring-purple-500/30'
                : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold flex items-center gap-1.5 truncate text-[11px] ${
                activeTab === 'patio' ? 'text-purple-400' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                <Printer className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                Visão Pátio
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-zinc-100 tabular-nums">
                A4
              </span>
              <span className="text-[10px] text-purple-400/90 font-medium">impressão</span>
            </div>
            {activeTab === 'patio' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            )}
          </button>

          {/* 5. Ajudantes */}
          <button 
            type="button"
            onClick={() => setActiveTab('ajudantes')}
            className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group select-none ${
              activeTab === 'ajudantes'
                ? 'bg-zinc-900 border-teal-500/50 shadow-md ring-1 ring-teal-500/30'
                : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold flex items-center gap-1.5 truncate text-[11px] ${
                activeTab === 'ajudantes' ? 'text-teal-400' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                <UserCheck className="w-3.5 h-3.5 shrink-0 text-teal-400" />
                Ajudantes
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-zinc-100 tabular-nums">
                {totalAjudantes}
              </span>
              <span className="text-[10px] text-teal-400/80 font-medium">alocados</span>
            </div>
            {activeTab === 'ajudantes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400"></div>
            )}
          </button>

          {/* 6. Passagem de Turno */}
          <button 
            type="button"
            onClick={() => setActiveTab('passagem')}
            className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group select-none ${
              pendentesPassagem > 0
                ? 'bg-rose-950/20 border-rose-500/40 ring-1 ring-rose-500/20'
                : activeTab === 'passagem'
                  ? 'bg-zinc-900 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold flex items-center gap-1.5 truncate text-[11px] ${
                activeTab === 'passagem' ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                <ClipboardList className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                Passagem
              </span>
              {pendentesPassagem > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
              )}
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-zinc-100 tabular-nums">
                {totalPassagens}
              </span>
              <span className={`text-[10px] font-medium ${pendentesPassagem > 0 ? 'text-rose-400 font-semibold' : 'text-zinc-400'}`}>
                {pendentesPassagem > 0 ? `${pendentesPassagem} pendentes` : 'em dia'}
              </span>
            </div>
            {activeTab === 'passagem' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400"></div>
            )}
          </button>

          {/* 7. Temperatura Cross */}
          <button 
            type="button"
            onClick={() => setActiveTab('temperatura')}
            className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group select-none ${
              foraTempCount > 0 
                ? 'bg-rose-950/30 border-rose-500/60 ring-1 ring-rose-500/40' 
                : activeTab === 'temperatura'
                  ? 'bg-zinc-900 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
                  : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold flex items-center gap-1.5 truncate text-[11px] ${
                foraTempCount > 0 ? 'text-rose-400' : activeTab === 'temperatura' ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                <ThermometerSnowflake className={`w-3.5 h-3.5 shrink-0 ${foraTempCount > 0 ? 'text-rose-400 animate-bounce' : 'text-sky-400'}`} />
                Temp. Cross
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-lg font-bold font-mono tabular-nums ${foraTempCount > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                {foraTempCount > 0 ? `${foraTempCount} ALERTA` : totalTemperaturas}
              </span>
              <span className={`text-[10px] font-semibold ${foraTempCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                {foraTempCount > 0 ? 'Chamar Técnico' : 'conforme'}
              </span>
            </div>
            {activeTab === 'temperatura' && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${foraTempCount > 0 ? 'bg-rose-400' : 'bg-sky-400'}`}></div>
            )}
          </button>

          {/* 8. Plantão & Reservas */}
          <button 
            type="button"
            onClick={() => setActiveTab('plantoes')}
            className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group select-none ${
              activeTab === 'plantoes'
                ? 'bg-zinc-900 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold flex items-center gap-1.5 truncate text-[11px] ${
                activeTab === 'plantoes' ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                <Users className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                Plantão
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-zinc-100 tabular-nums">
                {totalPlantoes}
              </span>
              <span className="text-[10px] text-amber-400/80 font-medium">prontidão</span>
            </div>
            {activeTab === 'plantoes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"></div>
            )}
          </button>

        </div>

      </div>

      {currentUser?.perfil === 'TI' && (
        <UsersModal
          isOpen={isUsersModalOpen}
          onClose={() => setIsUsersModalOpen(false)}
          token={token || ''}
        />
      )}
    </header>
  );
};

