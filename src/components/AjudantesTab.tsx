import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Copy, 
  Check, 
  Clock, 
  Search, 
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { AjudanteOperacao } from '../types';
import { BASE_PRESTADORES_AJUDANTES } from '../utils/jornada';

interface AjudantesTabProps {
  ajudantes: AjudanteOperacao[];
  escalaId: string;
  dataOperacao: string;
  onSave: (item: AjudanteOperacao) => void;
  onDelete: (id: string) => void;
}

export const AjudantesTab: React.FC<AjudantesTabProps> = ({
  ajudantes,
  escalaId,
  dataOperacao,
  onSave,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<AjudanteOperacao>>({
    nome_ajudante: '',
    prestador: 'AJUDANTE LED',
    rota: '',
    motorista_nome: '',
    data_inicio: dataOperacao.split('-').reverse().join('/'),
    horario_inicio: '04:00',
    horario_chegada: '04:00',
    horario_fim: '',
    obs: 'FINALIZADO'
  });

  const handleOpenNew = () => {
    setFormData({
      id: undefined,
      escala_id: escalaId,
      nome_ajudante: '',
      prestador: 'AJUDANTE LED',
      rota: '',
      motorista_nome: '',
      data_inicio: dataOperacao.split('-').reverse().join('/'),
      horario_inicio: '04:00',
      horario_chegada: '04:00',
      horario_fim: '',
      obs: 'FINALIZADO'
    });
    setIsEditing(true);
  };

  const handleEdit = (item: AjudanteOperacao) => {
    setFormData(item);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_ajudante?.trim()) return;

    const itemToSave: AjudanteOperacao = {
      id: formData.id || `ajud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      escala_id: escalaId,
      nome_ajudante: formData.nome_ajudante.toUpperCase().trim(),
      prestador: (formData.prestador || 'AJUDANTE LED').toUpperCase().trim(),
      rota: (formData.rota || '').toUpperCase().trim(),
      motorista_nome: (formData.motorista_nome || '').toUpperCase().trim(),
      data_inicio: formData.data_inicio || dataOperacao.split('-').reverse().join('/'),
      horario_inicio: formData.horario_inicio || '',
      horario_chegada: formData.horario_chegada || '',
      horario_fim: formData.horario_fim || '',
      obs: formData.obs || 'FINALIZADO'
    };

    onSave(itemToSave);
    setIsEditing(false);
  };

  const filteredAjudantes = ajudantes.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.nome_ajudante.toLowerCase().includes(term) ||
      item.prestador.toLowerCase().includes(term) ||
      item.rota.toLowerCase().includes(term) ||
      item.motorista_nome.toLowerCase().includes(term) ||
      item.obs.toLowerCase().includes(term)
    );
  });

  const total = ajudantes.length;
  const countLed = ajudantes.filter(a => a.prestador.includes('LED')).length;
  const countRhelp = ajudantes.filter(a => a.prestador.includes('RHELP')).length;
  const countAusencia = ajudantes.filter(a => 
    a.obs.toUpperCase().includes('AUSÊNCIA') || 
    a.obs.toUpperCase().includes('NÃO SE APRESENTOU')
  ).length;

  const handleCopyWhatsApp = () => {
    const formattedDate = dataOperacao.split('-').reverse().join('/');
    let text = `👥 *CONTROLE DE AJUDANTES - CDFT - ${formattedDate}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (ajudantes.length === 0) {
      text += `_Nenhum ajudante escalado._\n`;
    } else {
      ajudantes.forEach((item, index) => {
        text += `*#${index + 1} - ${item.nome_ajudante}* (${item.prestador})\n`;
        text += `   🚛 *Rota:* ${item.rota || 'N/I'} | *Condutor:* ${item.motorista_nome || 'N/I'}\n`;
        text += `   ⏰ *Horários:* Início ${item.horario_inicio || '--:--'} | Chegada ${item.horario_chegada || '--:--'} | Fim ${item.horario_fim || '--:--'}\n`;
        if (item.obs) {
          text += `   📝 *Status/Obs:* ${item.obs}\n`;
        }
        text += `\n`;
      });
    }

    text += `📊 *Resumo:* Total: ${total} | LED: ${countLed} | RHELP: ${countRhelp}`;
    if (countAusencia > 0) {
      text += ` | ⚠️ Ausências: ${countAusencia}`;
    }
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Torre de Controle Operacional - CDFT_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Operacional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 backdrop-blur-md p-4 rounded-xl border border-white/[0.08] shadow-subtle">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              Controle de Ajudantes & Prestadores
              <span className="text-xs font-normal text-zinc-400">
                ({dataOperacao.split('-').reverse().join('/')})
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Acompanhamento de início, chegada e fim de jornada (Prestadores LED e RHELP) com retorno RCS
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
            title="Copiar escala de ajudantes formatada para o WhatsApp"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
            <span>{copied ? 'Copiado p/ WhatsApp!' : 'Copiar p/ WhatsApp'}</span>
          </button>

          {/* Botão Novo Ajudante */}
          <button
            onClick={handleOpenNew}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-glow-emerald active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Ajudante</span>
          </button>
        </div>
      </div>

      {/* Cards de Indicadores por Prestador */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/[0.08]">
          <span className="text-[11px] text-zinc-400 font-medium uppercase">Total Escalado</span>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">{total}</div>
          <span className="text-[10px] text-zinc-500">em operação hoje</span>
        </div>

        <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-blue-500/20 bg-blue-950/10">
          <span className="text-[11px] text-blue-400 font-medium uppercase flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Ajudante RHELP
          </span>
          <div className="text-xl font-bold font-mono text-blue-300 mt-1">{countRhelp}</div>
          <span className="text-[10px] text-zinc-400">prestador parceiro</span>
        </div>

        <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
          <span className="text-[11px] text-emerald-400 font-medium uppercase flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Ajudante LED
          </span>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-1">{countLed}</div>
          <span className="text-[10px] text-zinc-400">prestador parceiro</span>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          countAusencia > 0 
            ? 'bg-rose-950/20 border-rose-500/40 text-rose-300' 
            : 'bg-zinc-900/60 border-white/[0.08]'
        }`}>
          <span className="text-[11px] font-medium uppercase flex items-center gap-1.5">
            <AlertTriangle className={`w-3.5 h-3.5 ${countAusencia > 0 ? 'text-rose-400' : 'text-zinc-500'}`} />
            Ausências / Não Apresentou
          </span>
          <div className={`text-xl font-bold font-mono mt-1 ${countAusencia > 0 ? 'text-rose-400 font-bold' : 'text-zinc-300'}`}>
            {countAusencia}
          </div>
          <span className="text-[10px] text-zinc-400">
            {countAusencia > 0 ? 'necessita reposição' : '100% presentes'}
          </span>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="flex items-center bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 w-full max-w-md shadow-sm">
        <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por ajudante, prestador, rota ou motorista..."
          className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none w-full"
        />
      </div>

      {/* Tabela de Ajudantes (Exatamente conforme layout da Página 2 do PDF) */}
      <div className="bg-zinc-900/60 rounded-xl border border-white/[0.08] overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-950/80 text-zinc-400 border-b border-white/[0.08] font-semibold uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3">Nome Ajudante</th>
                <th className="px-4 py-3">Prestador</th>
                <th className="px-4 py-3">Rota</th>
                <th className="px-4 py-3">Motorista</th>
                <th className="px-3 py-3 text-center">Data Ini</th>
                <th className="px-3 py-3 text-center">Hora Início</th>
                <th className="px-3 py-3 text-center">Hora Chegada</th>
                <th className="px-3 py-3 text-center">Hora Fim</th>
                <th className="px-4 py-3">Observação / Retorno RCS</th>
                <th className="px-3 py-3 w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-zinc-200">
              {filteredAjudantes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-blue-400" />
                    Nenhum ajudante cadastrado para esta escala.
                    <br />
                    <button
                      onClick={handleOpenNew}
                      className="mt-3 text-xs text-emerald-400 hover:underline font-medium"
                    >
                      + Clique aqui para alocar o primeiro ajudante
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAjudantes.map((item) => {
                  const isAusente = 
                    item.obs.toUpperCase().includes('AUSÊNCIA') || 
                    item.obs.toUpperCase().includes('NÃO SE APRESENTOU');

                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-zinc-800/40 transition group ${
                        isAusente ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 font-bold text-zinc-100">
                        {item.nome_ajudante}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                          item.prestador.includes('RHELP')
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {item.prestador}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                        {item.rota || '—'}
                      </td>

                      <td className="px-4 py-3.5 font-medium text-zinc-200">
                        {item.motorista_nome || '—'}
                      </td>

                      <td className="px-3 py-3.5 text-center font-mono text-zinc-400">
                        {item.data_inicio || '—'}
                      </td>

                      <td className="px-3 py-3.5 text-center font-mono text-zinc-300 font-semibold">
                        {item.horario_inicio || '—'}
                      </td>

                      <td className="px-3 py-3.5 text-center font-mono text-zinc-300 font-semibold">
                        {item.horario_chegada || '—'}
                      </td>

                      <td className="px-3 py-3.5 text-center font-mono text-zinc-300 font-semibold">
                        {item.horario_fim || '—'}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-medium border ${
                          isAusente
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold'
                            : item.obs.toUpperCase().includes('RETORNO')
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-300 border-white/[0.08]'
                        }`}>
                          {item.obs}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 rounded transition"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                            title="Excluir"
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

      {/* Modal de Criação / Edição */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/[0.1] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                {formData.id ? 'Editar Ajudante' : 'Alocar Novo Ajudante'}
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
                    Nome do Ajudante *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.nome_ajudante || ''}
                    onChange={(e) => setFormData({ ...formData, nome_ajudante: e.target.value.toUpperCase() })}
                    placeholder="Ex: ALEXANDRE SILVA"
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Prestador *
                  </label>
                  <select
                    value={formData.prestador}
                    onChange={(e) => setFormData({ ...formData, prestador: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="AJUDANTE LED">AJUDANTE LED</option>
                    <option value="AJUDANTE RHELP">AJUDANTE RHELP</option>
                    <option value="INTERNO CDFT">INTERNO CDFT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Rota Vinculada
                  </label>
                  <input
                    type="text"
                    value={formData.rota || ''}
                    onChange={(e) => setFormData({ ...formData, rota: e.target.value.toUpperCase() })}
                    placeholder="Ex: SP637M"
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nome do Motorista
                  </label>
                  <input
                    type="text"
                    value={formData.motorista_nome || ''}
                    onChange={(e) => setFormData({ ...formData, motorista_nome: e.target.value.toUpperCase() })}
                    placeholder="Ex: VIEIRA"
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Hora Início (Pegada)
                  </label>
                  <input
                    type="time"
                    value={formData.horario_inicio || ''}
                    onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Hora Chegada (Loja)
                  </label>
                  <input
                    type="time"
                    value={formData.horario_chegada || ''}
                    onChange={(e) => setFormData({ ...formData, horario_chegada: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Hora Fim (Largada)
                  </label>
                  <input
                    type="time"
                    value={formData.horario_fim || ''}
                    onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Observação / Status Retorno RCS
                </label>
                <input
                  type="text"
                  list="obs-ajudantes"
                  value={formData.obs || ''}
                  onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                  placeholder="Selecione ou digite..."
                  className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
                <datalist id="obs-ajudantes">
                  <option value="FINALIZADO" />
                  <option value="AUSÊNCIA" />
                  <option value="HORÁRIO RETORNO DO RCS" />
                  <option value="AJUDANTE NÃO SE APRESENTOU NO RETORNO" />
                  <option value="ACOMPANHAR" />
                </datalist>
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
                  Salvar Ajudante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
