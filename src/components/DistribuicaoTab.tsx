import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  Radio,
  Thermometer,
  Box,
  UserCheck,
  UserX,
  FileSpreadsheet
} from 'lucide-react';
import { ViagemDistribuicao } from '../types';
import { BASE_PLACAS_CONHECIDAS, avaliarConformidadePrimeiraLoja, timeToMinutes } from '../utils/jornada';

interface DistribuicaoTabProps {
  distribuicoes: ViagemDistribuicao[];
  escalaId: string;
  onSave: (dist: ViagemDistribuicao) => void;
  onDelete: (id: string) => void;
  initialFilterSpecial?: 'TODOS' | 'SEM_EMBARQUE' | 'ATRASO_1LOJA' | 'RESTRITOS' | 'GOBRAX_PENDENTE';
}

export const DistribuicaoTab: React.FC<DistribuicaoTabProps> = ({
  distribuicoes,
  escalaId,
  onSave,
  onDelete,
  initialFilterSpecial = 'TODOS'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [docaFilter, setDocaFilter] = useState('TODAS');
  const [statusCarregamentoFilter, setStatusCarregamentoFilter] = useState('TODOS');
  const [filterSpecial, setFilterSpecial] = useState<'TODOS' | 'SEM_EMBARQUE' | 'ATRASO_1LOJA' | 'RESTRITOS' | 'GOBRAX_PENDENTE'>(initialFilterSpecial);

  useEffect(() => {
    if (initialFilterSpecial) {
      setFilterSpecial(initialFilterSpecial);
    }
  }, [initialFilterSpecial]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ViagemDistribuicao>>({});
  const [isAdding, setIsAdding] = useState(false);
  const debounceTimers = useRef<Record<string, any>>({});

  const [newForm, setNewForm] = useState<Partial<ViagemDistribuicao>>({
    embarque_cod: '',
    rota: '',
    doca: '',
    hora_encoste_previsto: '04:00',
    lojas: '',
    tipo_veiculo: 'TRUCK',
    placa_cavalo: '',
    placa_carreta: '',
    vinculo_gobrax: 'DESVINCULADO',
    motorista_nome: '',
    motorista_restrito: false,
    ajudante_1: '',
    ajudante_2: '',
    horario_primeira_entrega: '',
    horario_real_primeira_loja: '',
    pirometro: '',
    qtd_caixas: 0,
    hora_saida_motorista: '',
    horario_saida_real: '',
    justificativa_saida: '',
    valor_diaria: 0,
    status_diaria: 'Pendente',
    status_carregamento: 'Pendente',
    status_motorista: 'OK',
    observacoes: ''
  });

  const docas = Array.from(new Set(distribuicoes.map(d => d.doca).filter(Boolean))).sort((a,b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewForm({
      embarque_cod: '',
      rota: '',
      doca: '',
      hora_encoste_previsto: '04:00',
      lojas: '',
      tipo_veiculo: 'TRUCK',
      placa_cavalo: '',
      placa_carreta: '',
      vinculo_gobrax: 'DESVINCULADO',
      motorista_nome: '',
      motorista_restrito: false,
      ajudante_1: '',
      ajudante_2: '',
      horario_primeira_entrega: '',
      horario_real_primeira_loja: '',
      pirometro: '',
      qtd_caixas: 0,
      hora_saida_motorista: '',
      horario_saida_real: '',
      justificativa_saida: '',
      valor_diaria: 0,
      status_diaria: 'Pendente',
      status_carregamento: 'Pendente',
      status_motorista: 'OK',
      observacoes: ''
    });
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.rota) return;

    const { status: status1Loja } = avaliarConformidadePrimeiraLoja(
      newForm.horario_primeira_entrega || '',
      newForm.horario_real_primeira_loja || ''
    );

    const newItem: ViagemDistribuicao = {
      id: crypto.randomUUID(),
      escala_id: escalaId,
      embarque_cod: (newForm.embarque_cod || '').trim(),
      rota: (newForm.rota || '').toUpperCase(),
      tipo_veiculo: newForm.tipo_veiculo || 'TRUCK',
      doca: newForm.doca || '',
      hora_encoste_previsto: newForm.hora_encoste_previsto || '',
      hora_saida_motorista: newForm.hora_saida_motorista || '',
      horario_saida_real: newForm.horario_saida_real || newForm.hora_saida_motorista || '',
      justificativa_saida: newForm.justificativa_saida || '',
      qtd_lojas: newForm.lojas ? newForm.lojas.split(/[-–;,]/).length : 1,
      lojas: newForm.lojas || '',
      volume_m3: newForm.volume_m3 || 0,
      qtd_caixas: newForm.qtd_caixas || 0,
      primeira_entrega: newForm.lojas ? newForm.lojas.split(/[-–;,]/)[0].trim() : '',
      horario_primeira_entrega: newForm.horario_primeira_entrega || '',
      horario_real_primeira_loja: newForm.horario_real_primeira_loja || '',
      status_primeira_loja: status1Loja,
      hora_ultima_loja: newForm.hora_ultima_loja || '',
      retorno_previsto: '',
      pirometro: newForm.pirometro || '',
      placa_cavalo: (newForm.placa_cavalo || '').toUpperCase(),
      placa_carreta: (newForm.placa_carreta || '').toUpperCase(),
      vinculo_gobrax: newForm.vinculo_gobrax || 'DESVINCULADO',
      motorista_nome: (newForm.motorista_nome || '').toUpperCase(),
      motorista_restrito: Boolean(newForm.motorista_restrito),
      ajudante_1: (newForm.ajudante_1 || '').toUpperCase(),
      ajudante_2: (newForm.ajudante_2 || '').toUpperCase(),
      observacoes: newForm.observacoes || '',
      valor_diaria: newForm.valor_diaria || 0,
      status_diaria: newForm.status_diaria || 'Pendente',
      status_motorista: newForm.status_motorista || 'OK',
      status_carregamento: newForm.status_carregamento || 'Pendente'
    };

    onSave(newItem);
    setIsAdding(false);
  };

  const handleStartEdit = (item: ViagemDistribuicao) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const original = distribuicoes.find(d => d.id === editingId);
    if (!original) return;

    const { status: status1Loja } = avaliarConformidadePrimeiraLoja(
      editForm.horario_primeira_entrega || original.horario_primeira_entrega,
      editForm.horario_real_primeira_loja || original.horario_real_primeira_loja || ''
    );

    const updated: ViagemDistribuicao = {
      ...original,
      ...editForm,
      status_primeira_loja: status1Loja
    } as ViagemDistribuicao;

    onSave(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Edição rápida de célula inline com debounce inteligente (database-optimizer & architecture-expert)
  const handleQuickInlineUpdate = (
    item: ViagemDistribuicao, 
    field: keyof ViagemDistribuicao, 
    value: any, 
    immediate = false
  ) => {
    const updated = { ...item, [field]: value };
    if (field === 'horario_real_primeira_loja' || field === 'horario_primeira_entrega') {
      const { status } = avaliarConformidadePrimeiraLoja(
        field === 'horario_primeira_entrega' ? value : item.horario_primeira_entrega,
        field === 'horario_real_primeira_loja' ? value : (item.horario_real_primeira_loja || '')
      );
      updated.status_primeira_loja = status;
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

  // Filtragem
  const filtered = distribuicoes.filter(item => {
    const matchesSearch = 
      item.rota.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.doca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.embarque_cod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lojas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.motorista_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.placa_cavalo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.placa_carreta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ajudante_1.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDoca = docaFilter === 'TODAS' || item.doca === docaFilter;
    const matchesStatus = statusCarregamentoFilter === 'TODOS' || item.status_carregamento === statusCarregamentoFilter;

    let matchesSpecial = true;
    if (filterSpecial === 'SEM_EMBARQUE') {
      matchesSpecial = !item.embarque_cod || item.embarque_cod.trim() === '';
    } else if (filterSpecial === 'ATRASO_1LOJA') {
      matchesSpecial = item.status_primeira_loja === 'ATRASO';
    } else if (filterSpecial === 'RESTRITOS') {
      matchesSpecial = Boolean(item.motorista_restrito);
    } else if (filterSpecial === 'GOBRAX_PENDENTE') {
      matchesSpecial = item.vinculo_gobrax === 'DESVINCULADO';
    }

    return matchesSearch && matchesDoca && matchesStatus && matchesSpecial;
  });

  // Contadores para os filtros rápidos
  const countSemEmbarque = distribuicoes.filter(d => !d.embarque_cod || d.embarque_cod.trim() === '').length;
  const countAtraso1Loja = distribuicoes.filter(d => d.status_primeira_loja === 'ATRASO').length;
  const countRestritos = distribuicoes.filter(d => d.motorista_restrito).length;
  const countGobraxDesv = distribuicoes.filter(d => d.vinculo_gobrax === 'DESVINCULADO').length;

  return (
    <div className="space-y-4">
      {/* Lista suspensa invisível para autocompletion de placas */}
      <datalist id="placas-conhecidas">
        {BASE_PLACAS_CONHECIDAS.map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {/* Barra de Filtros e Ações Rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-zinc-900/60 backdrop-blur-md p-3.5 rounded-xl border border-white/[0.08] shadow-subtle">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="flex items-center bg-zinc-900 border border-white/[0.08] rounded-lg px-2.5 py-1.5 w-64 shadow-sm">
            <Search className="w-3.5 h-3.5 text-zinc-400 mr-2" />
            <input
              type="text"
              id="search-distribuicao"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar rota, placa... (Ctrl+K)"
              aria-label="Buscar na tabela de distribuição"
              className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none w-full"
            />
          </div>

          {/* Doca Filter */}
          <div className="flex items-center bg-zinc-900 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-zinc-300">
            <Filter className="w-3.5 h-3.5 text-zinc-400 mr-1.5" />
            <select
              value={docaFilter}
              onChange={(e) => setDocaFilter(e.target.value)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todas as Docas</option>
              {docas.map(d => (
                <option key={d} value={d}>Doca {d}</option>
              ))}
            </select>
          </div>

          {/* Status Carregamento */}
          <div className="flex items-center bg-zinc-900 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-zinc-300">
            <select
              value={statusCarregamentoFilter}
              onChange={(e) => setStatusCarregamentoFilter(e.target.value)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Doca">Em Doca</option>
              <option value="Carregando">Carregando</option>
              <option value="Liberado">Liberado</option>
              <option value="Em Viagem">Em Viagem</option>
            </select>
          </div>
        </div>

        {/* Botão Nova Rota */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartAdd}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-glow-emerald"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Adicionar Rota</span>
          </button>
        </div>
      </div>

      {/* Badges de Filtros Críticos Operacionais (Angela & JC) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <button
          onClick={() => setFilterSpecial('TODOS')}
          className={`px-3 py-1 rounded-lg border font-medium transition ${
            filterSpecial === 'TODOS'
              ? 'bg-zinc-800 text-white border-white/20 shadow-sm'
              : 'bg-zinc-900/60 text-zinc-400 border-white/[0.06] hover:bg-zinc-800'
          }`}
        >
          Todas as Rotas ({distribuicoes.length})
        </button>

        <button
          onClick={() => setFilterSpecial('SEM_EMBARQUE')}
          className={`px-3 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 ${
            filterSpecial === 'SEM_EMBARQUE'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
              : countSemEmbarque > 0
                ? 'bg-amber-950/20 text-amber-400 border-amber-500/30 hover:bg-amber-950/40'
                : 'bg-zinc-900/60 text-zinc-400 border-white/[0.06]'
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>⚠️ Sem Embarque RCS ({countSemEmbarque})</span>
        </button>

        <button
          onClick={() => setFilterSpecial('ATRASO_1LOJA')}
          className={`px-3 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 ${
            filterSpecial === 'ATRASO_1LOJA'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
              : countAtraso1Loja > 0
                ? 'bg-rose-950/20 text-rose-400 border-rose-500/30 hover:bg-rose-950/40'
                : 'bg-zinc-900/60 text-zinc-400 border-white/[0.06]'
          }`}
        >
          <Clock className="w-3 h-3 text-rose-400" />
          <span>🔴 Atraso 1ª Loja ({countAtraso1Loja})</span>
        </button>

        <button
          onClick={() => setFilterSpecial('RESTRITOS')}
          className={`px-3 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 ${
            filterSpecial === 'RESTRITOS'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
              : countRestritos > 0
                ? 'bg-purple-950/20 text-purple-400 border-purple-500/30'
                : 'bg-zinc-900/60 text-zinc-400 border-white/[0.06]'
          }`}
        >
          <UserX className="w-3 h-3 text-purple-400" />
          <span>⚠️ Motoristas Restritos ({countRestritos})</span>
        </button>

        <button
          onClick={() => setFilterSpecial('GOBRAX_PENDENTE')}
          className={`px-3 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 ${
            filterSpecial === 'GOBRAX_PENDENTE'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
              : 'bg-zinc-900/60 text-zinc-400 border-white/[0.06]'
          }`}
        >
          <Radio className="w-3 h-3 text-sky-400" />
          <span>Gobrax Desvinculado ({countGobraxDesv})</span>
        </button>
      </div>

      {/* Modal / Linha de Adição de Nova Rota */}
      {isAdding && (
        <div className="bg-zinc-900 border border-emerald-500/40 rounded-xl p-4 shadow-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-3 border-b border-white/[0.08] pb-2">
            <h3 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Nova Rota no Esquema de Carregamento
            </h3>
            <button onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-zinc-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveNew} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Embarque RCS</label>
              <input
                type="text"
                placeholder="Ex: 899120"
                value={newForm.embarque_cod}
                onChange={(e) => setNewForm({ ...newForm, embarque_cod: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Rota *</label>
              <input
                required
                type="text"
                placeholder="Ex: ON720M"
                value={newForm.rota}
                onChange={(e) => setNewForm({ ...newForm, rota: e.target.value.toUpperCase() })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 font-mono uppercase"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Doca</label>
              <input
                type="text"
                placeholder="Ex: 12"
                value={newForm.doca}
                onChange={(e) => setNewForm({ ...newForm, doca: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Hora Encoste</label>
              <input
                type="time"
                value={newForm.hora_encoste_previsto}
                onChange={(e) => setNewForm({ ...newForm, hora_encoste_previsto: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Tipo Veículo</label>
              <select
                value={newForm.tipo_veiculo}
                onChange={(e) => setNewForm({ ...newForm, tipo_veiculo: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200"
              >
                <option value="CARRETA">CARRETA</option>
                <option value="TRUCK">TRUCK</option>
                <option value="TOCO">TOCO</option>
                <option value="3/4">3/4</option>
                <option value="VAN">VAN</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Placa Cavalo</label>
              <input
                type="text"
                list="placas-conhecidas"
                placeholder="Ex: FYR6A78"
                value={newForm.placa_cavalo}
                onChange={(e) => setNewForm({ ...newForm, placa_cavalo: e.target.value.toUpperCase() })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 font-mono uppercase"
              />
            </div>

            {newForm.tipo_veiculo === 'CARRETA' && (
              <div>
                <label className="text-sky-400 block mb-1 font-medium">Placa Carreta</label>
                <input
                  type="text"
                  list="placas-conhecidas"
                  placeholder="Ex: BXZ4D12"
                  value={newForm.placa_carreta || ''}
                  onChange={(e) => setNewForm({ ...newForm, placa_carreta: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-950 border border-sky-500/30 rounded px-2.5 py-1.5 text-sky-200 font-mono uppercase"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="text-zinc-400 block mb-1 font-medium">Sequência de Lojas</label>
              <input
                type="text"
                placeholder="Ex: VOT - SOR - TAT"
                value={newForm.lojas}
                onChange={(e) => setNewForm({ ...newForm, lojas: e.target.value.toUpperCase() })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 uppercase"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Previsto 1ª Loja</label>
              <input
                type="time"
                value={newForm.horario_primeira_entrega}
                onChange={(e) => setNewForm({ ...newForm, horario_primeira_entrega: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Motorista</label>
              <input
                type="text"
                placeholder="Ex: VIEIRA"
                value={newForm.motorista_nome}
                onChange={(e) => setNewForm({ ...newForm, motorista_nome: e.target.value.toUpperCase() })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 uppercase"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="motorista_restrito_check"
                checked={Boolean(newForm.motorista_restrito)}
                onChange={(e) => setNewForm({ ...newForm, motorista_restrito: e.target.checked })}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
              />
              <label htmlFor="motorista_restrito_check" className="text-xs text-amber-300 font-medium">
                Condutor Restrito (Ajudante Obrigatório)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 col-span-2 sm:col-span-4 lg:col-span-6 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-glow-emerald"
              >
                Cadastrar Rota
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela de Distribuição com Edição Inline Rápida e Layout 100% Ajustado à Tela */}
      <div className="bg-zinc-900/60 rounded-xl border border-white/[0.08] overflow-hidden shadow-subtle">
        <div className="w-full overflow-x-auto xl:overflow-x-hidden">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '8%' }} /> {/* Embarque RCS */}
              <col style={{ width: '3.5%' }} /> {/* Doca */}
              <col style={{ width: '4.5%' }} /> {/* Encoste */}
              <col style={{ width: '5.5%' }} /> {/* Rota */}
              <col style={{ width: '21%' }} /> {/* Lojas (Sequência) */}
              <col style={{ width: '10.5%' }} /> {/* 1ª Loja */}
              <col style={{ width: '5.5%' }} /> {/* Veículo */}
              <col style={{ width: '9%' }} /> {/* Placas */}
              <col style={{ width: '4.5%' }} /> {/* Gobrax */}
              <col style={{ width: '11%' }} /> {/* Motorista */}
              <col style={{ width: '4%' }} /> {/* Pirôm. */}
              <col style={{ width: '3.5%' }} /> {/* Cx */}
              <col style={{ width: '4.5%' }} /> {/* Saída */}
              <col style={{ width: '6.5%' }} /> {/* Status */}
              <col style={{ width: '2.5%' }} /> {/* Ações */}
            </colgroup>
            <thead>
              <tr className="bg-zinc-950/80 text-zinc-400 border-b border-white/[0.08] font-semibold uppercase tracking-wider text-[9px] 2xl:text-[10px]">
                <th className="py-2.5 px-1 text-center font-bold">Embarque RCS</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Doca</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Encoste</th>
                <th className="py-2.5 px-1 font-bold">Rota</th>
                <th className="py-2.5 px-2 font-bold">Lojas (Sequência)</th>
                <th className="py-2.5 px-1 text-center font-bold">1ª Loja (Prev vs Real)</th>
                <th className="py-2.5 px-1 text-center font-bold">Veículo</th>
                <th className="py-2.5 px-1 font-bold">Placas</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Gobrax</th>
                <th className="py-2.5 px-1 font-bold">Motorista</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Pirôm.</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Cx</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Saída</th>
                <th className="py-2.5 px-1 text-center font-bold">Status</th>
                <th className="py-2.5 px-0.5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-zinc-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-zinc-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30 text-sky-400" />
                    Nenhuma rota localizada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const hasNoEmbarque = !item.embarque_cod || item.embarque_cod.trim() === '' || item.embarque_cod.toUpperCase() === 'SEM EMBARQUE';
                  const hasAtraso1Loja = item.status_primeira_loja === 'ATRASO';
                  const isCarreta = item.tipo_veiculo === 'CARRETA' || Boolean(item.placa_carreta && item.placa_carreta.trim());

                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-zinc-800/40 transition group ${
                        hasNoEmbarque ? 'bg-amber-950/[0.07]' : ''
                      }`}
                    >
                      {/* EMBARQUE RCS (Padrão SEM EMBARQUE editável com 1 clique) */}
                      <td className="py-1.5 px-1 font-mono">
                        <input
                          type="text"
                          value={item.embarque_cod && item.embarque_cod !== 'SEM EMBARQUE' ? item.embarque_cod : ''}
                          onChange={(e) => handleQuickInlineUpdate(item, 'embarque_cod', e.target.value.trim())}
                          onBlur={(e) => handleQuickInlineUpdate(item, 'embarque_cod', e.target.value.trim(), true)}
                          placeholder="SEM EMBARQUE"
                          aria-label={`Embarque RCS rota ${item.rota}`}
                          className={`w-full text-center rounded px-1 py-1 text-[9px] 2xl:text-[10px] font-bold font-mono transition border ${
                            hasNoEmbarque
                              ? 'bg-amber-500/15 border-amber-500/35 text-amber-300 placeholder:text-amber-400/90 placeholder:font-bold hover:bg-amber-500/25 focus:border-emerald-500'
                              : 'bg-zinc-950/70 border-white/[0.08] hover:border-white/[0.2] text-zinc-100 focus:border-emerald-500'
                          }`}
                          title="Clique para digitar o número de Embarque RCS"
                        />
                      </td>

                      {/* DOCA */}
                      <td className="py-1.5 px-0.5 text-center font-mono font-bold text-zinc-300">
                        <input
                          type="text"
                          value={item.doca || ''}
                          onChange={(e) => handleQuickInlineUpdate(item, 'doca', e.target.value)}
                          onBlur={(e) => handleQuickInlineUpdate(item, 'doca', e.target.value, true)}
                          placeholder="-"
                          aria-label={`Doca rota ${item.rota}`}
                          className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-0.5 py-1 text-center w-full font-mono text-[10px] text-zinc-200 focus:border-emerald-500"
                          title="Doca"
                        />
                      </td>

                      {/* ENCOSTE PREVISTO */}
                      <td className="py-1.5 px-0.5 text-center font-mono text-[10px] text-zinc-300 whitespace-nowrap">
                        {item.hora_encoste_previsto || '--:--'}
                      </td>

                      {/* ROTA */}
                      <td className="py-1.5 px-1 font-bold text-zinc-100 font-mono text-[10px] 2xl:text-[11px] whitespace-nowrap truncate" title={item.rota}>
                        {item.rota}
                      </td>

                      {/* LOJAS */}
                      <td className="py-1.5 px-2 overflow-hidden">
                        <div className="text-emerald-400 font-medium text-[10px] 2xl:text-[11px] truncate" title={item.lojas || item.primeira_entrega || '-'}>
                          {item.lojas || item.primeira_entrega || '-'}
                        </div>
                      </td>

                      {/* 1ª LOJA: PREVISTO VS REAL COM CÁLCULO DE ATRASO (JC) */}
                      <td className="py-1.5 px-1 text-center whitespace-nowrap overflow-hidden">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-zinc-400 text-[10px]" title="Horário Previsto 1ª Loja">
                            {item.horario_primeira_entrega || '--:--'}
                          </span>
                          <span className="text-zinc-600 text-[9px]">→</span>
                          <input
                            type="time"
                            value={item.horario_real_primeira_loja || ''}
                            onChange={(e) => handleQuickInlineUpdate(item, 'horario_real_primeira_loja', e.target.value)}
                            className="bg-zinc-950 border border-white/[0.1] rounded px-1 py-0.5 text-[9px] 2xl:text-[10px] font-mono text-zinc-200 w-13 text-center focus:border-emerald-500"
                            title="Horário real de chegada na 1ª loja"
                          />
                          {item.horario_real_primeira_loja && (
                            <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${
                              hasAtraso1Loja 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`} title={hasAtraso1Loja ? 'Atraso na 1ª Loja' : 'Conforme 1ª Loja'}>
                              {hasAtraso1Loja ? 'ATRASO' : 'OK'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* VEÍCULO (SELECT COMPACTO) */}
                      <td className="py-1.5 px-1 text-center">
                        <select
                          value={item.tipo_veiculo || 'TRUCK'}
                          onChange={(e) => handleQuickInlineUpdate(item, 'tipo_veiculo', e.target.value, true)}
                          className="bg-zinc-900 border border-white/[0.06] hover:border-white/[0.15] rounded px-1 py-1 text-[9px] font-bold text-zinc-300 cursor-pointer focus:border-emerald-500 w-full"
                          title="Selecione o tipo de veículo"
                          aria-label={`Tipo de veículo rota ${item.rota}`}
                        >
                          <option value="TRUCK">TRUCK</option>
                          <option value="CARRETA">CARRETA</option>
                          <option value="TOCO">TOCO</option>
                          <option value="3/4">3/4</option>
                          <option value="VUC">VUC</option>
                          <option value="VAN">VAN</option>
                        </select>
                      </td>

                      {/* PLACAS (DUAS PLACAS: CAVALO E CARRETA SE CARRETA) */}
                      <td className="py-1.5 px-1 font-mono text-[10px]">
                        {isCarreta ? (
                          <div className="flex flex-col gap-0.5 w-full">
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter w-2.5 shrink-0">C:</span>
                              <input
                                type="text"
                                list="placas-conhecidas"
                                value={item.placa_cavalo || ''}
                                onChange={(e) => handleQuickInlineUpdate(item, 'placa_cavalo', e.target.value.toUpperCase())}
                                onBlur={(e) => handleQuickInlineUpdate(item, 'placa_cavalo', e.target.value.toUpperCase(), true)}
                                placeholder="Cavalo"
                                aria-label={`Placa Cavalo rota ${item.rota}`}
                                className="bg-zinc-950/80 hover:bg-zinc-900 border border-white/[0.08] focus:border-emerald-500/50 rounded px-1 py-0.5 font-bold text-zinc-200 w-full text-[9px] 2xl:text-[10px] uppercase font-mono transition"
                                title="Placa do Cavalo"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-bold text-sky-400 uppercase tracking-tighter w-2.5 shrink-0">R:</span>
                              <input
                                type="text"
                                list="placas-conhecidas"
                                value={item.placa_carreta || ''}
                                onChange={(e) => handleQuickInlineUpdate(item, 'placa_carreta', e.target.value.toUpperCase())}
                                onBlur={(e) => handleQuickInlineUpdate(item, 'placa_carreta', e.target.value.toUpperCase(), true)}
                                placeholder="Carreta"
                                aria-label={`Placa Carreta rota ${item.rota}`}
                                className="bg-zinc-950/80 hover:bg-zinc-900 border border-white/[0.08] focus:border-sky-500/50 rounded px-1 py-0.5 font-bold text-sky-300 w-full text-[9px] 2xl:text-[10px] uppercase font-mono transition"
                                title="Placa da Carreta"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 w-full">
                            <input
                              type="text"
                              list="placas-conhecidas"
                              value={item.placa_cavalo || ''}
                              onChange={(e) => handleQuickInlineUpdate(item, 'placa_cavalo', e.target.value.toUpperCase())}
                              onBlur={(e) => handleQuickInlineUpdate(item, 'placa_cavalo', e.target.value.toUpperCase(), true)}
                              placeholder="Placa"
                              aria-label={`Placa do veículo rota ${item.rota}`}
                              className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] focus:border-emerald-500/50 rounded px-1 py-1 font-bold text-zinc-200 w-full uppercase font-mono text-[10px] 2xl:text-[11px] transition"
                              title="Placa do veículo"
                            />
                            <button
                              onClick={() => handleQuickInlineUpdate(item, 'placa_carreta', ' ', true)}
                              className="text-[8px] text-zinc-500 hover:text-sky-400 px-1 py-0.5 rounded border border-white/[0.08] shrink-0 transition"
                              title="Adicionar placa de carreta"
                              aria-label="Adicionar placa de carreta"
                            >
                              +R
                            </button>
                          </div>
                        )}
                      </td>

                      {/* GOBRAX */}
                      <td className="py-1.5 px-0.5 text-center">
                        <button
                          onClick={() => {
                            const next = item.vinculo_gobrax === 'VINCULADO' ? 'DESVINCULADO' : 'VINCULADO';
                            handleQuickInlineUpdate(item, 'vinculo_gobrax', next, true);
                          }}
                          aria-label={`Alternar status Gobrax da rota ${item.rota}`}
                          className={`px-1.5 py-1 rounded text-[8px] 2xl:text-[9px] font-bold border transition w-full ${
                            item.vinculo_gobrax === 'VINCULADO'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border-white/[0.06] hover:text-zinc-200'
                          }`}
                          title="Clique para alternar o status Gobrax"
                        >
                          {item.vinculo_gobrax === 'VINCULADO' ? 'VINC.' : 'DESV.'}
                        </button>
                      </td>

                      {/* MOTORISTA (COM ALERTA RESTRITO) */}
                      <td className="py-1.5 px-1 overflow-hidden">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={item.motorista_nome || ''}
                            onChange={(e) => handleQuickInlineUpdate(item, 'motorista_nome', e.target.value.toUpperCase())}
                            onBlur={(e) => handleQuickInlineUpdate(item, 'motorista_nome', e.target.value.toUpperCase(), true)}
                            placeholder="A DEFINIR"
                            aria-label={`Motorista da rota ${item.rota}`}
                            className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-1 py-1 font-medium text-zinc-200 uppercase w-full text-[10px] 2xl:text-[11px] truncate transition focus:bg-zinc-950 focus:border-emerald-500"
                            title={item.motorista_nome || 'Nome do condutor'}
                          />
                          <button
                            onClick={() => handleQuickInlineUpdate(item, 'motorista_restrito', !item.motorista_restrito, true)}
                            aria-label={`Marcar motorista restrito rota ${item.rota}`}
                            className={`p-0.5 rounded text-[8px] shrink-0 ${
                              item.motorista_restrito
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                                : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                            title="Marcar se motorista é restrito (exige ajudante)"
                          >
                            {item.motorista_restrito ? '⚠️' : '•'}
                          </button>
                        </div>
                      </td>

                      {/* PIRÔMETRO */}
                      <td className="py-1.5 px-0.5 text-center font-mono">
                        <input
                          type="text"
                          value={item.pirometro || ''}
                          onChange={(e) => handleQuickInlineUpdate(item, 'pirometro', e.target.value)}
                          onBlur={(e) => handleQuickInlineUpdate(item, 'pirometro', e.target.value, true)}
                          placeholder="--°C"
                          aria-label={`Pirômetro rota ${item.rota}`}
                          className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-0.5 py-1 text-[10px] font-mono text-sky-400 w-full text-center focus:border-emerald-500"
                          title="Medição do pirômetro"
                        />
                      </td>

                      {/* CAIXAS */}
                      <td className="py-1.5 px-0.5 text-center font-mono">
                        <input
                          type="number"
                          value={item.qtd_caixas || ''}
                          onChange={(e) => handleQuickInlineUpdate(item, 'qtd_caixas', parseInt(e.target.value, 10) || 0)}
                          onBlur={(e) => handleQuickInlineUpdate(item, 'qtd_caixas', parseInt(e.target.value, 10) || 0, true)}
                          placeholder="0"
                          aria-label={`Quantidade de caixas rota ${item.rota}`}
                          className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-0.5 py-1 text-[10px] font-mono text-zinc-200 w-full text-center focus:border-emerald-500"
                          title="Quantidade de caixas"
                        />
                      </td>

                      {/* SAÍDA REAL */}
                      <td className="py-1.5 px-0.5 text-center whitespace-nowrap font-mono">
                        <input
                          type="time"
                          value={item.horario_saida_real || item.hora_saida_motorista || ''}
                          onChange={(e) => handleQuickInlineUpdate(item, 'horario_saida_real', e.target.value)}
                          onBlur={(e) => handleQuickInlineUpdate(item, 'horario_saida_real', e.target.value, true)}
                          aria-label={`Horário de saída real rota ${item.rota}`}
                          className="bg-zinc-950 border border-white/[0.1] rounded px-0.5 py-1 text-[9px] 2xl:text-[10px] text-zinc-200 w-13 text-center font-mono focus:border-emerald-500"
                          title="Horário de saída real do veículo"
                        />
                      </td>

                      {/* STATUS CARREGAMENTO */}
                      <td className="py-1.5 px-1 text-center">
                        <select
                          value={item.status_carregamento}
                          onChange={(e) => handleQuickInlineUpdate(item, 'status_carregamento', e.target.value, true)}
                          aria-label={`Status de carregamento rota ${item.rota}`}
                          className={`text-[9px] font-semibold rounded px-1 py-1 border cursor-pointer w-full text-center ${
                            item.status_carregamento === 'Liberado' || item.status_carregamento === 'Em Viagem'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : item.status_carregamento === 'Carregando'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-white/[0.08]'
                          }`}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Em Doca">Em Doca</option>
                          <option value="Carregando">Carregando</option>
                          <option value="Liberado">Liberado</option>
                          <option value="Em Viagem">Em Viagem</option>
                        </select>
                      </td>

                      {/* AÇÕES */}
                      <td className="py-1.5 px-0.5 text-center">
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition"
                          title="Excluir rota"
                          aria-label={`Excluir rota ${item.rota}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
