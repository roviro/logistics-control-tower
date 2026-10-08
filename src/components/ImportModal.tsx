import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Clipboard, 
  Bot, 
  Copy, 
  Check, 
  X, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  PlusCircle, 
  Ban,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  ArrowLeft,
  Truck,
  Radio
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataOperacao: string;
  onImportSuccess: () => void;
}

interface PreviaItem {
  id: string;
  tipo: 'DIST' | 'TRANSF';
  rota: string;
  veiculo: string;
  hora: string;
  lojas: string;
  primeira_loja: string;
  hora_1loja: string;
  retorno_previsto: string;
  m3: number;
  caixas: number;
  isConflito: boolean;
  raw: any;
  selected: boolean;
}

const PROMPT_CORPORATIVO_TEXT = `--- SYSTEM PROMPT (Instruções do Sistema) ---
Você é um extrator de dados logísticos de alta precisão especializado em romaneios de transporte e embarque (Embarque Definitivo).
Sua função é analisar páginas de relatórios de carga/entrega e convertê-las em um JSON estritamente válido, sem texto adicional, markdown ou explicações fora do JSON.
Regras de Extração:
1. Extraia o cabeçalho geral (Empresa, Data de Faturamento, CD, Cliente).
2. Para cada bloco de rota (ex: ON611M, SP605M, CP673M, etc.), extraia:
   - Código da Rota e KM total.
   - Informações do transporte: Horário de carregamento, Tipo de veículo, Transportadora e Cross Docking (se houver).
   - Lista de entregas/lojas atendidas na rota (código da loja, sentido/lado como DIR/ESQ/AMB, previsão de entrega, volumes totais e detalhados em Congelado, Resfriado e Seco).
   - Resumo total da rota: Total de volumes, total congelado, resfriado, seco, e cubagem total (M3).
3. Gestão de Duplicadas:
   - Se identificar que a mesma rota aparece mais de uma vez no mesmo documento, registre o código da rota no campo duplicadas_detectadas_no_pdf.
   - Trate os dados das lojas agrupando por rota para evitar linhas duplicadas.

--- USER PROMPT ---
Analise o texto/imagem do romaneio de transporte anexo e extraia todas as informações estruturadas rigorosamente no seguinte schema JSON:
{
  "cabecalho": {
    "empresa": "string",
    "cd": "string",
    "data_faturamento": "YYYY-MM-DD",
    "cliente": "string"
  },
  "rotas": [
    {
      "codigo_rota": "string",
      "km_total": 0.0,
      "horario_carregamento": "HH:MM",
      "tipo_veiculo": "string",
      "transportadora": "string",
      "cross_docking": "string | null",
      "cubagem_m3_total": 0.0,
      "totais": {
        "volume_total": 0,
        "congelado": 0,
        "resfriado": 0,
        "seco": 0
      },
      "entregas": [
        {
          "codigo_loja": "string",
          "sequencia": 1,
          "sentido": "DIR | ESQ | AMB",
          "previsao_entrega": "HH:MM",
          "volumes_congelado": 0,
          "volumes_resfriado": 0,
          "volumes_seco": 0,
          "volumes_total": 0
        }
      ]
    }
  ],
  "duplicadas_detectadas_no_pdf": ["string"]
}

Retorne SOMENTE o JSON. Não inclua crases (\`\`\`json) ou texto antes/depois.`;

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  dataOperacao,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'xlsx' | 'pdf' | 'text' | 'ia'>('xlsx');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [iaJson, setIaJson] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Estados da Prévia Interativa
  const [previaList, setPreviaList] = useState<PreviaItem[] | null>(null);
  const [duplicadasPdf, setDuplicadasPdf] = useState<string[]>([]);
  const [modoConflito, setModoConflito] = useState<'SOBRESCREVER' | 'APENAS_NOVAS'>('SOBRESCREVER');
  const [filtroTipo, setFiltroTipo] = useState<'TODAS' | 'DIST' | 'TRANSF' | 'CONFLITOS'>('TODAS');

  if (!isOpen) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(PROMPT_CORPORATIVO_TEXT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setSelectedFile(files[0] || null);
      setMessage(null);
      setPreviaList(null);
    }
  };

  // Gerar Prévia dos Dados
  const handleGerarPrevia = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      let res: Response;

      if (activeTab === 'xlsx' || activeTab === 'pdf') {
        const filesToUpload = selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : []);
        if (filesToUpload.length === 0) {
          setMessage({ type: 'error', text: 'Selecione ao menos um arquivo para analisar.' });
          setIsLoading(false);
          return;
        }
        const formData = new FormData();
        filesToUpload.forEach(f => formData.append('files', f));
        formData.append('file', filesToUpload[0]);
        formData.append('tipo', activeTab);
        res = await fetch(`/api/import/previa?data=${dataOperacao}`, {
          method: 'POST',
          body: formData
        });
      } else if (activeTab === 'text') {
        if (!pastedText.trim()) {
          setMessage({ type: 'error', text: 'Cole as linhas no campo de texto.' });
          setIsLoading(false);
          return;
        }
        res = await fetch(`/api/import/previa?data=${dataOperacao}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText, tipo: 'text' })
        });
      } else {
        if (!iaJson.trim()) {
          setMessage({ type: 'error', text: 'Cole o JSON gerado pela IA.' });
          setIsLoading(false);
          return;
        }
        res = await fetch(`/api/import/previa?data=${dataOperacao}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json: iaJson, tipo: 'ia' })
        });
      }

      const data = await res.json();

      if (res.ok && data.success && data.status === 'PREVIA') {
        const conflitoSet = new Set((data.rotas_conflitantes || []).map((r: string) => r.toUpperCase()));
        const items: PreviaItem[] = [];

        // Mapear distribuições
        for (const d of data.distribuicoes || []) {
          const cod = (d.rota || d.embarque_cod || '').trim().toUpperCase();
          items.push({
            id: d.id || crypto.randomUUID(),
            tipo: 'DIST',
            rota: cod,
            veiculo: d.tipo_veiculo || 'TRUCK',
            hora: d.hora_encoste_previsto || '',
            lojas: d.lojas || d.primeira_entrega || '',
            primeira_loja: d.primeira_entrega || '',
            hora_1loja: d.horario_primeira_entrega || '',
            retorno_previsto: d.retorno_previsto || '',
            m3: Number(d.volume_m3) || 0,
            caixas: Number(d.qtd_caixas) || 0,
            isConflito: conflitoSet.has(cod),
            raw: d,
            selected: true
          });
        }

        // Mapear transferências
        for (const t of data.transferencias || []) {
          const cod = (t.operacao_rota || '').trim().toUpperCase();
          items.push({
            id: t.id || crypto.randomUUID(),
            tipo: 'TRANSF',
            rota: cod,
            veiculo: 'CARRETA',
            hora: t.horario_pegada || '',
            lojas: t.observacoes_transferencia || 'TRANSFERÊNCIA',
            primeira_loja: '',
            hora_1loja: '',
            retorno_previsto: '',
            m3: 0,
            caixas: 0,
            isConflito: conflitoSet.has(cod),
            raw: t,
            selected: true
          });
        }

        // Ordenar os itens da prévia: rotas de distribuição seguindo cronologia de encoste e sequência original do PDF
        items.sort((a, b) => {
          if (a.tipo !== b.tipo) return a.tipo === 'DIST' ? -1 : 1;
          const encA = a.hora || '99:99';
          const encB = b.hora || '99:99';
          if (encA !== encB) return encA.localeCompare(encB);
          const ordA = a.raw?.ordem ?? 999999;
          const ordB = b.raw?.ordem ?? 999999;
          return ordA - ordB;
        });

        if (items.length === 0) {
          setMessage({
            type: 'warning',
            text: 'Nenhuma rota válida foi identificada no arquivo. Verifique o formato ou use a extração por IA.'
          });
          setPreviaList(null);
        } else {
          setPreviaList(items);
          setDuplicadasPdf(data.duplicadas_detectadas_no_pdf || []);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao gerar prévia do arquivo.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha na conexão com o servidor.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Confirmar e Gravar Rotas Selecionadas
  const handleGravarPrevia = async () => {
    if (!previaList) return;
    const selecionados = previaList.filter(p => p.selected);

    if (selecionados.length === 0) {
      setMessage({ type: 'error', text: 'Selecione ao menos uma rota para importar.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const distToSave = selecionados.filter(p => p.tipo === 'DIST').map((p, idx) => ({
      ...p.raw,
      embarque_cod: '', // SEM EMBARQUE por padrão, inserido manualmente pelo operador
      ordem: p.raw?.ordem ?? (idx + 1)
    }));
    const transfToSave = selecionados.filter(p => p.tipo === 'TRANSF').map(p => p.raw);

    try {
      const res = await fetch(`/api/import/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: dataOperacao,
          modo: modoConflito,
          distribuicoes: distToSave,
          transferencias: transfToSave
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: `Sucesso! Gravadas ${data.imported?.distribuicoes || 0} rotas de distribuição e ${data.imported?.transferencias || 0} transferências.`
        });
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1200);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao gravar rotas.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha de conexão.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Limpar Rotas da data (sujeira)
  const handleLimparRotasDia = async () => {
    const confirm = window.confirm(`Atenção: Deseja apagar todas as rotas de distribuição cadastradas para a data ${dataOperacao}? Esta ação permite limpar registros incorretos e iniciar uma importação limpa.`);
    if (!confirm) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/escalas/rotas?data=${dataOperacao}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Rotas da data ${dataOperacao} limpas com sucesso.` });
        onImportSuccess();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao limpar rotas.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha de conexão.' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = (select: boolean) => {
    if (!previaList) return;
    setPreviaList(previaList.map(p => ({ ...p, selected: select })));
  };

  const toggleItem = (id: string) => {
    if (!previaList) return;
    setPreviaList(previaList.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  // Filtragem na tela de prévia
  const itensExibidos = (previaList || []).filter(item => {
    if (filtroTipo === 'DIST') return item.tipo === 'DIST';
    if (filtroTipo === 'TRANSF') return item.tipo === 'TRANSF';
    if (filtroTipo === 'CONFLITOS') return item.isConflito;
    return true;
  });

  const totalSelecionados = (previaList || []).filter(p => p.selected).length;
  const totalConflitos = (previaList || []).filter(p => p.isConflito).length;
  const totalDist = (previaList || []).filter(p => p.tipo === 'DIST').length;
  const totalTransf = (previaList || []).filter(p => p.tipo === 'TRANSF').length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) { setPreviaList(null); onClose(); } }}
      role="dialog"
      aria-modal="true"
      aria-label="Importar escala preliminar"
    >
      <div className={`bg-zinc-900 border border-white/[0.1] rounded-2xl w-full p-5 shadow-elevated space-y-4 max-h-[92vh] flex flex-col transition-all ${
        previaList ? 'max-w-4xl' : 'max-w-xl'
      }`}>
        
        {/* Topo do Modal */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            {previaList ? (
              <Eye className="w-4 h-4 text-emerald-400" />
            ) : (
              <Upload className="w-4 h-4 text-emerald-400" />
            )}
            <h3 className="text-sm font-semibold text-zinc-100">
              {previaList ? `Prévia da Importação (${dataOperacao})` : `Importar Preliminar da Escala`}
            </h3>
          </div>
          <button 
            onClick={() => { setPreviaList(null); onClose(); }} 
            className="text-zinc-500 hover:text-zinc-300 transition"
            aria-label="Fechar janela"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensagem de Feedback */}
        {message && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 shrink-0 ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
              : message.type === 'warning'
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : message.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* TELA DE PRÉVIA DOS DADOS EXTRAÍDOS */}
        {previaList ? (
          <div className="flex-1 flex flex-col space-y-3.5 overflow-hidden">
            
            {/* Header de Resumo da Prévia */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-zinc-950/80 border border-white/[0.06] text-xs shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                  <Truck className="w-3.5 h-3.5" />
                  {totalDist} Distribuição
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Radio className="w-3.5 h-3.5" />
                  {totalTransf} Transf.
                </span>
                {totalConflitos > 0 && (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {totalConflitos} já cadastradas
                  </span>
                )}
                {duplicadasPdf.length > 0 && (
                  <span className="text-[11px] text-rose-400 font-medium">
                    ({duplicadasPdf.length} duplicadas no PDF)
                  </span>
                )}
              </div>

              {/* Botões Selecionar Todos / Desmarcar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="text-[11px] text-zinc-400 hover:text-emerald-400 font-medium"
                >
                  Marcar Todos
                </button>
                <span className="text-zinc-600">|</span>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 font-medium"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            {/* Filtros da Tabela */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex gap-1.5 text-[11px]">
                <button
                  onClick={() => setFiltroTipo('TODAS')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium ${
                    filtroTipo === 'TODAS' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Todas ({previaList.length})
                </button>
                <button
                  onClick={() => setFiltroTipo('DIST')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium ${
                    filtroTipo === 'DIST' ? 'bg-sky-500/20 text-sky-300' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Distribuição ({totalDist})
                </button>
                <button
                  onClick={() => setFiltroTipo('TRANSF')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium ${
                    filtroTipo === 'TRANSF' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Transferências ({totalTransf})
                </button>
                {totalConflitos > 0 && (
                  <button
                    onClick={() => setFiltroTipo('CONFLITOS')}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      filtroTipo === 'CONFLITOS' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Conflitos ({totalConflitos})
                  </button>
                )}
              </div>

              {/* Seletor de Modo de Gravação quando há Conflitos */}
              {totalConflitos > 0 && (
                <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-amber-500/30 text-[11px]">
                  <span className="text-zinc-400 font-medium px-1">Conflitos:</span>
                  <button
                    type="button"
                    onClick={() => setModoConflito('SOBRESCREVER')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${
                      modoConflito === 'SOBRESCREVER' ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Sobrescrever
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoConflito('APENAS_NOVAS')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${
                      modoConflito === 'APENAS_NOVAS' ? 'bg-emerald-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Pular Existentes
                  </button>
                </div>
              )}
            </div>

            {/* Tabela de Prévia Scrollável */}
            <div className="flex-1 border border-white/[0.08] rounded-xl overflow-auto bg-zinc-950/60 max-h-[46vh]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-zinc-900 sticky top-0 z-10 border-b border-white/[0.08] text-zinc-400 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2 px-2.5 w-8">Sel.</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-2.5">Rota / Operação</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Horário</th>
                    <th className="py-2 px-2">Veículo</th>
                    <th className="py-2 px-2.5">Lojas / Roteiro</th>
                    <th className="py-2 px-2">1ª Loja</th>
                    <th className="py-2 px-2 text-right">M³ / Caixas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-zinc-300 font-mono">
                  {itensExibidos.map(item => (
                    <tr 
                      key={item.id} 
                      onClick={() => toggleItem(item.id)}
                      className={`hover:bg-zinc-900/60 cursor-pointer transition select-none ${
                        item.selected ? 'bg-transparent' : 'opacity-40 line-through'
                      } ${item.isConflito ? 'bg-amber-500/[0.03]' : ''}`}
                    >
                      <td className="py-1.5 px-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => {}}
                          className="rounded border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.tipo === 'DIST' ? 'bg-sky-500/20 text-sky-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-zinc-100">
                        {item.rota}
                      </td>
                      <td className="py-1.5 px-2">
                        {item.isConflito ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Já Existe
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Inédita
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-zinc-400">
                        {item.hora || '-'}
                      </td>
                      <td className="py-1.5 px-2 text-zinc-400 truncate max-w-[80px]">
                        {item.veiculo}
                      </td>
                      <td className="py-1.5 px-2.5 text-zinc-300 font-sans truncate max-w-[200px]" title={item.lojas}>
                        {item.lojas || '-'}
                      </td>
                      <td className="py-1.5 px-2 text-zinc-400">
                        {item.primeira_loja || '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right text-zinc-400">
                        {item.m3 > 0 ? `${item.m3}m³` : item.caixas > 0 ? `${item.caixas} cx` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé da Prévia com Ações */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] shrink-0">
              <button
                type="button"
                onClick={() => setPreviaList(null)}
                className="px-3.5 py-2 rounded-xl border border-white/[0.1] bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar / Escolher Outro</span>
              </button>

              <button
                type="button"
                disabled={isLoading || totalSelecionados === 0}
                onClick={handleGravarPrevia}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-xl text-xs font-bold shadow-glow-emerald transition flex items-center gap-2 active:scale-95"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 stroke-[2.5]" />}
                <span>Confirmar e Gravar ({totalSelecionados} rotas)</span>
              </button>
            </div>

          </div>
        ) : (
          /* TELA INICIAL DE SELEÇÃO DE ARQUIVO */
          <div className="space-y-4">
            {/* Abas de Importação Segmentadas */}
            <div className="grid grid-cols-4 bg-zinc-950 p-1 rounded-xl border border-white/[0.06] text-xs gap-1">
              <button
                onClick={() => { setActiveTab('xlsx'); setSelectedFile(null); setMessage(null); }}
                className={`py-1.5 font-medium rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'xlsx' ? 'bg-zinc-800 text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Excel
              </button>

              <button
                onClick={() => { setActiveTab('pdf'); setSelectedFile(null); setMessage(null); }}
                className={`py-1.5 font-medium rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'pdf' ? 'bg-zinc-800 text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                PDF
              </button>

              <button
                onClick={() => { setActiveTab('text'); setMessage(null); }}
                className={`py-1.5 font-medium rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'text' ? 'bg-zinc-800 text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5 text-amber-400" />
                Colar
              </button>

              <button
                onClick={() => { setActiveTab('ia'); setMessage(null); }}
                className={`py-1.5 font-medium rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'ia' ? 'bg-zinc-800 text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                IA JSON
              </button>
            </div>

            {/* Conteúdo Aba XLSX / PDF */}
            {(activeTab === 'xlsx' || activeTab === 'pdf') && (
              <div className="space-y-3.5">
                <div className="border border-dashed border-white/[0.15] hover:border-emerald-500/60 rounded-xl p-6 text-center cursor-pointer transition bg-zinc-950/60 relative group">
                  <input
                    type="file"
                    multiple
                    accept={activeTab === 'xlsx' ? '.xlsx, .xls' : '.pdf'}
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-7 h-7 text-zinc-500 group-hover:text-emerald-400 mx-auto mb-2 transition" />
                  <p className="text-xs text-zinc-200 font-medium">
                    {selectedFiles.length > 1
                      ? `${selectedFiles.length} arquivos selecionados: ${selectedFiles.map(f => f.name).join(', ')}`
                      : selectedFile 
                        ? selectedFile.name 
                        : `Arraste o arquivo ${activeTab.toUpperCase()} ou clique para selecionar (suporta múltiplos PDFs)`}
                  </p>
                  {selectedFiles.length > 1 && (
                    <p className="text-[10px] text-emerald-400 font-medium mt-1">
                      ✓ A importação manterá rigorosamente a ordem dos arquivos selecionados
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Data alvo: <span className="text-emerald-400 font-mono font-semibold">{dataOperacao}</span>
                  </p>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  🛡️ <strong>Prévia segura:</strong> {activeTab === 'pdf' ? 'Você pode selecionar um ou vários arquivos de preliminares. As rotas serão organizadas exatamente na ordem dos documentos.' : 'O arquivo será analisado e uma tabela com todas as rotas identificadas será exibida para sua conferência antes de salvar no sistema.'}
                </p>

                <button
                  onClick={handleGerarPrevia}
                  disabled={isLoading || (!selectedFile && selectedFiles.length === 0)}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-xl text-xs font-bold shadow-glow-emerald transition flex items-center justify-center gap-2 active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
                  <span>{isLoading ? 'Analisando arquivo(s)...' : `Analisar e Gerar Prévia ${selectedFiles.length > 1 ? `(${selectedFiles.length} arquivos)` : ''}`}</span>
                </button>
              </div>
            )}

            {/* Conteúdo Aba Colar Texto */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <textarea
                  rows={5}
                  placeholder="Cole aqui as linhas copiadas do ERP/Excel..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/[0.08] rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 font-mono"
                />

                <button
                  onClick={handleGerarPrevia}
                  disabled={isLoading || !pastedText.trim()}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-xl text-xs font-bold shadow-glow-emerald transition flex items-center justify-center gap-2 active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
                  <span>{isLoading ? 'Processando texto...' : 'Analisar e Gerar Prévia'}</span>
                </button>
              </div>
            )}

            {/* Conteúdo Aba Extração Inteligente (IA JSON) */}
            {activeTab === 'ia' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/20 border border-purple-500/20">
                  <div>
                    <span className="text-xs font-semibold text-purple-300 block">
                      Extração Estruturada via IA (JSON Mode)
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Copie o prompt padrão para alimentar o ChatGPT, Claude ou Gemini.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[11px] font-medium flex items-center gap-1.5 transition active:scale-95"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? 'Copiado!' : 'Copiar Prompt'}</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  placeholder={`Cole aqui o JSON gerado pela IA (schema com "cabecalho", "rotas" e "duplicadas_detectadas_no_pdf")...`}
                  value={iaJson}
                  onChange={(e) => setIaJson(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/[0.08] rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 font-mono"
                />

                <button
                  onClick={handleGerarPrevia}
                  disabled={isLoading || !iaJson.trim()}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
                  <span>{isLoading ? 'Validando JSON...' : 'Validar e Ver Prévia'}</span>
                </button>
              </div>
            )}

            {/* Zona de Limpeza de Dados (Sujeira) */}
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 block">
                  Limpeza Operacional:
                </span>
                <span className="text-[10px] text-zinc-500">
                  Apague registros corrompidos da data {dataOperacao}
                </span>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleLimparRotasDia}
                className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Rotas Desta Data</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};


