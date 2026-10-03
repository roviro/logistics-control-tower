import React, { useState } from 'react';
import { Printer, Search, Truck, Radio, Clock, ArrowDownUp, ShieldCheck } from 'lucide-react';
import { ViagemDistribuicao, ViagemTransferencia } from '../types';

interface PatioViewTabProps {
  distribuicoes: ViagemDistribuicao[];
  transferencias: ViagemTransferencia[];
  dataOperacao: string;
  onSaveDistribuicao?: (dist: ViagemDistribuicao) => void;
}

export const PatioViewTab: React.FC<PatioViewTabProps> = ({
  distribuicoes,
  transferencias,
  dataOperacao,
  onSaveDistribuicao
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSection, setShowSection] = useState<'TODOS' | 'DISTRIBUICAO' | 'TRANSFERENCIA'>('TODOS');
  const [sortBy, setSortBy] = useState<'ENCOSTE' | 'DOCA'>('ENCOSTE');

  // Ordenação flexível para o Pátio: por Horário de Encoste (padrão) ou Doca
  const sortedDist = [...distribuicoes].sort((a, b) => {
    if (sortBy === 'ENCOSTE') {
      const encA = a.hora_encoste_previsto || '99:99';
      const encB = b.hora_encoste_previsto || '99:99';
      if (encA !== encB) return encA.localeCompare(encB);
      const docaA = parseInt(a.doca, 10) || 999;
      const docaB = parseInt(b.doca, 10) || 999;
      return docaA - docaB;
    } else {
      const docaA = parseInt(a.doca, 10) || 999;
      const docaB = parseInt(b.doca, 10) || 999;
      if (docaA !== docaB) return docaA - docaB;
      return (a.hora_encoste_previsto || '').localeCompare(b.hora_encoste_previsto || '');
    }
  });

  const filteredDist = sortedDist.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.rota || '').toLowerCase().includes(term) ||
      (item.doca || '').toLowerCase().includes(term) ||
      (item.lojas || '').toLowerCase().includes(term) ||
      (item.primeira_entrega || '').toLowerCase().includes(term) ||
      (item.motorista_nome || '').toLowerCase().includes(term) ||
      (item.placa_cavalo || '').toLowerCase().includes(term) ||
      (item.placa_carreta || '').toLowerCase().includes(term) ||
      (item.tipo_veiculo || '').toLowerCase().includes(term)
    );
  });

  const filteredTransf = transferencias.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.operacao_rota || '').toLowerCase().includes(term) ||
      (item.motorista_nome || '').toLowerCase().includes(term) ||
      (item.placa || '').toLowerCase().includes(term)
    );
  });

  // Métricas de Carga de Distribuição para o Pátio
  const totalM3 = filteredDist.reduce((acc, d) => acc + (Number(d.volume_m3) || 0), 0);
  const totalCx = filteredDist.reduce((acc, d) => acc + (Number(d.qtd_caixas) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Estilos específicos de impressão para Paisagem A4 e aproveitamento 100% */}
      <style>{`
        @media print {
          @page {
            size: landscape !important;
            margin: 5mm 5mm !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: #ffffff !important;
            color: #000000 !important;
          }
          table {
            width: 100% !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      {/* Barra de Ações Operacional (Oculta na Impressão) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 backdrop-blur-md p-3.5 rounded-xl border border-white/[0.08] shadow-subtle">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-400" />
            Controle & Impressão de Pátio (Encoste, Placas e Capacidade)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Folha de referência operacional para encoste de veículos na doca, movimentação de placas e conferência de m³.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Busca Ativa */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar placa, doca, rota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition"
            />
          </div>

          {/* Alternador de Ordenação */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-white/[0.06] text-xs">
            <button
              onClick={() => setSortBy('ENCOSTE')}
              title="Ordenar por Horário de Encoste"
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition ${
                sortBy === 'ENCOSTE' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Por Encoste</span>
            </button>
            <button
              onClick={() => setSortBy('DOCA')}
              title="Ordenar por Doca"
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition ${
                sortBy === 'DOCA' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowDownUp className="w-3 h-3" />
              <span>Por Doca</span>
            </button>
          </div>

          {/* Filtro de Abas */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-white/[0.06] text-xs">
            <button
              onClick={() => setShowSection('TODOS')}
              className={`px-2.5 py-1 rounded font-medium transition ${showSection === 'TODOS' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Tudo ({distribuicoes.length + transferencias.length})
            </button>
            <button
              onClick={() => setShowSection('DISTRIBUICAO')}
              className={`px-2.5 py-1 rounded font-medium transition ${showSection === 'DISTRIBUICAO' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Distribuição ({distribuicoes.length})
            </button>
            <button
              onClick={() => setShowSection('TRANSFERENCIA')}
              className={`px-2.5 py-1 rounded font-medium transition ${showSection === 'TRANSFERENCIA' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Transferência ({transferencias.length})
            </button>
          </div>

          {/* Botão de Impressão */}
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Folha Pátio (A4)</span>
          </button>
        </div>
      </div>

      {/* Cabeçalho Oficial visível na IMPRESSÃO A4 */}
      <div className="hidden print:block mb-3 border-b-2 border-black pb-2 text-black">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">
              Controle Operacional de Pátio, Encoste & Movimentação de Placas
            </h1>
            <p className="text-xs font-bold text-gray-800">
              CDFT • Torre de Controle Logístico • Programação de Carregamento e Saída de Veículos
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-black text-sm">DATA OPERAÇÃO: {dataOperacao.split('-').reverse().join('/')}</p>
            <p className="text-gray-600 text-[10px]">Emissão: {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] font-bold border-t border-gray-400 pt-1.5">
          <div className="flex gap-6">
            <span>ROTAS PROGRAMADAS: <strong>{filteredDist.length}</strong></span>
            <span>VOLUME TOTAL M³: <strong>{totalM3.toFixed(1)} m³</strong></span>
            <span>TOTAL DE CAIXAS: <strong>{totalCx.toLocaleString('pt-BR')} cx</strong></span>
            <span>ORDENAÇÃO: <strong>{sortBy === 'ENCOSTE' ? 'HORÁRIO DE ENCOSTE' : 'NÚMERO DE DOCA'}</strong></span>
          </div>
          <div className="text-gray-600 text-[9px] uppercase tracking-wider font-semibold">
            Referência para Encoste no Horário Correto e Movimentações de Placa
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: DISTRIBUIÇÃO (FOCO EM ENCOSTE, PLACAS E M³) */}
      {(showSection === 'TODOS' || showSection === 'DISTRIBUICAO') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider uppercase text-zinc-300 print:text-black flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-sky-400 print:hidden" />
              1. Esquema de Encoste & Movimentação de Placas - Distribuição ({filteredDist.length} Rotas)
            </h3>
            <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 print:hidden">
              <span>Volume: <strong className="text-emerald-400">{totalM3.toFixed(1)} m³</strong></span>
              <span>Caixas: <strong className="text-zinc-200">{totalCx.toLocaleString('pt-BR')}</strong></span>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-white/[0.08] rounded-xl overflow-hidden shadow-elevated print:bg-white print:border print:border-black print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed print:text-black">
                {/* Proporções Exatas para 100% da Largura (A4 Paisagem) */}
                <colgroup>
                  <col style={{ width: '5%' }} />   {/* Doca */}
                  <col style={{ width: '7%' }} />   {/* Encoste */}
                  <col style={{ width: '7%' }} />   {/* Rota */}
                  <col style={{ width: '7%' }} />   {/* Veículo */}
                  <col style={{ width: '13%' }} />  {/* Placas (Cavalo / Carreta) */}
                  <col style={{ width: '28%' }} />  {/* Lojas (1ª Loja & Sequência) */}
                  <col style={{ width: '7%' }} />   {/* M³ */}
                  <col style={{ width: '6%' }} />   {/* Cx */}
                  <col style={{ width: '10%' }} />  {/* Condutor */}
                  <col style={{ width: '5%' }} />   {/* Saída */}
                  <col style={{ width: '5%' }} />   {/* Visto Pátio */}
                </colgroup>

                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 font-semibold border-b border-white/[0.08] uppercase tracking-wider text-[10px] print:bg-zinc-200 print:text-black print:text-[10px] print:border-b-2 print:border-black">
                    <th className="py-2 px-2 text-center print:py-1.5 print:px-1 print:border-r print:border-black font-black">Doca</th>
                    <th className="py-2 px-2 text-center print:py-1.5 print:px-1 print:border-r print:border-black font-black">Encoste</th>
                    <th className="py-2 px-2 print:py-1.5 print:px-1.5 print:border-r print:border-black font-black">Rota</th>
                    <th className="py-2 px-2 text-center print:py-1.5 print:px-1 print:border-r print:border-black font-black">Veículo</th>
                    <th className="py-2 px-2.5 print:py-1.5 print:px-1.5 print:border-r print:border-black font-black font-mono">Placas (Cav/Car)</th>
                    <th className="py-2 px-3 print:py-1.5 print:px-2 print:border-r print:border-black font-black">Lojas & 1ª Entrega</th>
                    <th className="py-2 px-2 text-center print:py-1.5 print:px-1 print:border-r print:border-black font-black">M³</th>
                    <th className="py-2 px-2 text-center print:py-1.5 print:px-1 print:border-r print:border-black font-black">Cx</th>
                    <th className="py-2 px-2.5 print:py-1.5 print:px-1.5 print:border-r print:border-black font-black">Condutor</th>
                    <th className="py-2 px-2 text-center print:py-1.5 print:px-1 print:border-r print:border-black font-black">Saída</th>
                    <th className="py-2 px-2 text-center print:py-1.5 print:px-1 font-black">Visto</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.04] text-[11px] print:text-[10.5px] print:divide-black">
                  {filteredDist.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-zinc-500 font-sans print:text-gray-500">
                        Nenhuma rota de distribuição encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredDist.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] print:hover:bg-transparent print:border-b print:border-black">
                        {/* DOCA */}
                        <td className="py-1.5 px-2 text-center print:py-1 print:border-r print:border-black">
                          <span className="font-mono font-black text-xs print:text-sm text-purple-400 print:text-black">
                            {item.doca || '-'}
                          </span>
                        </td>

                        {/* HORÁRIO DE ENCOSTE */}
                        <td className="py-1.5 px-2 text-center whitespace-nowrap font-mono tabular-nums font-black text-xs print:text-xs text-amber-400 print:text-black print:border-r print:border-black">
                          {item.hora_encoste_previsto || '--:--'}
                        </td>

                        {/* ROTA */}
                        <td className="py-1.5 px-2 font-mono font-bold text-zinc-100 print:text-black print:border-r print:border-black whitespace-nowrap">
                          {item.rota}
                        </td>

                        {/* TIPO DE VEÍCULO */}
                        <td className="py-1.5 px-2 text-center print:py-1 print:px-1 print:border-r print:border-black whitespace-nowrap">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-white/[0.08] print:bg-transparent print:border print:border-black print:text-black uppercase">
                            {item.tipo_veiculo || 'TRUCK'}
                          </span>
                        </td>

                        {/* PLACAS (CAVALO E CARRETA PARA MOVIMENTAÇÕES DE PÁTIO) */}
                        <td className="py-1.5 px-2.5 print:py-1 print:px-1 text-zinc-100 print:text-black print:border-r print:border-black whitespace-nowrap font-mono text-[11px] print:text-[10px]">
                          {item.placa_cavalo || item.placa_carreta ? (
                            <div className="flex flex-col leading-tight">
                              {item.placa_cavalo ? (
                                <span className="font-bold">
                                  <span className="text-[9px] text-zinc-500 print:text-black mr-1 font-sans">CAV:</span>
                                  {item.placa_cavalo}
                                </span>
                              ) : null}
                              {item.placa_carreta ? (
                                <span className="font-bold text-sky-400 print:text-black">
                                  <span className="text-[9px] text-zinc-500 print:text-black mr-1 font-sans">CAR:</span>
                                  {item.placa_carreta}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-zinc-600 print:text-gray-400 italic text-[10px] font-sans">A definir</span>
                          )}
                        </td>

                        {/* LOJAS & 1ª LOJA INTEGRADA */}
                        <td className="py-1.5 px-3 print:py-1 print:px-1.5 text-zinc-300 print:text-black print:border-r print:border-black">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.primeira_entrega && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-black text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 print:bg-transparent print:border print:border-black print:text-black">
                                <span className="text-[9px] uppercase font-semibold text-sky-400 print:text-black">1ª</span>
                                <span className="font-mono">{item.primeira_entrega}</span>
                                {item.horario_primeira_entrega && (
                                  <span className="text-zinc-400 print:text-black font-medium">({item.horario_primeira_entrega})</span>
                                )}
                              </span>
                            )}
                            <span className="text-emerald-400 print:text-black font-semibold text-[11px] print:text-[10px] truncate" title={item.lojas}>
                              {item.lojas || item.primeira_entrega || '-'}
                            </span>
                          </div>
                        </td>

                        {/* METROS CÚBICOS (M³) */}
                        <td className="py-1.5 px-2 text-center font-mono tabular-nums font-bold text-zinc-100 print:text-black print:border-r print:border-black whitespace-nowrap text-xs print:text-[10.5px]">
                          {item.volume_m3 ? `${Number(item.volume_m3).toFixed(1)} m³` : '-'}
                        </td>

                        {/* CAIXAS (CX) */}
                        <td className="py-1.5 px-2 text-center font-mono text-zinc-300 print:text-black print:border-r print:border-black whitespace-nowrap text-[11px] print:text-[10px]">
                          {item.qtd_caixas ? item.qtd_caixas.toLocaleString('pt-BR') : '-'}
                        </td>

                        {/* CONDUTOR / MOTORISTA */}
                        <td className="py-1.5 px-2.5 print:py-1 print:px-1 text-zinc-300 print:text-black print:border-r print:border-black whitespace-nowrap print:text-[10px]">
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[120px] print:max-w-none">
                              {item.motorista_nome || <span className="text-zinc-600 print:text-gray-400 italic">Pendente</span>}
                            </span>
                            {item.motorista_restrito && (
                              <span className="text-[8px] text-amber-400 print:text-black font-bold uppercase">
                                ⚠️ Condutor Restrito
                              </span>
                            )}
                          </div>
                        </td>

                        {/* SAÍDA PREVISTA / REAL */}
                        <td className="py-1.5 px-2 text-center font-mono tabular-nums text-zinc-300 print:text-black print:border-r print:border-black whitespace-nowrap text-xs print:text-[10px]">
                          {item.horario_saida_real || item.hora_saida_motorista || '--:--'}
                        </td>

                        {/* VISTO / CONFERÊNCIA PÁTIO */}
                        <td className="py-1.5 px-2 text-center text-zinc-600 print:text-black">
                          <span className="print:hidden text-[10px]">-</span>
                          <div className="hidden print:block border-b border-black w-10 mx-auto h-3.5"></div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Linha de Totais no Rodapé */}
                {filteredDist.length > 0 && (
                  <tfoot className="bg-zinc-950 font-bold border-t border-white/[0.1] text-zinc-200 print:bg-zinc-200 print:text-black print:border-t-2 print:border-black text-[10px]">
                    <tr>
                      <td colSpan={5} className="py-2 px-2 text-right uppercase tracking-wider print:border-r print:border-black font-black">
                        Total Geral ({filteredDist.length} Rotas):
                      </td>
                      <td className="py-2 px-2 print:border-r print:border-black"></td>
                      <td className="py-2 px-2 text-center font-mono print:border-r print:border-black font-black text-xs">
                        {totalM3.toFixed(1)} m³
                      </td>
                      <td className="py-2 px-2 text-center font-mono print:border-r print:border-black font-black text-xs">
                        {totalCx.toLocaleString('pt-BR')}
                      </td>
                      <td colSpan={3} className="py-2 px-2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 2: TRANSFERÊNCIAS OPERACIONAIS NO PÁTIO */}
      {(showSection === 'TODOS' || showSection === 'TRANSFERENCIA') && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider uppercase text-zinc-300 print:text-black flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400 print:hidden" />
              2. Transferências & Coletas Operacionais no Pátio ({filteredTransf.length} Viagens)
            </h3>
          </div>

          <div className="bg-zinc-900/60 border border-white/[0.08] rounded-xl overflow-hidden shadow-elevated print:bg-white print:border print:border-black print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed print:text-black">
                <colgroup>
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '9%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 font-semibold border-b border-white/[0.08] uppercase tracking-wider text-[10px] print:bg-zinc-200 print:text-black print:text-[10px] print:border-b-2 print:border-black">
                    <th className="py-2 px-3 print:py-1.5 print:px-2 print:border-r print:border-black font-black">Operação / Rota</th>
                    <th className="py-2 px-3 print:py-1.5 print:px-2 print:border-r print:border-black font-black">Condutor / Motorista</th>
                    <th className="py-2 px-3 print:py-1.5 print:px-2 print:border-r print:border-black font-black">Placa</th>
                    <th className="py-2 px-2.5 print:py-1.5 print:px-2 print:border-r print:border-black font-black">Pegada</th>
                    <th className="py-2 px-2.5 print:py-1.5 print:px-2 print:border-r print:border-black font-black">Fim</th>
                    <th className="py-2 px-2.5 print:py-1.5 print:px-2 print:border-r print:border-black font-black">Limite</th>
                    <th className="py-2 px-2.5 print:py-1.5 print:px-2 print:border-r print:border-black font-black">Duração</th>
                    <th className="py-2 px-3 print:py-1.5 print:px-2 print:border-r print:border-black font-black">Status Operacional</th>
                    <th className="py-2 px-2.5 print:py-1.5 print:px-2 print:border-r print:border-black font-black text-center">Status Jornada</th>
                    <th className="py-2 px-2.5 print:py-1.5 print:px-2 font-black text-center">Visto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-[11px] print:text-[10px] print:divide-black">
                  {filteredTransf.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-zinc-500 font-sans print:text-gray-500">
                        Nenhuma transferência operacional registrada.
                      </td>
                    </tr>
                  ) : (
                    filteredTransf.map((t) => {
                      const isEstourado = t.status_jornada === 'ESTOURADO';
                      const isAlerta = t.status_jornada === 'ALERTA 1H';

                      return (
                        <tr key={t.id} className="hover:bg-white/[0.02] print:hover:bg-transparent print:border-b print:border-black">
                          <td className="py-1.5 px-3 font-semibold text-zinc-100 print:text-black print:border-r print:border-black whitespace-nowrap">
                            {t.operacao_rota}
                          </td>
                          <td className="py-1.5 px-3 text-zinc-300 print:text-black print:border-r print:border-black whitespace-nowrap">
                            {t.motorista_nome || 'Pendente'}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-zinc-200 print:text-black print:border-r print:border-black whitespace-nowrap">
                            {t.placa || '-'}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono tabular-nums text-zinc-300 print:text-black print:border-r print:border-black">
                            {t.horario_pegada}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono tabular-nums text-zinc-400 print:text-black print:border-r print:border-black">
                            {t.horario_fim || '--:--'}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono tabular-nums text-zinc-400 print:text-black print:border-r print:border-black">
                            {t.horario_limite || '--:--'}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono tabular-nums text-zinc-400 print:text-black print:border-r print:border-black">
                            {t.duracao_horas || '--:--'}
                          </td>
                          <td className="py-1.5 px-3 print:border-r print:border-black whitespace-nowrap font-medium text-zinc-300 print:text-black">
                            {t.status_operacional}
                          </td>
                          <td className="py-1.5 px-2.5 text-center print:border-r print:border-black whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isEstourado 
                                ? 'bg-rose-500/15 text-rose-300 print:text-black' 
                                : isAlerta 
                                  ? 'bg-amber-500/15 text-amber-300 print:text-black' 
                                  : 'bg-emerald-500/10 text-emerald-400 print:text-black'
                            }`}>
                              {t.status_jornada}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 text-center text-zinc-600 print:text-black">
                            <span className="print:hidden text-[10px]">-</span>
                            <div className="hidden print:block border-b border-black w-12 mx-auto h-3.5"></div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
