import React, { useState } from 'react';
import { Plus, Users, Trash2, Edit3, Save, X } from 'lucide-react';
import { PlantaoReserva } from '../types';

interface PlantoesTabProps {
  plantoes: PlantaoReserva[];
  escalaId: string;
  onSave: (plantao: PlantaoReserva) => void;
  onDelete: (id: string) => void;
}

export const PlantoesTab: React.FC<PlantoesTabProps> = ({
  plantoes,
  escalaId,
  onSave,
  onDelete
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlantaoReserva>>({});
  const [isAdding, setIsAdding] = useState(false);

  const [newForm, setNewForm] = useState<Partial<PlantaoReserva>>({
    motorista_nome: '',
    horario_plantao: '05:00',
    status_contato: 'Pendente',
    observacoes: ''
  });

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.motorista_nome) return;

    const newItem: PlantaoReserva = {
      id: crypto.randomUUID(),
      escala_id: escalaId,
      motorista_nome: newForm.motorista_nome.toUpperCase(),
      horario_plantao: newForm.horario_plantao || '05:00',
      status_contato: newForm.status_contato || 'Pendente',
      observacoes: newForm.observacoes || ''
    };

    onSave(newItem);
    setIsAdding(false);
    setNewForm({
      motorista_nome: '',
      horario_plantao: '05:00',
      status_contato: 'Pendente',
      observacoes: ''
    });
  };

  const handleStartEdit = (p: PlantaoReserva) => {
    setEditingId(p.id);
    setEditForm({ ...p });
  };

  const handleSaveEdit = (id: string) => {
    const original = plantoes.find(p => p.id === id);
    if (!original) return;

    const updated: PlantaoReserva = {
      ...original,
      ...editForm
    };

    onSave(updated);
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex sm:items-center justify-between gap-3 bg-zinc-900/60 backdrop-blur-md p-3 rounded-xl border border-white/[0.08] shadow-subtle">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Quadro de Plantões & Motoristas Reservas
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">Controle de motoristas disponíveis para acionamento imediato e contingência.</p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-xs font-semibold shadow-glow-emerald transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Novo Plantonista</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSaveNew} className="bg-zinc-900 border border-emerald-500/40 rounded-xl p-4 shadow-elevated animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-3.5">
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Novo Motorista Plantonista
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Nome do Motorista *</label>
              <input
                type="text"
                required
                placeholder="Ex: CARLOS ALBERTO"
                value={newForm.motorista_nome}
                onChange={(e) => setNewForm({ ...newForm, motorista_nome: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 uppercase"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Horário de Apresentação</label>
              <input
                type="time"
                value={newForm.horario_plantao}
                onChange={(e) => setNewForm({ ...newForm, horario_plantao: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Status de Contato</label>
              <select
                value={newForm.status_contato}
                onChange={(e) => setNewForm({ ...newForm, status_contato: e.target.value })}
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                <option value="Pendente">Pendente</option>
                <option value="WhatsApp">Enviado WhatsApp</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Acionado">Acionado em Viagem</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Observações</label>
              <input
                type="text"
                placeholder="Ex: Categoria E, Disponível após 06h"
                value={newForm.observacoes}
                onChange={(e) => setNewForm({ ...newForm, observacoes: e.target.value })}
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
              Salvar Plantão
            </button>
          </div>
        </form>
      )}

      <div className="bg-zinc-900/60 border border-white/[0.08] rounded-xl overflow-hidden shadow-elevated">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-950 text-zinc-400 font-semibold border-b border-white/[0.08] uppercase tracking-wider text-[11px] select-none">
              <th className="py-2.5 px-3.5">Motorista Plantonista</th>
              <th className="py-2.5 px-3">Apresentação</th>
              <th className="py-2.5 px-3.5">Status Contato</th>
              <th className="py-2.5 px-3.5">Observações</th>
              <th className="py-2.5 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-xs">
            {plantoes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-500">
                  Nenhum motorista cadastrado no plantão para esta data.
                </td>
              </tr>
            ) : (
              plantoes.map((p) => {
                const isEditing = editingId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors text-zinc-300">
                    <td className="py-2.5 px-3.5 font-medium text-zinc-100">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.motorista_nome || ''}
                          onChange={(e) => setEditForm({ ...editForm, motorista_nome: e.target.value })}
                          className="bg-zinc-950 border border-white/[0.1] rounded px-2 py-0.5 text-zinc-100 w-full uppercase"
                        />
                      ) : (
                        p.motorista_nome
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono tabular-nums text-zinc-300">
                      {isEditing ? (
                        <input
                          type="time"
                          value={editForm.horario_plantao || ''}
                          onChange={(e) => setEditForm({ ...editForm, horario_plantao: e.target.value })}
                          className="bg-zinc-950 border border-white/[0.1] rounded px-1.5 py-0.5 text-zinc-100 font-mono"
                        />
                      ) : (
                        p.horario_plantao
                      )}
                    </td>

                    <td className="py-2.5 px-3.5">
                      {isEditing ? (
                        <select
                          value={editForm.status_contato}
                          onChange={(e) => setEditForm({ ...editForm, status_contato: e.target.value })}
                          className="bg-zinc-950 border border-white/[0.1] rounded px-2 py-0.5 text-zinc-100 text-xs"
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="WhatsApp">Enviado WhatsApp</option>
                          <option value="Confirmado">Confirmado</option>
                          <option value="Acionado">Acionado em Viagem</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          p.status_contato === 'Confirmado'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : p.status_contato === 'Acionado'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : p.status_contato === 'WhatsApp'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {p.status_contato}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-zinc-400 text-[11px]">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.observacoes || ''}
                          onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                          className="bg-zinc-950 border border-white/[0.1] rounded px-2 py-0.5 text-zinc-100 w-full"
                        />
                      ) : (
                        p.observacoes || '-'
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleSaveEdit(p.id)}
                            className="p-1 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(p.id)}
                            className="p-1 rounded hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 transition"
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
  );
};
