import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  Truck,
  ArrowRight,
  Filter,
  Radio,
  DollarSign
} from 'lucide-react';
import { ViagemTransferencia, StatusOperacionalTransferencia } from '../types';
import { calcularDuracao, calcularHorarioLimite, avaliarStatusJornada, BASE_PLACAS_CONHECIDAS } from '../utils/jornada';

interface TransferenciasTabProps {
  transferencias: ViagemTransferencia[];
  escalaId: string;
  onSave: (transf: ViagemTransferencia) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: StatusOperacionalTransferencia[] = [
  'INICIANDO',
  'EM TRANSITO',
  'SENTIDO CDJC',
  'SENTIDO CDFT',
  'CHEGOU NO LOCAL',
  'CARREGANDO',
  'EM DESCARGA',
  'FINALIZADO',
  'AGUARDANDO LIBERACAO'
];

export const TransferenciasTab: React.FC<TransferenciasTabProps> = ({
  transferencias,
  escalaId,
  onSave,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [jornadaFilter, setJornadaFilter] = useState<string>('TODOS');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ViagemTransferencia>>({});
  const [isAdding, setIsAdding] = useState(false);
  const debounceTimers = useRef<Record<string, any>>({});

  const [newForm, setNewForm] = useState<Partial<ViagemTransferencia>>({
    operacao_rota: '',
    motorista_nome: '',
    placa: '',
    vinculo_gobrax: 'DESVINCULADO',
    horario_pegada: '06:00',
    horario_fim: '',
    limite_horas: '11:20',
    status_operacional: 'INICIANDO',
    valor_diaria: 0,
    status_diaria: 'Pendente',
    observacoes_transferencia: ''
  });

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewForm({
      operacao_rota: '',
      motorista_nome: '',
      placa: '',
      vinculo_gobrax: 'DESVINCULADO',
      horario_pegada: '06:00',
      horario_fim: '',
      limite_horas: '11:20',
      status_operacional: 'INICIANDO',
      valor_diaria: 0,
      status_diaria: 'Pendente',
      observacoes_transferencia: ''
    });
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.operacao_rota) return;

    const pegada = newForm.horario_pegada || '06:00';
    const fim = newForm.horario_fim || '';
    const limiteHoras = newForm.limite_horas || '11:20';
    const limite = calcularHorarioLimite(pegada, limiteHoras);
    const { status: statusJornada } = avaliarStatusJornada(pegada, fim, limiteHoras);
    const duracao = calcularDuracao(pegada, fim);

    const newItem: ViagemTransferencia = {
      id: crypto.randomUUID(),
      escala_id: escalaId,
      operacao_rota: newForm.operacao_rota.toUpperCase(),
      motorista_nome: (newForm.motorista_nome || '').toUpperCase(),
      placa: (newForm.placa || '').toUpperCase(),
      vinculo_gobrax: newForm.vinculo_gobrax || 'DESVINCULADO',
      horario_pegada: pegada,
      horario_fim: fim,
      horario_limite: limite,
      limite_horas: limiteHoras,
      status_operacional: newForm.status_operacional || 'INICIANDO',
      status_jornada: statusJornada,
      duracao_horas: duracao,
      valor_diaria: Number(newForm.valor_diaria) || 0,
      status_diaria: newForm.status_diaria || 'Pendente',
      observacoes_transferencia: newForm.observacoes_transferencia || '',
      ultima_atualizacao: new Date().toISOString()
    };

    onSave(newItem);
    setIsAdding(false);
  };

  const handleStartEdit = (item: ViagemTransferencia) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = (id: string) => {
    const original = transferencias.find(t => t.id === id);
    if (!original) return;

    const pegada = editForm.horario_pegada || original.horario_pegada;
    const fim = editForm.horario_fim ?? original.horario_fim;
    const limiteHoras = editForm.limite_horas || original.limite_horas || '11:20';
    const limite = calcularHorarioLimite(pegada, limiteHoras);
    const { status: statusJornada } = avaliarStatusJornada(pegada, fim, limiteHoras);
    const duracao = calcularDuracao(pegada, fim);

    const updated: ViagemTransferencia = {
      ...original,
      ...editForm,
      horario_pegada: pegada,
      horario_fim: fim,
      horario_limite: limite,
      limite_horas: limiteHoras,
      status_jornada: statusJornada,
      duracao_horas: duracao,
      valor_diaria: Number(editForm.valor_diaria ?? original.valor_diaria) || 0,
      status_diaria: editForm.status_diaria || original.status_diaria || 'Pendente',
      vinculo_gobrax: editForm.vinculo_gobrax || original.vinculo_gobrax || 'DESVINCULADO',
      ultima_atualizacao: new Date().toISOString()
    };

    onSave(updated);
    setEditingId(null);
  };

