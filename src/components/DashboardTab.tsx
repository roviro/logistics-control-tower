import React from 'react';
import { 
  BarChart3, 
  Truck, 
  Radio, 
  AlertTriangle, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  ShieldAlert,
  Layers,
  ArrowUpRight,
  FileSpreadsheet
} from 'lucide-react';
import { EscalaCompleta } from '../types';
import { timeToMinutes, avaliarConformidadePrimeiraLoja } from '../utils/jornada';

interface DashboardTabProps {
  escalaCompleta: EscalaCompleta | null;
  dataOperacao: string;
  onNavigateTab: (tab: string, filter?: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  escalaCompleta,
  dataOperacao,
  onNavigateTab
}) => {
  const dist = escalaCompleta?.distribuicoes || [];
  const transf = escalaCompleta?.transferencias || [];
  const plantoes = escalaCompleta?.plantoes || [];
  const passagens = escalaCompleta?.passagens || [];
  const temperaturas = escalaCompleta?.temperaturas || [];
  const ajudantes = escalaCompleta?.ajudantes || [];

  // Totais Básicos
  const totalRotas = dist.length;
  const totalTransf = transf.length;
  const totalPlantoes = plantoes.length;
  const totalAjudantes = ajudantes.length;

  // Rotas sem embarque RCS (Demanda crítica de Angela)
  const rotasSemEmbarque = dist.filter(d => !d.embarque_cod || d.embarque_cod.trim() === '' || d.embarque_cod.toUpperCase() === 'SEM EMBARQUE');
  const totalSemEmbarque = rotasSemEmbarque.length;

  // Atrasos de Saída (saída real ou declarada > previsto)
  const rotasComAtrasoSaida = dist.filter(d => {
    const saida = d.horario_saida_real || d.hora_saida_motorista;
    if (!saida || !d.hora_encoste_previsto) return false;
    return timeToMinutes(saida) > timeToMinutes(d.hora_encoste_previsto);
  });

  // Atrasos na 1ª Loja (JC)
  const rotasAtraso1Loja = dist.filter(d => d.status_primeira_loja === 'ATRASO');
  const rotasOk1Loja = dist.filter(d => d.status_primeira_loja === 'OK');
  const percConformidade1Loja = (rotasOk1Loja.length + rotasAtraso1Loja.length) > 0
    ? Math.round((rotasOk1Loja.length / (rotasOk1Loja.length + rotasAtraso1Loja.length)) * 100)
    : 100;

  // Todas as rotas com algum tipo de atraso para o monitor em tempo real
  const todasRotasComAtraso = dist.filter(d => {
    const isAtraso1Loja = d.status_primeira_loja === 'ATRASO';
    const saida = d.horario_saida_real || d.hora_saida_motorista;
    const isAtrasoSaida = Boolean(saida && d.hora_encoste_previsto && timeToMinutes(saida) > timeToMinutes(d.hora_encoste_previsto));
    return isAtraso1Loja || isAtrasoSaida;
  });

  // Alertas de Jornada Transferência
  const estouradosJornada = transf.filter(t => t.status_jornada === 'ESTOURADO').length;
  const alerta1hJornada = transf.filter(t => t.status_jornada === 'ALERTA 1H').length;

  // Alerta Temperatura Cross
  const carretasForaTemp = temperaturas.filter(t => t.fora_da_faixa).length;

  // Matriz de Tipos de Veículos (Quantidade Necessária)
  const veiculosMap: Record<string, { count: number; volumeTotal: number }> = {};
  dist.forEach(d => {
    const tipo = (d.tipo_veiculo || 'OUTROS').toUpperCase().trim();
    if (!veiculosMap[tipo]) {
      veiculosMap[tipo] = { count: 0, volumeTotal: 0 };
    }
    veiculosMap[tipo].count += 1;
    veiculosMap[tipo].volumeTotal += (d.volume_m3 || 0);
  });

  const tiposVeiculo = Object.entries(veiculosMap).sort((a, b) => b[1].count - a[1].count);
  const totalVolumeM3 = dist.reduce((acc, curr) => acc + (curr.volume_m3 || 0), 0);
  const totalCaixas = dist.reduce((acc, curr) => acc + (curr.qtd_caixas || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner do Dashboard Executivo */}
      <div className="bg-zinc-900/60 backdrop-blur-md p-5 rounded-2xl border border-white/[0.08] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-zinc-950 shadow-glow-emerald">
            <BarChart3 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-100">
                Dashboard Executivo da Torre de Controle
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                TEMPO REAL
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Visão macro consolidada de frotas, pontualidade, embarques RCS e alocação de recursos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-zinc-400 font-mono">Data da Operação</span>
            <div className="text-sm font-bold font-mono text-zinc-200">
              {dataOperacao.split('-').reverse().join('/')}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Críticos da Operação */}
      {(rotasAtraso1Loja.length > 0 || rotasComAtrasoSaida.length > 0 || totalSemEmbarque > 0 || estouradosJornada > 0 || carretasForaTemp > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {rotasAtraso1Loja.length > 0 && (
            <div 
              onClick={() => onNavigateTab('distribuicao', 'ATRASO_1LOJA')}
              className="bg-rose-950/30 border border-rose-500/50 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-rose-950/50 transition group animate-pulse"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    {rotasAtraso1Loja.length} Rota(s) Atraso 1ª Loja
                    <span className="px-1.5 py-0.2 rounded text-[8px] bg-rose-500/40 text-rose-200 font-mono">JC</span>
                  </h4>
                  <p className="text-[11px] text-rose-400/80">Janela cliente violada • Clique para auditar</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}

          {rotasComAtrasoSaida.length > 0 && (
            <div 
              onClick={() => onNavigateTab('distribuicao')}
              className="bg-amber-950/25 border border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-amber-950/40 transition group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    {rotasComAtrasoSaida.length} Saída(s) com Atraso CD
                  </h4>
                  <p className="text-[11px] text-amber-400/80">Saída real após encoste previsto</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}

          {totalSemEmbarque > 0 && (
            <div 
              onClick={() => onNavigateTab('distribuicao', 'SEM_EMBARQUE')}
              className="bg-amber-950/25 border border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-amber-950/40 transition group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    {totalSemEmbarque} Sem Embarque RCS
                  </h4>
                  <p className="text-[11px] text-amber-400/80">Necessita emissão do código RCS</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}

          {estouradosJornada > 0 && (
            <div 
              onClick={() => onNavigateTab('transferencias')}
              className="bg-rose-950/25 border border-rose-500/40 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-rose-950/40 transition group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-300">
                    {estouradosJornada} Estouro(s) Jornada CLT
                  </h4>
                  <p className="text-[11px] text-rose-400/80">Ação imediata com condutor</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}

          {carretasForaTemp > 0 && (
            <div 
              onClick={() => onNavigateTab('temperatura')}
              className="bg-rose-950/25 border border-rose-500/40 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-rose-950/40 transition group animate-pulse"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-300">
                    {carretasForaTemp} Fora de Temperatura
                  </h4>
                  <p className="text-[11px] text-rose-400/80">Chamar técnico de plantão</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}
        </div>
      )}

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => onNavigateTab('distribuicao')}
          className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/[0.08] cursor-pointer hover:border-emerald-500/40 transition"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              Rotas Distribuição
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{totalRotas}</div>
          <span className="text-[10px] text-zinc-400 mt-1 block">ativas no dia</span>
        </div>

        <div 
          onClick={() => onNavigateTab('transferencias')}
          className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/[0.08] cursor-pointer hover:border-emerald-500/40 transition"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Transferências
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{totalTransf}</div>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">rotas de linha</span>
        </div>

        <div 
          onClick={() => onNavigateTab('distribuicao')}
          className={`bg-zinc-900/60 p-3.5 rounded-xl border cursor-pointer transition ${
            rotasComAtrasoSaida.length > 0 ? 'border-amber-500/40 hover:border-amber-500/70 bg-amber-950/10' : 'border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Atrasos de Saída
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono ${rotasComAtrasoSaida.length > 0 ? 'text-amber-400' : 'text-zinc-100'}`}>
            {rotasComAtrasoSaida.length}
          </div>
          <span className={`text-[10px] mt-1 block ${rotasComAtrasoSaida.length > 0 ? 'text-amber-300 font-semibold' : 'text-zinc-400'}`}>
            {rotasComAtrasoSaida.length > 0 ? 'veículos com atraso' : 'pontual'}
          </span>
        </div>

        <div 
          onClick={() => onNavigateTab('distribuicao', 'ATRASO_1LOJA')}
          className={`bg-zinc-900/60 p-3.5 rounded-xl border cursor-pointer transition ${
            rotasAtraso1Loja.length > 0 ? 'border-rose-500/50 hover:border-rose-500/80 bg-rose-950/15' : 'border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Pontualidade 1ª Loja
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono ${rotasAtraso1Loja.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {percConformidade1Loja}%
          </div>
          <span className={`text-[10px] mt-1 block ${rotasAtraso1Loja.length > 0 ? 'text-rose-300 font-bold' : 'text-zinc-400'}`}>
            {rotasAtraso1Loja.length > 0 ? `${rotasAtraso1Loja.length} atraso(s) (ver)` : '100% conforme'}
          </span>
        </div>

        <div 
          onClick={() => onNavigateTab('ajudantes')}
          className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/[0.08] cursor-pointer hover:border-emerald-500/40 transition"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Total Ajudantes
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{totalAjudantes}</div>
          <span className="text-[10px] text-zinc-400 mt-1 block">LED & RHELP</span>
        </div>

        <div 
          onClick={() => onNavigateTab('plantoes')}
          className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/[0.08] cursor-pointer hover:border-emerald-500/40 transition"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Plantão / Reserva
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{totalPlantoes}</div>
          <span className="text-[10px] text-zinc-400 mt-1 block">disponíveis</span>
        </div>
      </div>

      {/* Monitor de Conformidade e Atrasos em Tempo Real (Solicitado pelo Operador) */}
      {todasRotasComAtraso.length > 0 ? (
        <div className="bg-zinc-900/60 rounded-xl border border-rose-500/30 overflow-hidden shadow-subtle">
          <div className="p-4 bg-rose-950/20 border-b border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-rose-200">
                    Monitor de Rotas com Atraso em Tempo Real
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {todasRotasComAtraso.length} {todasRotasComAtraso.length === 1 ? 'rota em desvio' : 'rotas em desvio'}
                  </span>
                </div>
                <p className="text-xs text-rose-300/70">
                  Desvios identificados na Janela de Cliente (1ª Loja) ou no Horário de Saída do Pátio
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('distribuicao', 'ATRASO_1LOJA')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 flex items-center gap-1.5 transition self-start sm:self-auto shadow-sm"
            >
              <span>Auditar na Distribuição</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950/80 text-zinc-400 border-b border-white/[0.08] font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Rota</th>
                  <th className="py-2.5 px-2 text-center">Doca</th>
                  <th className="py-2.5 px-3">Motorista & Placas</th>
                  <th className="py-2.5 px-3">Lojas (Sequência)</th>
                  <th className="py-2.5 px-3 text-center">Ocorrência</th>
                  <th className="py-2.5 px-3 text-center">Previsto vs Real</th>
                  <th className="py-2.5 px-3 text-center">Atraso</th>
                  <th className="py-2.5 px-3 text-center">Status Carga</th>
                  <th className="py-2.5 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-zinc-200">
                {todasRotasComAtraso.map((item) => {
                  const isAtraso1Loja = item.status_primeira_loja === 'ATRASO';
                  const saida = item.horario_saida_real || item.hora_saida_motorista;
                  const isAtrasoSaida = Boolean(saida && item.hora_encoste_previsto && timeToMinutes(saida) > timeToMinutes(item.hora_encoste_previsto));
                  const conf1Loja = avaliarConformidadePrimeiraLoja(item.horario_primeira_entrega, item.horario_real_primeira_loja || '');
                  const delaySaidaMin = isAtrasoSaida && saida && item.hora_encoste_previsto
                    ? timeToMinutes(saida) - timeToMinutes(item.hora_encoste_previsto)
                    : 0;

                  return (
                    <tr key={item.id} className="hover:bg-rose-950/15 transition">
                      <td className="py-2 px-3 font-mono font-bold text-zinc-100 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{item.rota}</span>
                        <span className="px-1 py-0.2 rounded text-[8px] bg-zinc-800 text-zinc-300 font-normal">
                          {item.tipo_veiculo}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-zinc-300">
                        {item.doca || '-'}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-zinc-200 uppercase">{item.motorista_nome || 'A DEFINIR'}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {item.placa_cavalo || '-'} {item.placa_carreta ? `+ ${item.placa_carreta}` : ''}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-emerald-400 max-w-[240px] truncate" title={item.lojas}>
                        {item.lojas || '-'}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-center">
                          {isAtraso1Loja && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                              1ª Loja (JC)
                            </span>
                          )}
                          {isAtrasoSaida && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                              Saída CD
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-mono whitespace-nowrap">
                        {isAtraso1Loja ? (
                          <div>
                            <span className="text-zinc-400">{item.horario_primeira_entrega || '--:--'}</span>
                            <span className="text-zinc-600 mx-1">→</span>
                            <span className="text-rose-300 font-bold">{item.horario_real_primeira_loja}</span>
                          </div>
                        ) : isAtrasoSaida ? (
                          <div>
                            <span className="text-zinc-400">{item.hora_encoste_previsto || '--:--'}</span>
                            <span className="text-zinc-600 mx-1">→</span>
                            <span className="text-amber-300 font-bold">{saida}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold whitespace-nowrap">
                        {isAtraso1Loja ? (
                          <span className="text-rose-400">+{conf1Loja.atrasoMin} min</span>
                        ) : isAtrasoSaida ? (
                          <span className="text-amber-400">+{delaySaidaMin} min</span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                          item.status_carregamento === 'Liberado' || item.status_carregamento === 'Em Viagem'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : item.status_carregamento === 'Carregando'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-white/[0.08]'
                        }`}>
                          {item.status_carregamento}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => onNavigateTab('distribuicao', 'ATRASO_1LOJA')}
                          className="px-2.5 py-1 rounded text-[10px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition shadow-sm"
                          title="Ir para detalhes da rota na Distribuição"
                        >
                          Auditar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/40 rounded-xl border border-emerald-500/20 p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-300">
                100% de Pontualidade Operacional
              </h4>
              <p className="text-[11px] text-zinc-400">
                Nenhuma rota com atraso registrada na 1ª Loja ou na saída do CD até o momento.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            OPERAÇÃO EM DIA
          </span>
        </div>
      )}

      {/* Matriz de Demanda por Tipo de Veículo (Solicitado por Angela Sousa) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900/60 rounded-xl border border-white/[0.08] p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Quantidade Necessária de Cada Tipo de Veículo
              </h3>
              <p className="text-xs text-zinc-400">
                Volumetria e dimensionamento de frota para a operação do dia
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase font-mono">Volume Total</span>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {totalVolumeM3.toFixed(1)} m³ | {totalCaixas} cx
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-950/60 text-zinc-400 border-b border-white/[0.08] font-semibold uppercase text-[10px]">
                  <th className="px-4 py-2.5">Tipo de Veículo</th>
                  <th className="px-4 py-2.5 text-center">Quantidade Necessária</th>
                  <th className="px-4 py-2.5 text-center">% da Frota</th>
                  <th className="px-4 py-2.5 text-right">Volume (m³)</th>
                  <th className="px-4 py-2.5">Distribuição Visual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-zinc-200">
                {tiposVeiculo.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-zinc-500">
                      Nenhuma rota carregada na escala.
                    </td>
                  </tr>
                ) : (
                  tiposVeiculo.map(([tipo, dados]) => {
                    const percentual = totalRotas > 0 ? Math.round((dados.count / totalRotas) * 100) : 0;
                    return (
                      <tr key={tipo} className="hover:bg-zinc-800/30 transition">
                        <td className="px-4 py-3 font-semibold text-zinc-100 flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-zinc-400" />
                          {tipo}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-sm text-emerald-400">
                          {dados.count}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-zinc-300">
                          {percentual}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">
                          {dados.volumeTotal.toFixed(1)} m³
                        </td>
                        <td className="px-4 py-3 w-48">
                          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentual}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo da Jornada CLT e Status Geral */}
        <div className="bg-zinc-900/60 rounded-xl border border-white/[0.08] p-5 shadow-subtle space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Auditoria de Jornada CLT (Linha)
            </h3>
            <p className="text-xs text-zinc-400">
              Conformidade limite 11h20 / 08h20
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs text-zinc-300">Conforme CLT (&lt; 10h20)</span>
              </div>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {transf.filter(t => t.status_jornada === 'SEM ESTOURO').length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-xs text-amber-300">Alerta 1 Hora (Atenção)</span>
              </div>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {alerta1hJornada}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-rose-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="text-xs text-rose-300">Estouro Confirmado</span>
              </div>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {estouradosJornada}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.08]">
            <button
              onClick={() => onNavigateTab('transferencias')}
              className="w-full py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition flex items-center justify-center gap-1.5"
            >
              <span>Ver Detalhes das Transferências</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
