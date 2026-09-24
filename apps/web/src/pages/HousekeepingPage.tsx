import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { HousekeepingStatus, HousekeepingTask, Room } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { formatDateTime } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

const STATUS_LABEL: Record<HousekeepingStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  LIMPIA: 'Limpia',
  INSPECCIONADA: 'Inspeccionada',
  CON_PROBLEMA: 'Con problema',
};
const STATUS_COLOR: Record<HousekeepingStatus, 'slate' | 'amber' | 'green' | 'blue' | 'red'> = {
  PENDIENTE: 'slate',
  EN_PROCESO: 'amber',
  LIMPIA: 'green',
  INSPECCIONADA: 'blue',
  CON_PROBLEMA: 'red',
};
const NEXT_STATUS: Partial<Record<HousekeepingStatus, HousekeepingStatus>> = {
  PENDIENTE: 'EN_PROCESO',
  EN_PROCESO: 'LIMPIA',
  LIMPIA: 'INSPECCIONADA',
};

export function HousekeepingPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<HousekeepingStatus | ''>('');
  const [showForm, setShowForm] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['housekeeping-tasks', statusFilter],
    queryFn: async () => (await api.get<HousekeepingTask[]>('/housekeeping-tasks', { params: statusFilter ? { status: statusFilter } : {} })).data,
  });

  const canManage = hasPermission('housekeeping.manage');

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: HousekeepingStatus }) => api.patch(`/housekeeping-tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Housekeeping</h1>
          <p className="text-sm text-slate-500">Estado de limpieza de las habitaciones.</p>
        </div>
        {canManage && <Button onClick={() => setShowForm(true)}>+ Nueva tarea</Button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter('')} className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === '' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          Todas
        </button>
        {(Object.keys(STATUS_LABEL) as HousekeepingStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks?.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">Hab. {t.room.number}</p>
                  <p className="text-xs text-slate-500">{t.room.roomType.name}</p>
                </div>
                <Badge color={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</Badge>
              </div>
              {t.assignedTo && (
                <p className="mt-2 text-xs text-slate-500">
                  Asignada a {t.assignedTo.firstName} {t.assignedTo.lastName}
                </p>
              )}
              {t.notes && <p className="mt-1 text-xs text-slate-600">{t.notes}</p>}
              <p className="mt-1 text-xs text-slate-400">{formatDateTime(t.createdAt)}</p>

              {canManage && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {NEXT_STATUS[t.status] && (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: t.id, status: NEXT_STATUS[t.status]! })}>
                      Marcar {STATUS_LABEL[NEXT_STATUS[t.status]!].toLowerCase()}
                    </Button>
                  )}
                  {t.status !== 'CON_PROBLEMA' && t.status !== 'INSPECCIONADA' && (
                    <Button size="sm" variant="danger" onClick={() => updateStatus.mutate({ id: t.id, status: 'CON_PROBLEMA' })}>
                      Reportar problema
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
          {tasks?.length === 0 && <p className="col-span-full py-6 text-center text-sm text-slate-400">No hay tareas para este filtro.</p>}
        </div>
      )}

      {showForm && <CreateTaskModal onClose={() => setShowForm(false)} />}
    </div>
  );
}

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: async () => (await api.get<Room[]>('/rooms')).data });
  const [roomId, setRoomId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => api.post('/housekeeping-tasks', { roomId, notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Modal title="Nueva tarea de housekeeping" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (roomId) create.mutate();
        }}
      >
        <FormField label="Habitación">
          <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
            <option value="" disabled>
              Seleccionar...
            </option>
            {rooms?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} — {r.roomType.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Observaciones">
          <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!roomId || create.isPending}>
            {create.isPending ? 'Creando...' : 'Crear tarea'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
