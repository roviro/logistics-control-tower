import React, { useState } from 'react';
import { 
  ThermometerSnowflake, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  PhoneCall, 
  Clock, 
  Search,
  Flame,
  Truck
} from 'lucide-react';
import { TemperaturaCrossItem } from '../types';
import { avaliarTemperaturaCross } from '../utils/jornada';

interface TemperaturaCrossTabProps {
  temperaturas: TemperaturaCrossItem[];
  escalaId: string;
  dataOperacao: string;
  onSave: (item: TemperaturaCrossItem) => void;
  onDelete: (id: string) => void;
}

export const TemperaturaCrossTab: React.FC<TemperaturaCrossTabProps> = ({
  temperaturas,
  escalaId,
  dataOperacao,
  onSave,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<TemperaturaCrossItem>>({
    cavalo: '',
    carreta: '',
    temperatura_congelado: '-20',
    temperatura_resfriado: '2',
    observacoes: '',
    horario_afericao: ''
  });

  const handleOpenNew = () => {
    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setFormData({
      id: undefined,
      escala_id: escalaId,
      cavalo: '',
      carreta: '',
      temperatura_congelado: '-20',
      temperatura_resfriado: '2',
      fora_da_faixa: false,
      observacoes: '',
      horario_afericao: hora
    });
    setIsEditing(true);
  };

  const handleEdit = (item: TemperaturaCrossItem) => {
    setFormData(item);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.carreta?.trim()) return;

    const cong = (formData.temperatura_congelado || 'SECO').trim();
    const resf = (formData.temperatura_resfriado || 'SECO').trim();
    const { foraDaFaixa } = avaliarTemperaturaCross(cong, resf);

    const itemToSave: TemperaturaCrossItem = {
      id: formData.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      escala_id: escalaId,
      cavalo: (formData.cavalo || 'EXCEDENTE').toUpperCase().trim(),
      carreta: (formData.carreta || '').toUpperCase().trim(),
      temperatura_congelado: cong,
      temperatura_resfriado: resf,
      fora_da_faixa: foraDaFaixa,
      observacoes: formData.observacoes?.trim() || '',
      horario_afericao: formData.horario_afericao || ''
    };

    onSave(itemToSave);
    setIsEditing(false);
  };

  const filteredItems = temperaturas.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.cavalo.toLowerCase().includes(term) ||
      item.carreta.toLowerCase().includes(term) ||
      item.observacoes.toLowerCase().includes(term)
    );
  });

  const total = temperaturas.length;
  const foraCount = temperaturas.filter(t => t.fora_da_faixa).length;
  const conformesCount = total - foraCount;

  const handleCopyWhatsApp = () => {
    const formattedDate = dataOperacao.split('-').reverse().join('/');
    let text = `❄️ *AFERIÇÃO DE TEMPERATURA CROSS CD-JD - ${formattedDate}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (temperaturas.length === 0) {
      text += `_Nenhuma aferição registrada._\n`;
    } else {
      temperaturas.forEach((item) => {
        const { foraDaFaixa, motivo } = avaliarTemperaturaCross(item.temperatura_congelado, item.temperatura_resfriado);
        const icon = foraDaFaixa ? '🚨' : '✅';
        text += `${icon} *CAVALO:* ${item.cavalo || 'N/I'} | *CARRETA:* ${item.carreta}\n`;
        text += `   ❄️ Congelado: ${item.temperatura_congelado}°C | 🥦 Resfriado: ${item.temperatura_resfriado}°C\n`;
        if (foraDaFaixa) {
          text += `   ⚠️ *ALERTA: FORA DA FAIXA - ACIONAR TÉCNICO!* (${motivo})\n`;
        } else {
          text += `   Status: Temperatura Conforme\n`;
        }
        if (item.observacoes) {
          text += `   Obs: ${item.observacoes}\n`;
        }
        text += `\n`;
      });
    }

    if (foraCount > 0) {
      text += `🚨 *ATENÇÃO: HÁ ${foraCount} VEÍCULO(S) FORA DA FAIXA. TÉCNICO DEVE SER ACIONADO!*\n\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Acompanhamento Dominical Front-Office - CDFT_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal com Regras de Alerta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 backdrop-blur-md p-4 rounded-xl border border-white/[0.08] shadow-subtle">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
            <ThermometerSnowflake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              Controle de Temperatura Cross CD-JD
              <span className="text-xs font-normal text-zinc-400">
                ({dataOperacao.split('-').reverse().join('/')})
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Acompanhamento de temperatura das carretas no Cross-Docking (Domingos e Passagem de Turno)
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
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
            <span>{copied ? 'Copiado p/ WhatsApp!' : 'Copiar p/ WhatsApp'}</span>
          </button>

          {/* Botão Nova Aferição */}
          <button
            onClick={handleOpenNew}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-glow-emerald active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Adicionar Aferição</span>
          </button>
        </div>
      </div>

      {/* Alerta Crítico se houver veículos fora de temperatura */}
      {foraCount > 0 && (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center space-x-3 text-rose-300">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-200 uppercase tracking-wide">
                🚨 {foraCount} Veículo(s) Fora da Faixa de Temperatura!
              </h3>
              <p className="text-xs text-rose-300/90 mt-0.5">
                Risco de perda de carga térmica. <strong>Acionar imediatamente o técnico de refrigeração de plantão.</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm">
              CHAMAR TÉCNICO
            </span>
          </div>
        </div>
      )}

      {/* Regras e Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400 uppercase font-medium">Parâmetro Congelado</span>
            <div className="text-sm font-bold text-sky-400 mt-0.5">≤ -18°C</div>
            <span className="text-[10px] text-zinc-500">Alerta se &gt; -15°C</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            ❄️
          </div>
        </div>

        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400 uppercase font-medium">Parâmetro Resfriado</span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">0°C a +4°C</div>
            <span className="text-[10px] text-zinc-500">Alerta se &gt; +4°C</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            🥦
          </div>
        </div>

        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400 uppercase font-medium">Status Geral</span>
            <div className="text-sm font-bold mt-0.5 flex items-center gap-2">
              <span className="text-zinc-200">{total} carretas</span>
              {foraCount > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
                  {foraCount} fora
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  100% OK
                </span>
              )}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Truck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Tabela de Aferições (Fiel à Imagem do Usuário CROS CD-JD) */}
      <div className="bg-zinc-900/60 rounded-xl border border-white/[0.08] overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-950/80 text-zinc-400 border-b border-white/[0.08] font-semibold uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3 w-36">Cavalo</th>
                <th className="px-4 py-3 w-36">Carreta</th>
                <th className="px-4 py-3 w-32 text-center">Congelado</th>
                <th className="px-4 py-3 w-32 text-center">Resfriado</th>
                <th className="px-4 py-3">Diagnóstico / Ação Operacional</th>
                <th className="px-4 py-3 w-28 text-center">Horário</th>
                <th className="px-3 py-3 w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-zinc-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <ThermometerSnowflake className="w-8 h-8 mx-auto mb-2 opacity-30 text-sky-400" />
                    Nenhuma aferição registrada no momento.
                    <br />
                    <button
                      onClick={handleOpenNew}
                      className="mt-3 text-xs text-emerald-400 hover:underline font-medium"
                    >
                      + Clique aqui para cadastrar a primeira aferição
                    </button>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const { foraDaFaixa, motivo } = avaliarTemperaturaCross(
                    item.temperatura_congelado, 
                    item.temperatura_resfriado
                  );
                  const isSeco = 
                    item.temperatura_congelado.toUpperCase() === 'SECO' && 
                    item.temperatura_resfriado.toUpperCase() === 'SECO';

                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-zinc-800/40 transition group ${
                        foraDaFaixa ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-zinc-200">
                        {item.cavalo === 'EXCEDENTE' ? (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-semibold text-[11px]">
                            EXCEDENTE
                          </span>
                        ) : (
                          item.cavalo || '—'
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-zinc-100">
                        <span className="px-2.5 py-1 rounded bg-zinc-800/90 text-emerald-400 border border-white/[0.06] shadow-sm">
                          {item.carreta}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono font-bold text-sm">
                        <span className={`inline-block px-2.5 py-1 rounded ${
                          item.temperatura_congelado.toUpperCase() === 'SECO'
                            ? 'bg-zinc-800 text-zinc-400'
                            : foraDaFaixa && motivo.includes('Congelado')
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-sky-500/10 text-sky-300'
                        }`}>
                          {item.temperatura_congelado}
                          {item.temperatura_congelado.toUpperCase() !== 'SECO' && '°C'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono font-bold text-sm">
                        <span className={`inline-block px-2.5 py-1 rounded ${
                          item.temperatura_resfriado.toUpperCase() === 'SECO'
                            ? 'bg-zinc-800 text-zinc-400'
                            : foraDaFaixa && motivo.includes('Resfriado')
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-300'
                        }`}>
                          {item.temperatura_resfriado}
                          {item.temperatura_resfriado.toUpperCase() !== 'SECO' && '°C'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {foraDaFaixa ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              🚨 FORA DE TEMPERATURA - CHAMAR TÉCNICO!
                            </span>
                            <span className="text-[11px] text-rose-400/80 font-mono">
                              ({motivo})
                            </span>
                          </div>
                        ) : isSeco ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-white/[0.06]">
                            📦 Carga Seca / Desligado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Temperatura Conforme
                          </span>
                        )}

                        {item.observacoes && (
                          <p className="text-[11px] text-zinc-400 mt-1">
                            {item.observacoes}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono text-zinc-400">
                        {item.horario_afericao || '—'}
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
          <div className="bg-zinc-900 border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <ThermometerSnowflake className="w-4 h-4 text-sky-400" />
                {formData.id ? 'Editar Aferição Cross' : 'Nova Aferição Cross CD-JD'}
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
                    Cavalo (Placa ou EXCEDENTE)
                  </label>
                  <input
                    type="text"
                    value={formData.cavalo || ''}
                    onChange={(e) => setFormData({ ...formData, cavalo: e.target.value.toUpperCase() })}
                    placeholder="Ex: FYR6A78 ou EXCEDENTE"
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Carreta (Placa) *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.carreta || ''}
                    onChange={(e) => setFormData({ ...formData, carreta: e.target.value.toUpperCase() })}
                    placeholder="Ex: EGJ8729"
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                    <span>Congelado (°C)</span>
                    <span className="text-[10px] text-zinc-500">≤ -18°C</span>
                  </label>
                  <input
                    type="text"
                    value={formData.temperatura_congelado || ''}
                    onChange={(e) => setFormData({ ...formData, temperatura_congelado: e.target.value })}
                    placeholder="-20 ou SECO"
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {['-22', '-20', '-18', 'SECO'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, temperatura_congelado: val })}
                        className="px-2 py-0.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                    <span>Resfriado (°C)</span>
                    <span className="text-[10px] text-zinc-500">0° a 4°C</span>
                  </label>
                  <input
                    type="text"
                    value={formData.temperatura_resfriado || ''}
                    onChange={(e) => setFormData({ ...formData, temperatura_resfriado: e.target.value })}
                    placeholder="2 ou SECO"
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {['1', '2', '3', 'SECO'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, temperatura_resfriado: val })}
                        className="px-2 py-0.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Horário da Aferição
                  </label>
                  <input
                    type="time"
                    value={formData.horario_afericao || ''}
                    onChange={(e) => setFormData({ ...formData, horario_afericao: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Observações / Ação
                  </label>
                  <input
                    type="text"
                    value={formData.observacoes || ''}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Ex: Chamado técnico aberto..."
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
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
                  Salvar Aferição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
