import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, inputClass } from '../ui/FormField';
import { PaymentMethod, PaymentType } from '../../lib/types';

export function PaymentFormModal({ reservationId, suggestedAmount, onClose }: { reservationId: string; suggestedAmount: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(suggestedAmount > 0 ? suggestedAmount : 0);
  const [method, setMethod] = useState<PaymentMethod>('EFECTIVO');
  const [type, setType] = useState<PaymentType>('PARCIAL');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => api.post('/payments', { reservationId, amount, method, type, notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Modal title="Registrar pago" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <FormField label="Monto">
          <input type="number" min={0.01} step="0.01" className={inputClass} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
        </FormField>
        <div className="grid grid-cols-2 gap-x-3">
          <FormField label="Tipo de pago">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as PaymentType)}>
              <option value="SENA">Seña</option>
              <option value="PARCIAL">Pago parcial</option>
              <option value="FINAL">Pago final</option>
              <option value="DEVOLUCION">Devolución</option>
            </select>
          </FormField>
          <FormField label="Medio de pago">
            <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="OTRO">Otro</option>
            </select>
          </FormField>
        </div>
        <FormField label="Observaciones">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Guardando...' : 'Registrar pago'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
