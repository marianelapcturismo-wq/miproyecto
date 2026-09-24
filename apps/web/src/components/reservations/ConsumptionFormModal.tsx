import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Service } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, inputClass } from '../ui/FormField';
import { formatCurrency } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function ConsumptionFormModal({ reservationId, onClose }: { reservationId: string; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get<Service[]>('/services')).data });

  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeServices = services?.filter((s) => s.active) ?? [];
  const selected = activeServices.find((s) => s.id === serviceId);

  const create = useMutation({
    mutationFn: async () => api.post('/consumptions', { reservationId, serviceId, quantity, notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Modal title="Cargar consumo" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (serviceId) create.mutate();
        }}
      >
        <FormField label="Servicio">
          <select className={inputClass} value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            <option value="" disabled>
              Seleccionar...
            </option>
            {activeServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatCurrency(s.price, user?.hotel.currency)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Cantidad">
          <input type="number" min={1} className={inputClass} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
        </FormField>
        {selected && (
          <p className="mb-3 text-xs text-slate-500">
            Subtotal: <span className="font-medium text-slate-700">{formatCurrency(Number(selected.price) * quantity, user?.hotel.currency)}</span>
          </p>
        )}
        <FormField label="Observaciones">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!serviceId || create.isPending}>
            {create.isPending ? 'Cargando...' : 'Cargar consumo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