  const handleQuickInlineUpdate = (
    item: ViagemTransferencia, 
    field: keyof ViagemTransferencia, 
    value: any,
    immediate = false
  ) => {
    const updated: ViagemTransferencia = {
      ...item,
      [field]: value,
      ultima_atualizacao: new Date().toISOString()
    };

    if (field === 'horario_pegada' || field === 'horario_fim' || field === 'limite_horas') {
      const pegada = field === 'horario_pegada' ? value : item.horario_pegada;
      const fim = field === 'horario_fim' ? value : item.horario_fim;
      const limiteHoras = field === 'limite_horas' ? value : (item.limite_horas || '11:20');
      updated.horario_limite = calcularHorarioLimite(pegada, limiteHoras);
      const { status } = avaliarStatusJornada(pegada, fim, limiteHoras);
      updated.status_jornada = status;
      updated.duracao_horas = calcularDuracao(pegada, fim);
    }

    const timerKey = `${item.id}_${String(field)}`;
    if (immediate) {
      if (debounceTimers.current[timerKey]) {
        clearTimeout(debounceTimers.current[timerKey]);
        delete debounceTimers.current[timerKey];
      }
      onSave(updated);
      return;
    }

    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }
    debounceTimers.current[timerKey] = setTimeout(() => {
      onSave(updated);
      delete debounceTimers.current[timerKey];
    }, 350);
  };

  const handleQuickStatusChange = (item: ViagemTransferencia, newStatus: StatusOperacionalTransferencia) => {
    const isFinishing = newStatus === 'FINALIZADO';
    let fim = item.horario_fim;
    if (isFinishing && !fim) {
      const now = new Date();
      fim = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    const { status: statusJornada } = avaliarStatusJornada(item.horario_pegada, fim, item.limite_horas || '11:20');
    const duracao = calcularDuracao(item.horario_pegada, fim);

    const updated: ViagemTransferencia = {
      ...item,
      status_operacional: newStatus,
      horario_fim: fim,
      status_jornada: statusJornada,
      duracao_horas: duracao,
      ultima_atualizacao: new Date().toISOString()
    };

    onSave(updated);
  };

  const filtered = transferencias.filter(item => {
    const matchSearch = 
      item.operacao_rota.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.motorista_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.observacoes_transferencia.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'TODOS' || item.status_operacional === statusFilter;
    const matchJornada = jornadaFilter === 'TODOS' || item.status_jornada === jornadaFilter;

    return matchSearch && matchStatus && matchJornada;
  });

  return (
    <div className="space-y-4">
      
      {/* Barra de Filtros estilo Linear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 backdrop-blur-md p-3 rounded-xl border border-white/[0.08] shadow-subtle">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Campo de Busca */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              id="search-transferencias"
              placeholder="Filtrar por rota, condutor, placa... (Ctrl+K)"
              aria-label="Buscar na tabela de transferências"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          {/* Filtro Status Operacional */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950/80 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="TODOS">Todos os Status</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {/* Filtro Status Jornada */}
          <select
            value={jornadaFilter}
            onChange={(e) => setJornadaFilter(e.target.value)}
            className="bg-zinc-950/80 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="TODOS">Todas as Jornadas</option>
            <option value="SEM ESTOURO">🟢 Sem Estouro</option>
            <option value="ALERTA 1H">🟡 Alerta 1h</option>
            <option value="ESTOURADO">🔴 Estourado</option>
          </select>
        </div>

        {/* Botão Adicionar */}
        <button
          onClick={handleStartAdd}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-xs font-semibold shadow-glow-emerald transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Nova Transferência</span>
        </button>
      </div>

      {/* Datalist para autocompletion de placas */}
      <datalist id="placas-conhecidas-transf">
        {BASE_PLACAS_CONHECIDAS.map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {/* Formulário Novo Item */}
      {isAdding && (
        <form onSubmit={handleSaveNew} className="bg-zinc-900 border border-emerald-500/40 rounded-xl p-4 shadow-elevated animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-3.5">
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              Cadastrar Transferência / Coleta Manual
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div className="col-span-2">
              <label className="block text-zinc-400 mb-1 font-medium">Operação / Rota *</label>
              <input
                type="text"
                required
                placeholder="Ex: CDJC X CDFT - JC3001"
                value={newForm.operacao_rota}
                onChange={(e) => setNewForm({ ...newForm, operacao_rota: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Condutor</label>
              <input
                type="text"
                placeholder="Nome do motorista"
                value={newForm.motorista_nome}
                onChange={(e) => setNewForm({ ...newForm, motorista_nome: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Placa do Veículo</label>
              <input
                type="text"
                list="placas-conhecidas-transf"
                placeholder="ABC-1234"
                value={newForm.placa}
                onChange={(e) => setNewForm({ ...newForm, placa: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Vínculo Gobrax</label>
              <select
                value={newForm.vinculo_gobrax}
                onChange={(e) => setNewForm({ ...newForm, vinculo_gobrax: e.target.value as 'VINCULADO' | 'DESVINCULADO' })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                <option value="DESVINCULADO">DESVINCULADO</option>
                <option value="VINCULADO">VINCULADO</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Status Operacional</label>
              <select
                value={newForm.status_operacional}
                onChange={(e) => setNewForm({ ...newForm, status_operacional: e.target.value as StatusOperacionalTransferencia })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Horário Pegada</label>
              <input
                type="time"
                value={newForm.horario_pegada}
                onChange={(e) => setNewForm({ ...newForm, horario_pegada: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Horário Fim</label>
              <input
                type="time"
                value={newForm.horario_fim}
                onChange={(e) => setNewForm({ ...newForm, horario_fim: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Limite de Jornada</label>
              <select
                value={newForm.limite_horas}
                onChange={(e) => setNewForm({ ...newForm, limite_horas: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                <option value="11:20">11h20 (Máxima CLT)</option>
                <option value="08:20">08h20 (Turno Padrão)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Valor Diária (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newForm.valor_diaria || ''}
                onChange={(e) => setNewForm({ ...newForm, valor_diaria: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Status Diária</label>
              <select
                value={newForm.status_diaria}
                onChange={(e) => setNewForm({ ...newForm, status_diaria: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-zinc-400 mb-1 font-medium">Observações</label>
              <input
                type="text"
                placeholder="Ex: Romaneio, Pernoite, Cross"
                value={newForm.observacoes_transferencia}
                onChange={(e) => setNewForm({ ...newForm, observacoes_transferencia: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3.5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg shadow-sm transition"
            >
              Salvar Transferência
            </button>
          </div>
        </form>
      )}

      {/* Tabela de Alta Densidade estilo Linear */}
      <div className="bg-zinc-900/60 border border-white/[0.08] rounded-xl overflow-hidden shadow-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-950 text-zinc-400 font-semibold border-b border-white/[0.08] uppercase tracking-wider text-[11px] select-none">
                <th className="py-2.5 px-3.5">Operação / Rota</th>
                <th className="py-2.5 px-3.5">Condutor</th>
                <th className="py-2.5 px-3">Placa</th>
                <th className="py-2.5 px-2.5 text-center">Gobrax</th>
                <th className="py-2.5 px-3">Pegada</th>
                <th className="py-2.5 px-3">Fim</th>
                <th className="py-2.5 px-3">Limite</th>
                <th className="py-2.5 px-3">Duração</th>
                <th className="py-2.5 px-3.5">Status Operacional</th>
                <th className="py-2.5 px-3 text-center">Status Jornada</th>
                <th className="py-2.5 px-3 text-center">Diária (R$)</th>
                <th className="py-2.5 px-2.5 text-center">Status Diária</th>
                <th className="py-2.5 px-3.5">Observações</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-zinc-500 font-sans">
                    Nenhuma viagem de transferência encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isEditing = editingId === item.id;
                  const isEstourado = item.status_jornada === 'ESTOURADO';
                  const isAlerta = item.status_jornada === 'ALERTA 1H';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isEstourado 
                          ? 'bg-rose-950/15' 
                          : isAlerta 
                            ? 'bg-amber-950/15' 
                            : ''
                      }`}
                    >
                      {/* ROTA */}
                      <td className="py-2.5 px-3.5 font-medium text-zinc-100 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.operacao_rota || ''}
                            onChange={(e) => setEditForm({ ...editForm, operacao_rota: e.target.value })}
                            className="bg-zinc-950 border border-white/[0.1] rounded px-2 py-0.5 text-zinc-100 w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>{item.operacao_rota}</span>
                          </div>
                        )}
                      </td>

                      {/* CONDUTOR (CLICK-TO-EDIT) */}
                      <td className="py-2.5 px-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.motorista_nome || ''}
                            onChange={(e) => setEditForm({ ...editForm, motorista_nome: e.target.value.toUpperCase() })}
                            className="bg-zinc-950 border border-white/[0.1] rounded px-2 py-0.5 text-zinc-100 w-full"
                          />
                        ) : (
                          <input
                            type="text"
                            value={item.motorista_nome || ''}
                            onChange={(e) => handleQuickInlineUpdate(item, 'motorista_nome', e.target.value.toUpperCase())}
                            onBlur={(e) => handleQuickInlineUpdate(item, 'motorista_nome', e.target.value.toUpperCase(), true)}
                            placeholder="A definir"
                            aria-label={`Condutor da transferência ${item.operacao_rota}`}
                            className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-1 py-0.5 font-medium text-zinc-200 uppercase w-32 transition"
                            title="Clique para editar condutor"
                          />
                        )}
                      </td>

                      {/* PLACA (CLICK-TO-EDIT COM DATALIST) */}
                      <td className="py-2.5 px-3 font-mono">
                        {isEditing ? (
                          <input
                            type="text"
                            list="placas-conhecidas-transf"
                            value={editForm.placa || ''}
                            onChange={(e) => setEditForm({ ...editForm, placa: e.target.value.toUpperCase() })}
                            className="bg-zinc-950 border border-white/[0.1] rounded px-1.5 py-0.5 text-zinc-100 uppercase w-24"
                          />
                        ) : (
                          <input
                            type="text"
                            list="placas-conhecidas-transf"
                            value={item.placa || ''}
                            onChange={(e) => handleQuickInlineUpdate(item, 'placa', e.target.value.toUpperCase())}
                            onBlur={(e) => handleQuickInlineUpdate(item, 'placa', e.target.value.toUpperCase(), true)}
                            placeholder="---"
                            aria-label={`Placa da transferência ${item.operacao_rota}`}
                            className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-1.5 py-0.5 font-mono text-zinc-300 w-24 uppercase text-[11px] transition"
                            title="Clique para editar placa (sugestões automáticas)"
                          />
                        )}
                      </td>

                      {/* GOBRAX (CLICK RÁPIDO) */}
                      <td className="py-2.5 px-2.5 text-center">
                        <button
                          onClick={() => {
                            const next = item.vinculo_gobrax === 'VINCULADO' ? 'DESVINCULADO' : 'VINCULADO';
                            handleQuickInlineUpdate(item, 'vinculo_gobrax', next, true);
                          }}
                          aria-label={`Alternar vínculo Gobrax da transferência ${item.operacao_rota}`}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                            item.vinculo_gobrax === 'VINCULADO'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border-white/[0.06] hover:text-zinc-200'
                          }`}
                          title="Clique para alternar o vínculo Gobrax"
                        >
                          {item.vinculo_gobrax === 'VINCULADO' ? 'VINCULADO' : 'DESVINC.'}
                        </button>
                      </td>

                      {/* PEGADA */}
                      <td className="py-2.5 px-3 font-mono tabular-nums text-zinc-300">
                        {isEditing ? (
                          <input
                            type="time"
                            value={editForm.horario_pegada || ''}
                            onChange={(e) => setEditForm({ ...editForm, horario_pegada: e.target.value })}
                            className="bg-zinc-950 border border-white/[0.1] rounded px-1 py-0.5 text-zinc-100 w-16"
                          />
                        ) : (
                          item.horario_pegada
                        )}
                      </td>

                      {/* FIM */}
                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        {isEditing ? (
                          <input
                            type="time"
                            value={editForm.horario_fim || ''}
                            onChange={(e) => setEditForm({ ...editForm, horario_fim: e.target.value })}
                            className="bg-zinc-950 border border-white/[0.1] rounded px-1 py-0.5 text-zinc-100 w-16"
                          />
                        ) : (
                          <span className={item.horario_fim ? 'text-zinc-300 font-medium' : 'text-zinc-600'}>
                            {item.horario_fim || '--:--'}
                          </span>
                        )}
                      </td>

                      {/* LIMITE */}
                      <td className="py-2.5 px-3 font-mono tabular-nums text-zinc-400">
                        {item.horario_limite || '--:--'}
                      </td>

                      {/* DURAÇÃO */}
                      <td className="py-2.5 px-3 font-mono tabular-nums text-zinc-400">
                        {item.duracao_horas || '--:--'}
                      </td>

                      {/* STATUS OPERACIONAL */}
                      <td className="py-2.5 px-3.5">
                        <select
                          value={item.status_operacional}
                          onChange={(e) => handleQuickStatusChange(item, e.target.value as StatusOperacionalTransferencia)}
                          className={`text-[11px] font-medium rounded-lg px-2 py-0.5 focus:outline-none border transition-colors cursor-pointer ${
                            item.status_operacional === 'FINALIZADO'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : item.status_operacional === 'EM TRANSITO' || item.status_operacional.includes('SENTIDO')
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                : item.status_operacional === 'CARREGANDO' || item.status_operacional === 'EM DESCARGA'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-zinc-800 text-zinc-300 border-white/[0.08]'
                          }`}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt} className="bg-zinc-900 text-zinc-200">{opt}</option>
                          ))}
                        </select>
                      </td>

                      {/* STATUS DA JORNADA */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isEstourado
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                            : isAlerta
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isEstourado ? 'bg-rose-400' : isAlerta ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}></span>
                          <span>{item.status_jornada}</span>
                        </span>
                      </td>

                      {/* VALOR DIÁRIA (R$) */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.valor_diaria ?? item.valor_diaria ?? 0}
                            onChange={(e) => setEditForm({ ...editForm, valor_diaria: parseFloat(e.target.value) || 0 })}
                            className="bg-zinc-950 border border-white/[0.1] rounded px-1.5 py-0.5 text-zinc-100 w-20 text-center font-mono"
                          />
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={item.valor_diaria ?? 0}
                            onChange={(e) => handleQuickInlineUpdate(item, 'valor_diaria', parseFloat(e.target.value) || 0)}
                            className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-1 py-0.5 font-mono text-zinc-200 text-center w-20 transition"
                            title="Clique para editar o valor da diária"
                          />
                        )}
                      </td>

                      {/* STATUS DIÁRIA */}
                      <td className="py-2.5 px-2.5 text-center">
                        <button
                          onClick={() => {
                            const next = item.status_diaria === 'Pago' ? 'Pendente' : 'Pago';
                            handleQuickInlineUpdate(item, 'status_diaria', next);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                            item.status_diaria === 'Pago'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                          title="Clique para alternar status da diária (Pendente / Pago)"
                        >
                          {item.status_diaria || 'Pendente'}
                        </button>
                      </td>

                      {/* OBS */}
                      <td className="py-2.5 px-3.5 text-zinc-400 max-w-xs truncate text-[11px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.observacoes_transferencia || ''}
                            onChange={(e) => setEditForm({ ...editForm, observacoes_transferencia: e.target.value })}
                            className="bg-zinc-950 border border-white/[0.1] rounded px-2 py-0.5 text-zinc-100 w-full"
                          />
                        ) : (
                          <input
                            type="text"
                            value={item.observacoes_transferencia || ''}
                            onChange={(e) => handleQuickInlineUpdate(item, 'observacoes_transferencia', e.target.value)}
                            placeholder="-"
                            className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-1 py-0.5 text-zinc-400 w-full truncate transition"
                          />
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                              title="Salvar"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                              title="Editar Linha"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(item.id)}
                              className="p-1 rounded hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 transition"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
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
  );
};
