import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Room, RoomStatus, RoomType } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { RoomStatusBadge } from '../components/ui/Badge';
import { useAuth } from '../auth/AuthContext';

const STATUS_OPTIONS: RoomStatus[] = ['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'LIMPIEZA', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO'];

interface FormState {
  number: string;
  roomTypeId: string;
  floor: string;
  beds: string;
  features: string;
  notes: string;
}
const EMPTY: FormState = { number: '', roomTypeId: '', floor: '', beds: '', features: '', notes: '' };

export function RoomsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', statusFilter],
    queryFn: async () => (await api.get<Room[]>('/rooms', { params: statusFilter ? { status: statusFilter } : {} })).data,
  });
  const { data: roomTypes } = useQuery({
    queryKey: ['room-types'],
    queryFn: async () => (await api.get<RoomType[]>('/room-types')).data,
  });

  const [editing, setEditing] = useState<Room | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const canManage = hasPermission('rooms.manage');
  const canChangeStatus = hasPermission('rooms.status.update');

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return api.patch(`/rooms/${editing.id}`, form);
      return api.post('/rooms', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RoomStatus }) => api.patch(`/rooms/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, roomTypeId: roomTypes?.[0]?.id ?? '' });
    setError(null);
    setShowForm(true);
  }
  function openEdit(room: Room) {
    setEditing(room);
    setForm({ number: room.number, roomTypeId: room.roomTypeId, floor: room.floor ?? '', beds: room.beds ?? '', features: room.features ?? '', notes: room.notes ?? '' });
    setError(null);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Habitaciones</h1>
          <p className="text-sm text-slate-500">Estado físico y operativo de cada habitación.</p>
        </div>
        {canManage && <Button onClick={openCreate}>+ Nueva habitación</Button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === '' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Todas
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rooms?.map((room) => (
            <Card key={room.id} className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{room.number}</p>
                  <p className="text-xs text-slate-500">{room.roomType.name}</p>
                </div>
                {canManage && (
                  <button onClick={() => openEdit(room)} className="text-xs font-medium text-brand-600 hover:underline">
                    Editar
                  </button>
                )}
              </div>
              <div className="mt-2">
                <RoomStatusBadge status={room.status} />
              </div>
              {canChangeStatus && (
                <select
                  className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                  value={room.status}
                  onChange={(e) => changeStatus.mutate({ id: room.id, status: e.target.value as RoomStatus })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar habitación' : 'Nueva habitación'} onClose={() => setShowForm(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <FormField label="Número">
              <input className={inputClass} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
            </FormField>
            <FormField label="Tipo de habitación">
              <select className={inputClass} value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })} required>
                <option value="" disabled>
                  Seleccionar...
                </option>
                {roomTypes?.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Piso">
              <input className={inputClass} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </FormField>
            <FormField label="Camas">
              <input className={inputClass} value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} placeholder="Ej: 1 matrimonial" />
            </FormField>
            <FormField label="Características">
              <input className={inputClass} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Ej: balcón, vista al lago" />
            </FormField>
            <FormField label="Observaciones">
              <textarea className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </FormField>
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
