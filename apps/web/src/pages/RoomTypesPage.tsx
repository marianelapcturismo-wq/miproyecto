import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { RoomType } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { formatCurrency } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

interface FormState {
  name: string;
  description: string;
  capacity: number;
  basePrice: number;
}
const EMPTY: FormState = { name: '', description: '', capacity: 2, basePrice: 0 };

export function RoomTypesPage() {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['room-types'],
    queryFn: async () => (await api.get<RoomType[]>('/room-types')).data,
  });

  const [editing, setEditing] = useState<RoomType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const canManage = hasPermission('roomtypes.manage');

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return api.patch(`/room-types/${editing.id}`, form);
      return api.post('/room-types', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-types'] });
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
  function openEdit(rt: RoomType) {
    setEditing(rt);
    setForm({ name: rt.name, description: rt.description ?? '', capacity: rt.capacity, basePrice: Number(rt.basePrice) });
    setError(null);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tipos de habitación</h1>
          <p className="text-sm text-slate-500">Categorías configurables con capacidad y precio base.</p>
        </div>
        {canManage && <Button onClick={openCreate}>+ Nuevo tipo</Button>}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((rt) => (
            <Card key={rt.id} className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900">{rt.name}</h3>
                {canManage && (
                  <button onClick={() => openEdit(rt)} className="text-xs font-medium text-brand-600 hover:underline">
                    Editar
                  </button>
                )}
              </div>
              {rt.description && <p className="mt-1 text-sm text-slate-500">{rt.description}</p>}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">Capacidad: {rt.capacity} pax</span>
                <span className="font-semibold text-slate-900">{formatCurrency(rt.basePrice, user?.hotel.currency)}/noche</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">{rt._count?.rooms ?? 0} habitación(es) de este tipo</p>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar tipo de habitación' : 'Nuevo tipo de habitación'} onClose={() => setShowForm(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <FormField label="Nombre">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </FormField>
            <FormField label="Descripción">
              <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <FormField label="Capacidad (huéspedes)">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                required
              />
            </FormField>
            <FormField label="Precio base por noche">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                required
              />
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
