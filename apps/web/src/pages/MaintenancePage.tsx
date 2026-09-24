import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { MaintenancePriority, MaintenanceStatus, MaintenanceTask, Room } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { formatDateTime } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

const STATUS_LABEL: Record<MaintenanceStatus, string> = { PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', RESUELTO: 'Resuelto' };
const STATUS_COLOR: Record<MaintenanceStatus, 'slate' | 'amber' | 'green'> = { PENDIENTE: 'slate', EN_PROCESO: 'amber', RESUELTO: 'green' };
const PRIORITY_LABEL: Record<MaintenancePriority, string> = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta' };
const PRIORITY_COLOR: Record<MaintenancePriority, 'slate' | 'amber' | 'red'> = { BAJA: 'slate', MEDIA: 'amber', ALTA: 'red' };
const NEXT_STATUS: Partial<Record<MaintenanceStatus, MaintenanceStatus>> = { PENDIENTE: 'EN_PROCESO', EN_PROCESO: 'RESUELTO' };

export function MaintenancePage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>('');
  const [showForm, setShowForm] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['maintenance-tasks', statusFilter],
    queryFn: async () => (await api.get<MaintenanceTask[]>('/maintenance-tasks', { params: statusFilter ? { status: statusFilter } : {} })).data,
  });

  const canManage = hasPermission('maintenance.manage');

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MaintenanceStatus }) => api.patch(`/maintenance-tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Mantenimiento</h1>
          <p className="text-sm text-slate-500">Incidencias y reparaciones de habitaciones.</p>
        </div>
        {canManage && <Button onClick={() => setShowForm(true)}>+ Nueva incidencia</Button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter('')} className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === '' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          Todas
        </button>
        {(Object.keys(STATUS_LABEL) as MaintenanceStatus[]).map((s) => (
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
                <div className="flex flex-col items-end gap-1">
                  <Badge color={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  <Badge color={PRIORITY_COLOR[t.priority]}>Prioridad {PRIORITY_LABEL[t.priority]}</Badge>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-700">{t.issue}</p>
              {t.assignedTo && (
                <p className="mt-1 text-xs text-slate-500">
                  Asignada a {t.assignedTo.firstName} {t.assignedTo.lastName}
                </p>
              )}
              {t.notes && <p className="mt-1 text-xs text-slate-600">{t.notes}</p>}
              <p className="mt-1 text-xs text-slate-400">{formatDateTime(t.createdAt)}</p>

              {canManage && NEXT_STATUS[t.status] && (
                <div className="mt-3">
                  <Button size="sm" onClick={() => updateStatus.mutate({ id: t.id, status: NEXT_STATUS[t.status]! })}>
                    Marcar {STATUS_LABEL[NEXT_STATUS[t.status]!].toLowerCase()}
                  </Button>
                </div>
              )}
            </Card>
          ))}
          {tasks?.length === 0 && <p className="col-span-full py-6 text-center text-sm text-slate-400">No hay incidencias para este filtro.</p>}
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
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIA');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => api.post('/maintenance-tasks', { roomId, issue, priority, notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Modal title="Nueva incidencia de mantenimiento" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (roomId && issue) create.mutate();
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
        <FormField label="Problema">
          <input className={inputClass} value={issue} onChange={(e) => setIssue(e.target.value)} required placeholder="Ej: pérdida de agua en el baño" />
        </FormField>
        <FormField label="Prioridad">
          <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)}>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
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
          <Button type="submit" disabled={!roomId || !issue || create.isPending}>
            {create.isPending ? 'Creando...' : 'Crear incidencia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
