import React, { useState } from 'react';
import { MessageSquare, Copy, Check, X } from 'lucide-react';
import { EscalaCompleta } from '../types';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataOperacao: string;
  escalaCompleta: EscalaCompleta | null;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  dataOperacao,
  escalaCompleta
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen || !escalaCompleta) return null;

  const dataFormatada = dataOperacao.split('-').reverse().join('/');

  const estourados = escalaCompleta.transferencias.filter(t => t.status_jornada === 'ESTOURADO').length;
  const alertas = escalaCompleta.transferencias.filter(t => t.status_jornada === 'ALERTA 1H').length;

  const textResumo = `🚨 *TORRE DE CONTROLE LOGÍSTICO - CDFT* 🚨
📅 *Data Operação:* ${dataFormatada}

📊 *RESUMO OPERACIONAL:*
• 🔄 *Transferências/Coletas:* ${escalaCompleta.transferencias.length}
• 🚚 *Rotas de Distribuição:* ${escalaCompleta.distribuicoes.length}
• ⏰ *Motoristas em Plantão:* ${escalaCompleta.plantoes.length}
• ⚠️ *Alertas de Jornada:* ${estourados > 0 ? `🔴 ${estourados} ESTOURO(S)` : alertas > 0 ? `🟡 ${alertas} ALERTA(S)` : '🟢 100% REGULAR'}

_Gerado via Logistics Control Tower_`;

  let textTransf = `🔄 *TORRE DE CONTROLE: TRANSFERÊNCIAS & COLETAS* 🔄
📅 *Data:* ${dataFormatada}
──────────────────────────────\n`;

  escalaCompleta.transferencias.forEach((t, idx) => {
    const badge = t.status_jornada === 'ESTOURADO' ? '🔴 ESTOURADO' : t.status_jornada === 'ALERTA 1H' ? '🟡 ALERTA' : '🟢 OK';
    textTransf += `*${idx + 1}. ${t.operacao_rota}*\n`;
    textTransf += `👤 *Condutor:* ${t.motorista_nome || 'Pendente'} | 🚛 *Placa:* ${t.placa || '---'}\n`;
    textTransf += `⏰ *Pegada:* ${t.horario_pegada} ➔ *Limite:* ${t.horario_limite} (${badge})\n`;
    textTransf += `📍 *Status:* ${t.status_operacional}\n`;
    if (t.observacoes_transferencia) textTransf += `📝 *Obs:* ${t.observacoes_transferencia}\n`;
    textTransf += `──────────────────────────────\n`;
  });

  let textDist = `🚚 *ESCALA DE DISTRIBUIÇÃO - CARREGAMENTOS* 🚚
📅 *Data:* ${dataFormatada}
──────────────────────────────\n`;

  escalaCompleta.distribuicoes.slice(0, 30).forEach((d) => {
    textDist += `*DOCA ${d.doca || '-'}* [${d.hora_encoste_previsto || '--:--'}] ➔ *${d.rota}*\n`;
    textDist += `🏪 *Lojas:* ${d.lojas || d.primeira_entrega || '-'}\n`;
    textDist += `👤 *Motorista:* ${d.motorista_nome || 'A definir'} | *Placa:* ${d.placa_cavalo || '-'}\n`;
    textDist += `──────────────────────────────\n`;
  });
  if (escalaCompleta.distribuicoes.length > 30) {
    textDist += `_... e mais ${escalaCompleta.distribuicoes.length - 30} rotas na plataforma._\n`;
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Central de disparo WhatsApp"
    >
      <div className="bg-zinc-900 border border-white/[0.1] rounded-2xl max-w-2xl w-full p-5 shadow-elevated space-y-4 max-h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Central de Disparo WhatsApp</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-zinc-300 transition"
            aria-label="Fechar janela"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1 flex-1 text-xs">
          
          {/* Card 1: Resumo Geral */}
          <div className="bg-zinc-950 border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">1. Resumo Geral Operacional</span>
              <button
                onClick={() => copyToClipboard(textResumo, 'resumo')}
                className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-white/[0.08] transition active:scale-95"
              >
                {copiedType === 'resumo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedType === 'resumo' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="bg-zinc-900/80 p-3 rounded-lg text-zinc-300 font-mono whitespace-pre-wrap text-[11px] border border-white/[0.04]">
              {textResumo}
            </pre>
          </div>

          {/* Card 2: Transferências */}
          <div className="bg-zinc-950 border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">2. Somente Transferências & Status de Jornada</span>
              <button
                onClick={() => copyToClipboard(textTransf, 'transf')}
                className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-white/[0.08] transition active:scale-95"
              >
                {copiedType === 'transf' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedType === 'transf' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="bg-zinc-900/80 p-3 rounded-lg text-zinc-300 font-mono whitespace-pre-wrap text-[11px] border border-white/[0.04] max-h-36 overflow-y-auto">
              {textTransf}
            </pre>
          </div>

          {/* Card 3: Distribuição */}
          <div className="bg-zinc-950 border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">3. Escala de Distribuição por Doca</span>
              <button
                onClick={() => copyToClipboard(textDist, 'dist')}
                className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-white/[0.08] transition active:scale-95"
              >
                {copiedType === 'dist' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedType === 'dist' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="bg-zinc-900/80 p-3 rounded-lg text-zinc-300 font-mono whitespace-pre-wrap text-[11px] border border-white/[0.04] max-h-36 overflow-y-auto">
              {textDist}
            </pre>
          </div>

        </div>

      </div>
    </div>
  );
};
