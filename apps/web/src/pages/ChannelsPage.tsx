import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Channel } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { useAuth } from '../auth/AuthContext';

interface FormState {
  code: string;
  name: string;
  commissionPct: number;
  active: boolean;
}
const EMPTY: FormState = { code: '', name: '', commissionPct: 0, active: true };

export function ChannelsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission('channels.manage');

  const { data: channels, isLoading } = useQuery({ queryKey: ['channels-admin'], queryFn: async () => (await api.get<Channel[]>('/channels')).data });

  const [editing, setEditing] = useState<Channel | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => (editing ? api.patch(`/channels/${editing.id}`, form) : api.post('/channels', form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels-admin'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  }
  function openEdit(c: Channel) {
    setEditing(c);
    setForm({ code: c.code, name: c.name, commissionPct: Number(c.commissionPct), active: c.active });
    setError(null);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Canales de venta</h1>
          <p className="text-sm text-slate-500">De dónde provienen las reservas y su comisión asociada.</p>
        </div>
        {canManage && <Button onClick={openCreate}>+ Nuevo canal</Button>}
      </div>

      <Card>
        {isLoading ? (
          <p className="p-4 text-sm text-slate-400">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2 text-right">Comisión</th>
                <th className="px-4 py-2">Estado</th>
                {canManage && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {channels?.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-2 text-slate-500">{c.code}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{Number(c.commissionPct)}%</td>
                  <td className="px-4 py-2 text-slate-600">{c.active ? 'Activo' : 'Inactivo'}</td>
                  {canManage && (
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => openEdit(c)} className="text-xs font-medium text-brand-600 hover:underline">
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showForm && (
        <Modal title={editing ? 'Editar canal' : 'Nuevo canal'} onClose={() => setShowForm(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <FormField label="Nombre">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </FormField>
            <FormField label="Código">
              <input
                className={inputClass}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Ej: BOOKING"
                required
              />
            </FormField>
            <FormField label="Comisión (%)">
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                className={inputClass}
                value={form.commissionPct}
                onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })}
              />
            </FormField>
            <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Activo
            </label>
            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
