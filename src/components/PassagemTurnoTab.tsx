import React, { useState } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Copy, 
  Check, 
  Filter, 
  AlertCircle,
  FileSpreadsheet,
  Search,
  ArrowRightLeft
} from 'lucide-react';
import { PassagemTurnoItem } from '../types';

interface PassagemTurnoTabProps {
  passagens: PassagemTurnoItem[];
  escalaId: string;
  dataOperacao: string;
  onSave: (item: PassagemTurnoItem) => void;
  onDelete: (id: string) => void;
}

export const PassagemTurnoTab: React.FC<PassagemTurnoTabProps> = ({
  passagens,
  escalaId,
  dataOperacao,
  onSave,
  onDelete
}) => {
  const [selectedTurno, setSelectedTurno] = useState<'TODOS' | 'T1' | 'T2' | 'T3'>('T3');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Formulário de Criação/Edição
  const [formData, setFormData] = useState<Partial<PassagemTurnoItem>>({
    turno: 'T3',
    item_num: 1,
    descricao: '',
    observacao: 'ACOMPANHAR',
    status: 'NÃO REALIZADO'
  });

  const getPrevTurno = (turno: 'T1' | 'T2' | 'T3'): 'T1' | 'T2' | 'T3' => {
    if (turno === 'T2') return 'T1';
    if (turno === 'T3') return 'T2';
    return 'T3';
  };

  const activeTurno = selectedTurno === 'TODOS' ? 'T3' : selectedTurno;
  const prevTurno = getPrevTurno(activeTurno);

  const cleanDesc = (d: string) => d.replace(/\[Herdado do T[123]\]\s*/g, '').trim().toLowerCase();

  const currentTurnoItems = passagens.filter(p => p.turno === activeTurno);
  const currentDescriptions = new Set(currentTurnoItems.map(p => cleanDesc(p.descricao)));

  // Pendências do turno anterior que ainda não foram migradas para o turno atual
  const unmigratedPending = passagens.filter(p => 
    p.turno === prevTurno && 
    p.status === 'NÃO REALIZADO' && 
    !currentDescriptions.has(cleanDesc(p.descricao))
  );

  const handleMigratePending = () => {
    if (unmigratedPending.length === 0) return;

    let nextNum = currentTurnoItems.length > 0 
      ? Math.max(...currentTurnoItems.map(i => i.item_num || 0)) + 1 
      : 1;

    unmigratedPending.forEach((item, idx) => {
      const baseDesc = item.descricao.replace(/\[Herdado do T[123]\]\s*/g, '').trim();
      const newItem: PassagemTurnoItem = {
        id: `pass_${Date.now()}_${Math.random().toString(36).substr(2, 6)}_${idx}`,
        escala_id: escalaId,
        turno: activeTurno,
        item_num: nextNum++,
        descricao: `[Herdado do ${prevTurno}] ${baseDesc}`,
        observacao: item.observacao || 'ACOMPANHAR',
        status: 'NÃO REALIZADO',
        criado_em: new Date().toISOString()
      };
      onSave(newItem);
    });
  };

  const filteredPassagens = passagens.filter(p => {
    const matchesTurno = selectedTurno === 'TODOS' || p.turno === selectedTurno;
    const matchesSearch = 
      p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.observacao.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTurno && matchesSearch;
  }).sort((a, b) => (a.item_num || 0) - (b.item_num || 0));

  const handleOpenNew = () => {
    const currentTurno = selectedTurno === 'TODOS' ? 'T3' : selectedTurno;
    const sameTurnoItems = passagens.filter(p => p.turno === currentTurno);
    const nextNum = sameTurnoItems.length > 0 
      ? Math.max(...sameTurnoItems.map(i => i.item_num || 0)) + 1 
      : 1;

    setFormData({
      id: undefined,
      escala_id: escalaId,
      turno: currentTurno,
      item_num: nextNum,
      descricao: '',
      observacao: 'ACOMPANHAR',
      status: 'NÃO REALIZADO',
      criado_em: new Date().toISOString()
    });
    setIsEditing(true);
  };

  const handleEdit = (item: PassagemTurnoItem) => {
    setFormData(item);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao?.trim()) return;

    const itemToSave: PassagemTurnoItem = {
      id: formData.id || `pass_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      escala_id: escalaId,
      turno: (formData.turno as 'T1' | 'T2' | 'T3') || 'T3',
      item_num: formData.item_num || 1,
      descricao: formData.descricao.trim(),
      observacao: formData.observacao?.trim() || 'INFORMATIVO',
      status: (formData.status as 'REALIZADO' | 'NÃO REALIZADO') || 'NÃO REALIZADO',
      criado_em: formData.criado_em || new Date().toISOString()
    };

    onSave(itemToSave);
    setIsEditing(false);
  };

  const handleToggleStatus = (item: PassagemTurnoItem) => {
    const nextStatus = item.status === 'REALIZADO' ? 'NÃO REALIZADO' : 'REALIZADO';
    onSave({
      ...item,
      status: nextStatus
    });
  };

  const handleCopyWhatsApp = () => {
    const turnoLabel = selectedTurno === 'TODOS' ? 'GERAL' : selectedTurno;
    const formattedDate = dataOperacao.split('-').reverse().join('/');
    
    let text = `📋 *PASSAGEM DE TURNO ${turnoLabel} - ${formattedDate}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (filteredPassagens.length === 0) {
      text += `_Nenhuma ocorrência registrada para este turno._\n`;
    } else {
      filteredPassagens.forEach((item) => {
        const icon = item.status === 'REALIZADO' ? '🟢' : '🔴';
        text += `*#${item.item_num}* ${icon} *[${item.status}]*\n`;
        text += `📝 *Descrição:* ${item.descricao}\n`;
        text += `🔍 *Observação:* ${item.observacao}\n\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Enviado via Torre de Controle Logística - CDFT_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Contadores de resumo
  const total = filteredPassagens.length;
  const realizados = filteredPassagens.filter(p => p.status === 'REALIZADO').length;
  const pendentes = filteredPassagens.filter(p => p.status === 'NÃO REALIZADO').length;

  return (
    <div className="space-y-6">
      {/* Top Banner de Informações e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 backdrop-blur-md p-4 rounded-xl border border-white/[0.08] shadow-subtle">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              Passagem de Turno Operacional
              <span className="text-xs font-normal text-zinc-400">
                ({dataOperacao.split('-').reverse().join('/')})
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Controle de ocorrências, entregas de NFs, pendências e passagem entre turnos T1, T2 e T3
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão Copiar WhatsApp */}
          <button
            onClick={handleCopyWhatsApp}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition border active:scale-95 ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border-white/[0.08]'
            }`}
            title="Copiar texto formatado para o WhatsApp da equipe"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
            <span>{copied ? 'Copiado p/ WhatsApp!' : 'Copiar p/ WhatsApp'}</span>
          </button>

          {/* Botão Migrar Pendências do Turno Anterior */}
          {unmigratedPending.length > 0 && selectedTurno !== 'TODOS' && (
            <button
              onClick={handleMigratePending}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition active:scale-95"
              title={`Migrar pendências do ${prevTurno} para ${activeTurno}`}
            >
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              <span>Migrar Pendências ({unmigratedPending.length})</span>
            </button>
          )}

          {/* Botão Nova Ocorrência */}
          <button
            onClick={handleOpenNew}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-glow-emerald active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Ocorrência</span>
          </button>
        </div>
      </div>

      {/* Banner de Migração de Pendências do Turno Anterior */}
      {unmigratedPending.length > 0 && selectedTurno !== 'TODOS' && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-200">
                {unmigratedPending.length} pendência(s) em aberto do Turno {prevTurno}
              </p>
              <p className="text-[11px] text-zinc-400">
                Itens com status "NÃO REALIZADO" podem ser transferidos automaticamente para acompanhamento no Turno {activeTurno}.
              </p>
            </div>
          </div>
          <button
            onClick={handleMigratePending}
            className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold transition shadow-sm active:scale-95 shrink-0"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Migrar {unmigratedPending.length} pendência(s) para {activeTurno}</span>
          </button>
        </div>
      )}

      {/* Controles de Filtros & Indicadores */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Seletor de Turnos */}
          <div className="inline-flex p-1 bg-zinc-950 border border-white/[0.08] rounded-lg">
            {(['TODOS', 'T1', 'T2', 'T3'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSelectedTurno(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  selectedTurno === t
                    ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t === 'TODOS' ? 'Todos Turnos' : `Turno ${t}`}
                {t !== 'TODOS' && (
                  <span className="ml-1.5 text-[10px] text-zinc-500 font-mono">
                    ({passagens.filter(p => p.turno === t).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Campo de Busca */}
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar ocorrência, motorista, NF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition"
            />
          </div>
        </div>

        {/* Resumo de Status */}
        <div className="flex items-center gap-2.5 text-xs">
          <span className="text-zinc-400">
            Total: <strong className="text-zinc-200">{total}</strong>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {realizados} Realizados
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            {pendentes} Pendentes
          </span>
        </div>
      </div>

      {/* Tabela de Passagem de Turno (Idêntica ao layout da planilha) */}
      <div className="bg-zinc-900/60 rounded-xl border border-white/[0.08] overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-950/80 text-zinc-400 border-b border-white/[0.08] font-semibold uppercase tracking-wider text-[11px]">
                <th className="px-3 py-3 w-16 text-center">#</th>
                <th className="px-3 py-3 w-20 text-center">Turno</th>
                <th className="px-4 py-3">Descrição da Ocorrência</th>
                <th className="px-4 py-3 w-56">Observação</th>
                <th className="px-4 py-3 w-40 text-center">Status</th>
                <th className="px-3 py-3 w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-zinc-200">
              {filteredPassagens.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                    Nenhuma ocorrência registrada no {selectedTurno === 'TODOS' ? 'momento' : `Turno ${selectedTurno}`}.
                    <br />
                    <button
                      onClick={handleOpenNew}
                      className="mt-3 text-xs text-emerald-400 hover:underline font-medium"
                    >
                      + Clique aqui para adicionar a primeira ocorrência
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPassagens.map((item) => {
                  const isDone = item.status === 'REALIZADO';
                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-zinc-800/40 transition group"
                    >
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-zinc-300">
                        {item.item_num}
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-semibold text-[10px] bg-zinc-800 text-zinc-300 border border-white/[0.06]">
                          {item.turno}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 leading-relaxed">
                        <div className="flex items-start gap-2">
                          {item.descricao.includes('[Herdado do') && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                              <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                              {item.descricao.match(/\[(Herdado do T[123])\]/)?.[1] || 'Herdado'}
                            </span>
                          )}
                          <span className="font-medium text-zinc-100">
                            {item.descricao.replace(/\[Herdado do T[123]\]\s*/g, '')}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-semibold border uppercase ${
                          item.observacao.includes('ACOMPANHAR')
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : item.observacao.includes('FINALIZADO')
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : item.observacao.includes('EM ANDAMENTO')
                                ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                                : 'bg-zinc-800 text-zinc-300 border-white/[0.08]'
                        }`}>
                          {item.observacao}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border active:scale-95 ${
                            isDone
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                          }`}
                          title="Clique para alternar o status"
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>REALIZADO</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>NÃO REALIZADO</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 rounded transition"
                            title="Editar ocorrência"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                            title="Excluir ocorrência"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal / Formulário de Criação/Edição */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/[0.1] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                {formData.id ? 'Editar Ocorrência' : 'Nova Ocorrência na Passagem'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-zinc-400 hover:text-zinc-100 text-sm font-medium"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Turno
                  </label>
                  <select
                    value={formData.turno}
                    onChange={(e) => setFormData({ ...formData, turno: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="T1">Turno T1</option>
                    <option value="T2">Turno T2</option>
                    <option value="T3">Turno T3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Número do Item (#)
                  </label>
                  <input
                    type="number"
                    value={formData.item_num || 1}
                    onChange={(e) => setFormData({ ...formData, item_num: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Descrição Detalhada da Ocorrência *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: ROTA ON720M (MOTORISTA: DIEGO) Houve avaria no para-choque de terceiro ao descarregar na loja OSC..."
                  className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Observação / Ação Recomendada
                  </label>
                  <input
                    type="text"
                    value={formData.observacao || ''}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Ex: ACOMPANHAR PRELIMINAR, FINALIZADO..."
                    list="obs-suggestions"
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="obs-suggestions">
                    <option value="ACOMPANHAR" />
                    <option value="ACOMPANHAR PRELIMINAR" />
                    <option value="ACOMPANHAR NF'S NO ACRILICO" />
                    <option value="INFORMATIVO" />
                    <option value="EM ANDAMENTO" />
                    <option value="FINALIZADO" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Status Atual
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NÃO REALIZADO">🔴 NÃO REALIZADO</option>
                    <option value="REALIZADO">🟢 REALIZADO</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-glow-emerald"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
