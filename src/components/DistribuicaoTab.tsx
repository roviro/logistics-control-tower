import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Truck, 
  Clock,
  AlertTriangle,
  Radio,
  Thermometer,
  Box,
  UserCheck,
  CheckCircle2,
  DollarSign,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import { ViagemDistribuicao } from '../types';
import { BASE_PLACAS_CONHECIDAS, avaliarConformidadePrimeiraLoja } from '../utils/jornada';

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

  // Filtros Avançados por Coluna (Item 6)
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState({
    embarque: '',
    doca: '',
    encoste: '',
    rota: '',
    lojas: '',
    primeiraLoja: '',
    tipoVeiculo: '',
    placa: '',
    gobrax: '',
    motorista: '',
    ajudanteFornecedor: '',
    pirometro: '',
    caixas: '',
    saida: '',
    diaria: '',
    statusDiaria: '',
    statusCarregamento: ''
  });

  useEffect(() => {
    if (initialFilterSpecial) {
      setFilterSpecial(initialFilterSpecial);
    }
  }, [initialFilterSpecial]);
  
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
    fornecedor_ajudante: '',
    ajudante_1: '',
    ajudante_2: '',
    horario_primeira_entrega: '',
    horario_real_primeira_loja: '',
    pirometro: '',
    qtd_caixas: 0,
    volume_m3: 0,
    hora_saida_motorista: '',
    horario_saida_real: '',
    data_saida_condutor: '',
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
      fornecedor_ajudante: '',
      ajudante_1: '',
      ajudante_2: '',
      horario_primeira_entrega: '',
      horario_real_primeira_loja: '',
      pirometro: '',
      qtd_caixas: 0,
      volume_m3: 0,
      hora_saida_motorista: '',
      horario_saida_real: '',
      data_saida_condutor: '',
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
      data_saida_condutor: newForm.data_saida_condutor || '',
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
      retorno_previsto: newForm.retorno_previsto || '',
      pirometro: newForm.pirometro || '',
      placa_cavalo: (newForm.placa_cavalo || '').toUpperCase(),
      placa_carreta: (newForm.placa_carreta || '').toUpperCase(),
      vinculo_gobrax: newForm.vinculo_gobrax || 'DESVINCULADO',
      motorista_nome: (newForm.motorista_nome || '').toUpperCase(),
      motorista_restrito: Boolean(newForm.motorista_restrito),
      fornecedor_ajudante: newForm.fornecedor_ajudante || '',
      ajudante_1: newForm.ajudante_1 || '',
      ajudante_2: newForm.ajudante_2 || '',
      observacoes: newForm.observacoes || '',
      valor_diaria: newForm.valor_diaria || 0,
      status_diaria: newForm.status_diaria || 'Pendente',
      status_motorista: newForm.status_motorista || 'OK',
      status_carregamento: newForm.status_carregamento || 'Pendente'
    };

    onSave(newItem);
    setIsAdding(false);
  };

  const handleQuickInlineUpdate = (item: ViagemDistribuicao, field: keyof ViagemDistribuicao, value: any, immediate: boolean = false) => {
    let updated = { ...item, [field]: value };

    if (field === 'horario_real_primeira_loja') {
      const { status } = avaliarConformidadePrimeiraLoja(item.horario_primeira_entrega, value);
      updated.status_primeira_loja = status;
    }

    if (field === 'motorista_restrito' && value === true && !updated.fornecedor_ajudante) {
      updated.fornecedor_ajudante = 'LED';
    }

    if (immediate) {
      onSave(updated);
      return;
    }

    const timerKey = `${item.id}_${String(field)}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }
    debounceTimers.current[timerKey] = setTimeout(() => {
      onSave(updated);
      delete debounceTimers.current[timerKey];
    }, 350);
  };

  // Filtragem Geral + Filtros Especiais + Filtros por Coluna
  const filtered = distribuicoes.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.rota || '').toLowerCase().includes(term) ||
      (item.doca || '').toLowerCase().includes(term) ||
      (item.embarque_cod || '').toLowerCase().includes(term) ||
      (item.lojas || '').toLowerCase().includes(term) ||
      (item.motorista_nome || '').toLowerCase().includes(term) ||
      (item.placa_cavalo || '').toLowerCase().includes(term) ||
      (item.placa_carreta || '').toLowerCase().includes(term) ||
      (item.fornecedor_ajudante || '').toLowerCase().includes(term) ||
      (item.ajudante_1 || '').toLowerCase().includes(term);

    const matchesDoca = docaFilter === 'TODAS' || item.doca === docaFilter;
    const matchesStatus = statusCarregamentoFilter === 'TODOS' || item.status_carregamento === statusCarregamentoFilter;

    let matchesSpecial = true;
    if (filterSpecial === 'SEM_EMBARQUE') {
      matchesSpecial = !item.embarque_cod || item.embarque_cod.trim() === '' || item.embarque_cod.toUpperCase() === 'SEM EMBARQUE';
    } else if (filterSpecial === 'ATRASO_1LOJA') {
      matchesSpecial = item.status_primeira_loja === 'ATRASO';
    } else if (filterSpecial === 'RESTRITOS') {
      matchesSpecial = Boolean(item.motorista_restrito);
    } else if (filterSpecial === 'GOBRAX_PENDENTE') {
      matchesSpecial = item.vinculo_gobrax === 'DESVINCULADO';
    }

    // Filtros por Coluna
    if (colFilters.embarque && !(item.embarque_cod || '').toLowerCase().includes(colFilters.embarque.toLowerCase())) return false;
    if (colFilters.doca && !(item.doca || '').toLowerCase().includes(colFilters.doca.toLowerCase())) return false;
    if (colFilters.encoste && !(item.hora_encoste_previsto || '').toLowerCase().includes(colFilters.encoste.toLowerCase())) return false;
    if (colFilters.rota && !(item.rota || '').toLowerCase().includes(colFilters.rota.toLowerCase())) return false;
    if (colFilters.lojas && !(item.lojas || '').toLowerCase().includes(colFilters.lojas.toLowerCase())) return false;
    if (colFilters.primeiraLoja && !(item.primeira_entrega || '').toLowerCase().includes(colFilters.primeiraLoja.toLowerCase())) return false;
    if (colFilters.tipoVeiculo && !(item.tipo_veiculo || '').toLowerCase().includes(colFilters.tipoVeiculo.toLowerCase())) return false;
    if (colFilters.placa && !((item.placa_cavalo || '').toLowerCase().includes(colFilters.placa.toLowerCase()) || (item.placa_carreta || '').toLowerCase().includes(colFilters.placa.toLowerCase()))) return false;
    if (colFilters.gobrax && !(item.vinculo_gobrax || '').toLowerCase().includes(colFilters.gobrax.toLowerCase())) return false;
    if (colFilters.motorista && !(item.motorista_nome || '').toLowerCase().includes(colFilters.motorista.toLowerCase())) return false;
    if (colFilters.ajudanteFornecedor && !(item.fornecedor_ajudante || item.ajudante_1 || '').toLowerCase().includes(colFilters.ajudanteFornecedor.toLowerCase())) return false;
    if (colFilters.pirometro && !(item.pirometro || '').toLowerCase().includes(colFilters.pirometro.toLowerCase())) return false;
    if (colFilters.caixas && !String(item.qtd_caixas || '').includes(colFilters.caixas)) return false;
    if (colFilters.saida && !((item.horario_saida_real || item.hora_saida_motorista || '').toLowerCase().includes(colFilters.saida.toLowerCase()) || (item.data_saida_condutor || '').includes(colFilters.saida))) return false;
    if (colFilters.diaria && !(item.status_diaria || '').toLowerCase().includes(colFilters.diaria.toLowerCase()) && !String(item.valor_diaria || '').includes(colFilters.diaria)) return false;
    if (colFilters.statusCarregamento && !(item.status_carregamento || '').toLowerCase().includes(colFilters.statusCarregamento.toLowerCase())) return false;

    return matchesSearch && matchesDoca && matchesStatus && matchesSpecial;
  });

  // Ordenação Padrão por Horário de Encoste e Doca (Item 9)
  const sortedAndFiltered = [...filtered].sort((a, b) => {
    const encA = a.hora_encoste_previsto || '99:99';
    const encB = b.hora_encoste_previsto || '99:99';
    if (encA !== encB) return encA.localeCompare(encB);
    const docaA = parseInt(a.doca, 10) || 999;
    const docaB = parseInt(b.doca, 10) || 999;
    return docaA - docaB;
  });

  // Contadores para os filtros rápidos
  const countSemEmbarque = distribuicoes.filter(d => !d.embarque_cod || d.embarque_cod.trim() === '' || d.embarque_cod.toUpperCase() === 'SEM EMBARQUE').length;
  const countAtraso1Loja = distribuicoes.filter(d => d.status_primeira_loja === 'ATRASO').length;
  const countRestritos = distribuicoes.filter(d => d.motorista_restrito).length;
  const countGobraxDesv = distribuicoes.filter(d => d.vinculo_gobrax === 'DESVINCULADO').length;

  const totalCaixas = sortedAndFiltered.reduce((acc, d) => acc + (d.qtd_caixas || 0), 0);
  const totalVolumeM3 = sortedAndFiltered.reduce((acc, d) => acc + (d.volume_m3 || 0), 0);
  const totalDiarias = sortedAndFiltered.reduce((acc, d) => acc + (d.valor_diaria || 0), 0);

  const activeColFiltersCount = Object.values(colFilters).filter(Boolean).length;

  const clearColFilters = () => {
    setColFilters({
      embarque: '',
      doca: '',
      encoste: '',
      rota: '',
      lojas: '',
      primeiraLoja: '',
      tipoVeiculo: '',
      placa: '',
      gobrax: '',
      motorista: '',
      ajudanteFornecedor: '',
      pirometro: '',
      caixas: '',
      saida: '',
      diaria: '',
      statusDiaria: '',
      statusCarregamento: ''
    });
  };

  return (
    <div className="space-y-4">
      {/* Datalist para autocompletion de placas */}
      <datalist id="placas-conhecidas">
        {BASE_PLACAS_CONHECIDAS.map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {/* Barra de Filtros e Ações Rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-zinc-900/60 backdrop-blur-md p-3 rounded-xl border border-white/[0.08] shadow-subtle">
        
        {/* Lado Esquerdo: Busca Geral e Filtro por Doca */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar rota, motorista, loja, placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition"
            />
          </div>

          {/* Doca Selector */}
          <select
            value={docaFilter}
            onChange={(e) => setDocaFilter(e.target.value)}
            className="bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          >
            <option value="TODAS">Todas as Docas ({distribuicoes.length})</option>
            {docas.map(d => (
              <option key={d} value={d}>Doca {d}</option>
            ))}
          </select>

          {/* Botão Alternar Filtros por Coluna (Item 6) */}
          <button
            onClick={() => setShowColFilters(!showColFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              showColFilters || activeColFiltersCount > 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/[0.08]'
            }`}
            title="Exibir filtros individuais em cada coluna da tabela"
          >
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filtros Colunas</span>
            {activeColFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500 text-zinc-950 font-bold">
                {activeColFiltersCount}
              </span>
            )}
          </button>

          {activeColFiltersCount > 0 && (
            <button
              onClick={clearColFilters}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
              title="Limpar todos os filtros de colunas"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Lado Direito: Filtros Especiais e Botão Adicionar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pills de Filtro Rápido */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-white/[0.06] text-xs">
            <button
              onClick={() => setFilterSpecial('TODOS')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filterSpecial === 'TODOS' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos ({distribuicoes.length})
            </button>

            <button
              onClick={() => setFilterSpecial('SEM_EMBARQUE')}
              className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 ${
                filterSpecial === 'SEM_EMBARQUE' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400 hover:text-amber-300'
              }`}
              title="Rotas sem número de Embarque RCS"
            >
              <span>S/ Embarque</span>
              {countSemEmbarque > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {countSemEmbarque}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterSpecial('ATRASO_1LOJA')}
              className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 ${
                filterSpecial === 'ATRASO_1LOJA' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-zinc-400 hover:text-rose-300'
              }`}
              title="Rotas com atraso de chegada na 1ª Loja (JC)"
            >
              <span>Atraso 1ª</span>
              {countAtraso1Loja > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold animate-pulse">
                  {countAtraso1Loja}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterSpecial('RESTRITOS')}
              className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 ${
                filterSpecial === 'RESTRITOS' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400 hover:text-amber-300'
              }`}
              title="Condutores restritos com obrigatoriedade de ajudante"
            >
              <span>Restritos</span>
              {countRestritos > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  {countRestritos}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleStartAdd}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-xs font-semibold shadow-glow-emerald transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova Rota</span>
          </button>
        </div>
      </div>

      {/* Formulário Modal de Criação */}
      {isAdding && (
        <form onSubmit={handleSaveNew} className="bg-zinc-900 border border-white/[0.1] rounded-xl p-4 shadow-elevated space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              Adicionar Nova Rota de Distribuição
            </h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-zinc-200">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Embarque RCS</label>
              <input
                type="text"
                placeholder="Opcional"
                value={newForm.embarque_cod}
                onChange={(e) => setNewForm({ ...newForm, embarque_cod: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Rota *</label>
              <input
                type="text"
                required
                placeholder="Ex: ON611M"
                value={newForm.rota}
                onChange={(e) => setNewForm({ ...newForm, rota: e.target.value.toUpperCase() })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 font-mono uppercase"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Doca</label>
              <input
                type="text"
                placeholder="Ex: 04"
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
                <option value="TRUCK">TRUCK</option>
                <option value="CARRETA">CARRETA</option>
                <option value="TOCO">TOCO</option>
                <option value="3/4">3/4</option>
                <option value="VUC">VUC</option>
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

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Ajudante / Fornecedor</label>
              <select
                value={newForm.fornecedor_ajudante}
                onChange={(e) => setNewForm({ ...newForm, fornecedor_ajudante: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200"
              >
                <option value="">Nenhum / A definir</option>
                <option value="LED">LED</option>
                <option value="RHELP">RHELP</option>
                <option value="PRÓPRIO">PRÓPRIO</option>
                <option value="SEM AJUDANTE">SEM AJUDANTE</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Diária (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newForm.valor_diaria || ''}
                onChange={(e) => setNewForm({ ...newForm, valor_diaria: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-950 border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 font-mono"
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
                Condutor Restrito (Obrigatório Ajudante)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg text-xs transition"
            >
              Salvar Rota
            </button>
          </div>
        </form>
      )}

      {/* Tabela de Distribuição com Edição Inline Rápida e Layout 100% Ajustado à Tela */}
      <div className="bg-zinc-900/60 rounded-xl border border-white/[0.08] overflow-hidden shadow-subtle">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '7%' }} />   {/* Embarque RCS */}
              <col style={{ width: '3.5%' }} /> {/* Doca */}
              <col style={{ width: '4.5%' }} /> {/* Encoste */}
              <col style={{ width: '5.5%' }} /> {/* Rota */}
              <col style={{ width: '17%' }} />  {/* Lojas (Sequência) */}
              <col style={{ width: '9%' }} />   {/* 1ª Loja */}
              <col style={{ width: '5.5%' }} /> {/* Veículo */}
              <col style={{ width: '8.5%' }} /> {/* Placas */}
              <col style={{ width: '4%' }} />   {/* Gobrax */}
              <col style={{ width: '9%' }} />   {/* Motorista */}
              <col style={{ width: '6.5%' }} /> {/* Ajudante (LED/Rhelp) */}
              <col style={{ width: '3.5%' }} /> {/* Pirôm. */}
              <col style={{ width: '3.5%' }} /> {/* Cx */}
              <col style={{ width: '5%' }} />   {/* Saída (Hora/Data) */}
              <col style={{ width: '4.5%' }} /> {/* Diária (R$) */}
              <col style={{ width: '5%' }} />   {/* Status */}
              <col style={{ width: '2.5%' }} /> {/* Ações */}
            </colgroup>

            <thead>
              <tr className="bg-zinc-950/80 text-zinc-400 border-b border-white/[0.08] font-semibold uppercase tracking-wider text-[9px] 2xl:text-[10px]">
                <th className="py-2.5 px-1 text-center font-bold">Embarque</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Doca</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Encoste</th>
                <th className="py-2.5 px-1 font-bold">Rota</th>
                <th className="py-2.5 px-1.5 font-bold">Lojas (Sequência)</th>
                <th className="py-2.5 px-1 text-center font-bold">1ª Loja (Prev/Real)</th>
                <th className="py-2.5 px-1 text-center font-bold">Veículo</th>
                <th className="py-2.5 px-1 font-bold">Placas</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Gobrax</th>
                <th className="py-2.5 px-1 font-bold">Motorista</th>
                <th className="py-2.5 px-1 text-center font-bold text-sky-400">Ajudante</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Pirôm.</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Cx</th>
                <th className="py-2.5 px-0.5 text-center font-bold">Saída</th>
                <th className="py-2.5 px-1 text-center font-bold text-emerald-400">Diária</th>
                <th className="py-2.5 px-1 text-center font-bold">Status</th>
                <th className="py-2.5 px-0.5 text-center"></th>
              </tr>

              {/* Linha de Filtros Dinâmicos por Coluna (Item 6) */}
              {showColFilters && (
                <tr className="bg-zinc-950 text-zinc-300 border-b border-white/[0.08] text-[9px]">
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={colFilters.embarque}
                      onChange={(e) => setColFilters({ ...colFilters, embarque: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-1 py-0.5 text-zinc-200"
                    />
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Doca..."
                      value={colFilters.doca}
                      onChange={(e) => setColFilters({ ...colFilters, doca: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-200 text-center"
                    />
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Hora..."
                      value={colFilters.encoste}
                      onChange={(e) => setColFilters({ ...colFilters, encoste: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-200 text-center"
                    />
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Rota..."
                      value={colFilters.rota}
                      onChange={(e) => setColFilters({ ...colFilters, rota: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-1 py-0.5 text-zinc-200"
                    />
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Loja..."
                      value={colFilters.lojas}
                      onChange={(e) => setColFilters({ ...colFilters, lojas: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-1 py-0.5 text-zinc-200"
                    />
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="1ª..."
                      value={colFilters.primeiraLoja}
                      onChange={(e) => setColFilters({ ...colFilters, primeiraLoja: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-200 text-center"
                    />
                  </th>
                  <th className="p-0.5">
                    <select
                      value={colFilters.tipoVeiculo}
                      onChange={(e) => setColFilters({ ...colFilters, tipoVeiculo: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-300 text-[8px]"
                    >
                      <option value="">TODOS</option>
                      <option value="TRUCK">TRUCK</option>
                      <option value="CARRETA">CARRETA</option>
                      <option value="TOCO">TOCO</option>
                      <option value="3/4">3/4</option>
                      <option value="VUC">VUC</option>
                    </select>
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Placa..."
                      value={colFilters.placa}
                      onChange={(e) => setColFilters({ ...colFilters, placa: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-1 py-0.5 text-zinc-200"
                    />
                  </th>
                  <th className="p-0.5">
                    <select
                      value={colFilters.gobrax}
                      onChange={(e) => setColFilters({ ...colFilters, gobrax: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-300 text-[8px]"
                    >
                      <option value="">TODOS</option>
                      <option value="VINCULADO">VINC</option>
                      <option value="DESVINCULADO">DESV</option>
                    </select>
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Motorista..."
                      value={colFilters.motorista}
                      onChange={(e) => setColFilters({ ...colFilters, motorista: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-1 py-0.5 text-zinc-200"
                    />
                  </th>
                  <th className="p-0.5">
                    <select
                      value={colFilters.ajudanteFornecedor}
                      onChange={(e) => setColFilters({ ...colFilters, ajudanteFornecedor: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-300 text-[8px]"
                    >
                      <option value="">TODOS</option>
                      <option value="LED">LED</option>
                      <option value="RHELP">RHELP</option>
                      <option value="PRÓPRIO">PRÓPRIO</option>
                      <option value="SEM AJUDANTE">S/ AJUD</option>
                    </select>
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="°C..."
                      value={colFilters.pirometro}
                      onChange={(e) => setColFilters({ ...colFilters, pirometro: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-200 text-center"
                    />
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Cx..."
                      value={colFilters.caixas}
                      onChange={(e) => setColFilters({ ...colFilters, caixas: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-200 text-center"
                    />
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Saída..."
                      value={colFilters.saida}
                      onChange={(e) => setColFilters({ ...colFilters, saida: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-200 text-center"
                    />
                  </th>
                  <th className="p-0.5">
                    <input
                      type="text"
                      placeholder="Diária..."
                      value={colFilters.diaria}
                      onChange={(e) => setColFilters({ ...colFilters, diaria: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-200 text-center"
                    />
                  </th>
                  <th className="p-0.5">
                    <select
                      value={colFilters.statusCarregamento}
                      onChange={(e) => setColFilters({ ...colFilters, statusCarregamento: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/[0.06] rounded px-0.5 py-0.5 text-zinc-300 text-[8px]"
                    >
                      <option value="">TODOS</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Em Doca">Em Doca</option>
                      <option value="Carregando">Carregando</option>
                      <option value="Liberado">Liberado</option>
                      <option value="Em Viagem">Em Viagem</option>
                    </select>
                  </th>
                  <th className="p-0.5"></th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-white/[0.06] text-zinc-200">
              {sortedAndFiltered.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-zinc-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30 text-sky-400" />
                    Nenhuma rota localizada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sortedAndFiltered.map((item) => {
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
                      {/* EMBARQUE RCS */}
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

                      {/* HORA ENCOSTE */}
                      <td className="py-1.5 px-0.5 text-center font-mono">
                        <input
                          type="time"
                          value={item.hora_encoste_previsto || ''}
                          onChange={(e) => handleQuickInlineUpdate(item, 'hora_encoste_previsto', e.target.value)}
                          onBlur={(e) => handleQuickInlineUpdate(item, 'hora_encoste_previsto', e.target.value, true)}
                          aria-label={`Hora de encoste da rota ${item.rota}`}
                          className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-0.5 py-1 text-center w-full font-mono font-bold text-[10px] text-amber-400 focus:border-emerald-500"
                          title="Horário previsto de encoste na doca"
                        />
                      </td>

                      {/* ROTA */}
                      <td className="py-1.5 px-1 font-mono font-bold text-zinc-100 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="text-emerald-400 text-[10px] 2xl:text-[11px]">{item.rota}</span>
                          {item.volume_m3 ? (
                            <span className="text-[8px] text-zinc-500 font-normal">({item.volume_m3.toFixed(1)}m³)</span>
                          ) : null}
                        </div>
                      </td>

                      {/* LOJAS (SEQUÊNCIA) */}
                      <td className="py-1.5 px-1.5 overflow-hidden">
                        <input
                          type="text"
                          value={item.lojas || ''}
                          onChange={(e) => handleQuickInlineUpdate(item, 'lojas', e.target.value.toUpperCase())}
                          onBlur={(e) => handleQuickInlineUpdate(item, 'lojas', e.target.value.toUpperCase(), true)}
                          placeholder="Ex: VOT - SOR - TAT"
                          aria-label={`Sequência de lojas da rota ${item.rota}`}
                          className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-1 py-1 font-semibold text-zinc-200 w-full text-[10px] 2xl:text-[11px] truncate uppercase transition focus:bg-zinc-950 focus:border-emerald-500"
                          title={item.lojas || 'Sequência de lojas'}
                        />
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

                      {/* AJUDANTE: FORNECEDOR (LED OU RHELP) - ITEM 5 */}
                      <td className="py-1.5 px-0.5 text-center">
                        <select
                          value={item.fornecedor_ajudante || ''}
                          onChange={(e) => handleQuickInlineUpdate(item, 'fornecedor_ajudante', e.target.value, true)}
                          className={`w-full text-[8.5px] 2xl:text-[9px] font-bold rounded px-1 py-1 border transition cursor-pointer ${
                            item.fornecedor_ajudante === 'LED'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : item.fornecedor_ajudante === 'RHELP'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                : item.fornecedor_ajudante === 'PRÓPRIO'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : item.motorista_restrito
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                    : 'bg-zinc-900 text-zinc-400 border-white/[0.06]'
                          }`}
                          title={item.motorista_restrito && !item.fornecedor_ajudante ? 'Motorista restrito: selecione o ajudante LED ou RHELP' : 'Fornecedor do Ajudante'}
                        >
                          <option value="">- AJUD -</option>
                          <option value="LED">LED</option>
                          <option value="RHELP">RHELP</option>
                          <option value="PRÓPRIO">PRÓP</option>
                          <option value="SEM AJUDANTE">S/ AJUD</option>
                        </select>
                      </td>

                      {/* PIRÔMETRO */}
                      <td className="py-1.5 px-0.5 text-center font-mono">
                        <input
                          type="text"
                          value={item.pirometro || ''}
                          onChange={(e) => handleQuickInlineUpdate(item, 'pirometro', e.target.value)}
                          onBlur={(e) => handleQuickInlineUpdate(item, 'pirometro', e.target.value, true)}
                          placeholder="-"
                          aria-label={`Temperatura do pirômetro rota ${item.rota}`}
                          className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.1] rounded px-0.5 py-1 text-[10px] text-zinc-200 w-full text-center font-mono focus:border-emerald-500"
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

                      {/* SAÍDA REAL (HORA + DATA CONDUTOR - ITEM 2) */}
                      <td className="py-1 px-0.5 text-center whitespace-nowrap font-mono">
                        <div className="flex flex-col gap-0.5 items-center">
                          <input
                            type="time"
                            value={item.horario_saida_real || item.hora_saida_motorista || ''}
                            onChange={(e) => handleQuickInlineUpdate(item, 'horario_saida_real', e.target.value)}
                            onBlur={(e) => handleQuickInlineUpdate(item, 'horario_saida_real', e.target.value, true)}
                            aria-label={`Horário de saída real rota ${item.rota}`}
                            className="bg-zinc-950 border border-white/[0.1] rounded px-0.5 py-0.5 text-[9px] 2xl:text-[10px] text-zinc-200 w-13 text-center font-mono focus:border-emerald-500"
                            title="Horário de saída do veículo"
                          />
                          <input
                            type="date"
                            value={item.data_saida_condutor || ''}
                            onChange={(e) => handleQuickInlineUpdate(item, 'data_saida_condutor', e.target.value, true)}
                            className="bg-zinc-950/70 border border-white/[0.06] rounded px-0.5 py-0.2 text-[8px] text-zinc-400 w-15 text-center font-sans focus:border-emerald-500"
                            title="Data efetiva de saída do condutor"
                          />
                        </div>
                      </td>

                      {/* DIÁRIA: VALOR E STATUS (ITEM 7) */}
                      <td className="py-1 px-0.5 text-center font-mono">
                        <div className="flex flex-col gap-0.5 items-center">
                          <input
                            type="number"
                            step="0.01"
                            value={item.valor_diaria || ''}
                            onChange={(e) => handleQuickInlineUpdate(item, 'valor_diaria', parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleQuickInlineUpdate(item, 'valor_diaria', parseFloat(e.target.value) || 0, true)}
                            placeholder="0,00"
                            className="bg-transparent hover:bg-zinc-950 border border-transparent hover:border-white/[0.08] rounded px-0.5 py-0.5 text-[9px] font-bold text-zinc-200 w-12 text-center focus:border-emerald-500"
                            title="Valor da Diária (R$)"
                          />
                          <button
                            onClick={() => {
                              const next = item.status_diaria === 'Pago' ? 'Pendente' : 'Pago';
                              handleQuickInlineUpdate(item, 'status_diaria', next, true);
                            }}
                            className={`px-1 py-0.2 rounded text-[7.5px] font-bold uppercase transition w-12 ${
                              item.status_diaria === 'Pago'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-500 border border-white/[0.04]'
                            }`}
                            title="Alternar status da diária (Pendente / Pago)"
                          >
                            {item.status_diaria === 'Pago' ? 'PAGO' : 'PEND'}
                          </button>
                        </div>
                      </td>

                      {/* STATUS CARREGAMENTO */}
                      <td className="py-1.5 px-0.5 text-center">
                        <select
                          value={item.status_carregamento}
                          onChange={(e) => handleQuickInlineUpdate(item, 'status_carregamento', e.target.value, true)}
                          aria-label={`Status de carregamento rota ${item.rota}`}
                          className={`text-[8.5px] font-semibold rounded px-0.5 py-1 border cursor-pointer w-full text-center ${
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

            {/* Linha de Totais da Distribuição */}
            {sortedAndFiltered.length > 0 && (
              <tfoot className="bg-zinc-950/90 font-bold border-t border-white/[0.1] text-zinc-300 text-[10px]">
                <tr>
                  <td colSpan={4} className="py-2.5 px-2 text-right uppercase tracking-wider font-bold text-zinc-400">
                    Total ({sortedAndFiltered.length} Rotas):
                  </td>
                  <td colSpan={7} className="py-2.5 px-2 text-zinc-400">
                    Volume Total: <strong className="text-emerald-400">{totalVolumeM3.toFixed(1)} m³</strong>
                  </td>
                  <td></td>
                  <td className="py-2.5 px-0.5 text-center font-mono text-zinc-100 font-black">
                    {totalCaixas.toLocaleString('pt-BR')}
                  </td>
                  <td></td>
                  <td className="py-2.5 px-0.5 text-center font-mono text-emerald-400 font-bold">
                    R$ {totalDiarias.toFixed(2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
