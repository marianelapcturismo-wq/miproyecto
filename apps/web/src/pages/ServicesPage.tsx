import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Service, ServiceCategory } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { formatCurrency } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  DESAYUNO: 'Desayuno',
  RESTAURANTE: 'Restaurante',
  BAR: 'Bar',
  MINIBAR: 'Minibar',
  ESTACIONAMIENTO: 'Estacionamiento',
  LAVANDERIA: 'Lavandería',
  EXCURSION: 'Excursión',
  OTRO: 'Otro',
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as ServiceCategory[];

interface FormState {
  name: string;
  category: ServiceCategory;
  price: number;
  active: boolean;
}
const EMPTY: FormState = { name: '', category: 'OTRO', price: 0, active: true };

export function ServicesPage() {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: services, isLoading } = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get<Service[]>('/services')).data });

  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const canManage = hasPermission('services.manage');

  const save = useMutation({
    mutationFn: async () => (editing ? api.patch(`/services/${editing.id}`, form) : api.post('/services', form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
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
  function openEdit(s: Service) {
    setEditing(s);
    setForm({ name: s.name, category: s.category, price: Number(s.price), active: s.active });
    setError(null);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Servicios</h1>
          <p className="text-sm text-slate-500">Catálogo de consumos y servicios adicionales (desayuno, bar, minibar, excursiones...).</p>
        </div>
        {canManage && <Button onClick={openCreate}>+ Nuevo servicio</Button>}
      </div>

      <Card>
        {isLoading ? (
          <p className="p-4 text-sm text-slate-400">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2 text-right">Precio</th>
                <th className="px-4 py-2">Estado</th>
                {canManage && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {services?.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-2 text-slate-600">{CATEGORY_LABEL[s.category]}</td>
                  <td className="px-4 py-2 text-right text-slate-800">{formatCurrency(s.price, user?.hotel.currency)}</td>
                  <td className="px-4 py-2 text-slate-600">{s.active ? 'Activo' : 'Inactivo'}</td>
                  {canManage && (
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => openEdit(s)} className="text-xs font-medium text-brand-600 hover:underline">
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
        <Modal title={editing ? 'Editar servicio' : 'Nuevo servicio'} onClose={() => setShowForm(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <FormField label="Nombre">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </FormField>
            <FormField label="Categoría">
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Precio">
              <input type="number" min={0} className={inputClass} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
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
