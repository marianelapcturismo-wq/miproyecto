import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../lib/api';
import { Guest } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { useAuth } from '../auth/AuthContext';

interface FormState {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  nationality: string;
  phone: string;
  email: string;
}
const EMPTY: FormState = { firstName: '', lastName: '', documentType: 'DNI', documentNumber: '', nationality: 'Argentina', phone: '', email: '' };

export function GuestsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data: guests, isLoading } = useQuery({
    queryKey: ['guests', search],
    queryFn: async () => (await api.get<Guest[]>('/guests', { params: search ? { search } : {} })).data,
  });

  const canManage = hasPermission('guests.manage');

  const create = useMutation({
    mutationFn: async () => api.post('/guests', form),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setShowForm(false);
      setForm(EMPTY);
      navigate(`/guests/${res.data.id}`);
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Huéspedes</h1>
          <p className="text-sm text-slate-500">Ficha, historial de estadías y datos de contacto.</p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setForm(EMPTY);
              setError(null);
              setShowForm(true);
            }}
          >
            + Nuevo huésped
          </Button>
        )}
      </div>

      <input
        className={inputClass + ' max-w-sm'}
        placeholder="Buscar por nombre, apellido, documento o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Card>
        {isLoading ? (
          <p className="p-4 text-sm text-slate-400">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Documento</th>
                <th className="px-4 py-2">Nacionalidad</th>
                <th className="px-4 py-2">Contacto</th>
              </tr>
            </thead>
            <tbody>
              {guests?.map((g) => (
                <tr key={g.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link to={`/guests/${g.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                      {g.lastName}, {g.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {g.documentType} {g.documentNumber}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{g.nationality ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{g.phone ?? g.email ?? '—'}</td>
                </tr>
              ))}
              {guests?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                    No se encontraron huéspedes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showForm && (
        <Modal title="Nuevo huésped" onClose={() => setShowForm(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-x-3">
              <FormField label="Nombre">
                <input className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </FormField>
              <FormField label="Apellido">
                <input className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </FormField>
              <FormField label="Tipo de documento">
                <select className={inputClass} value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
                  <option value="DNI">DNI</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="Otro">Otro</option>
                </select>
              </FormField>
              <FormField label="Número de documento">
                <input className={inputClass} value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} required />
              </FormField>
              <FormField label="Nacionalidad">
                <input className={inputClass} value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
              </FormField>
              <FormField label="Teléfono">
                <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Email">
              <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
