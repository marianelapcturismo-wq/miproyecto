import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { CashSession, PaymentMethod } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDateTime } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

export function CashPage() {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const currency = user?.hotel.currency;
  const canManage = hasPermission('cash.manage');

  const { data: current, isLoading } = useQuery({
    queryKey: ['cash-current'],
    queryFn: async () => (await api.get<CashSession | null>('/cash-sessions/current')).data,
  });
  const { data: history } = useQuery({
    queryKey: ['cash-history'],
    queryFn: async () => (await api.get<CashSession[]>('/cash-sessions')).data,
  });

  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showMovement, setShowMovement] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-current'] });
    queryClient.invalidateQueries({ queryKey: ['cash-history'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
  };

  if (isLoading) return <p className="text-sm text-slate-400">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Caja</h1>
          <p className="text-sm text-slate-500">Apertura, movimientos y cierre de caja diaria.</p>
        </div>
        {canManage && !current && <Button onClick={() => setShowOpen(true)}>Abrir caja</Button>}
        {canManage && current && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowMovement(true)}>
              + Movimiento
            </Button>
            <Button variant="danger" onClick={() => setShowClose(true)}>
              Cerrar caja
            </Button>
          </div>
        )}
      </div>

      {!current ? (
        <Card className="p-6 text-center text-sm text-slate-500">No hay una caja abierta actualmente.</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Apertura</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(current.openingAmount, currency)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Ingresos</p>
              <p className="mt-1 text-xl font-semibold text-emerald-600">{formatCurrency(current.summary.ingresos, currency)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Egresos</p>
              <p className="mt-1 text-xl font-semibold text-red-600">{formatCurrency(current.summary.egresos, currency)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Saldo esperado</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(current.summary.expectedAmount, currency)}</p>
            </Card>
          </div>

          <Card>
            <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              Abierta por {current.openedBy.firstName} {current.openedBy.lastName} · {formatDateTime(current.openedAt)}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Concepto</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Medio</th>
                  <th className="px-4 py-2">Usuario</th>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {current.movements.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 text-slate-800">{m.concept}</td>
                    <td className="px-4 py-2">
                      <Badge color={m.type === 'INGRESO' ? 'green' : 'red'}>{m.type}</Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{m.method}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {m.registeredBy.firstName} {m.registeredBy.lastName}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{formatDateTime(m.createdAt)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.type === 'INGRESO' ? '+' : '−'} {formatCurrency(m.amount, currency)}
                    </td>
                  </tr>
                ))}
                {current.movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      Todavía no hay movimientos en esta caja.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {history && history.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Historial de cajas</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2">Apertura</th>
                <th className="py-2">Cierre</th>
                <th className="py-2">Estado</th>
                <th className="py-2 text-right">Monto apertura</th>
                <th className="py-2 text-right">Monto cierre</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 text-slate-700">{formatDateTime(s.openedAt)}</td>
                  <td className="py-2 text-slate-500">{s.closedAt ? formatDateTime(s.closedAt) : '—'}</td>
                  <td className="py-2">
                    <Badge color={s.status === 'ABIERTA' ? 'blue' : 'slate'}>{s.status}</Badge>
                  </td>
                  <td className="py-2 text-right text-slate-700">{formatCurrency(s.openingAmount, currency)}</td>
                  <td className="py-2 text-right text-slate-700">{s.closingAmount != null ? formatCurrency(s.closingAmount, currency) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showOpen && <OpenCashModal onClose={() => setShowOpen(false)} onDone={invalidate} />}
      {showMovement && current && <MovementModal sessionId={current.id} onClose={() => setShowMovement(false)} onDone={invalidate} />}
      {showClose && current && <CloseCashModal sessionId={current.id} expectedAmount={current.summary.expectedAmount} onClose={() => setShowClose(false)} onDone={invalidate} />}
    </div>
  );
}

function OpenCashModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [openingAmount, setOpeningAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const open = useMutation({
    mutationFn: async () => api.post('/cash-sessions/open', { openingAmount, notes: notes || undefined }),
    onSuccess: () => {
      onDone();
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Modal title="Abrir caja" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          open.mutate();
        }}
      >
        <FormField label="Monto inicial en caja">
          <input type="number" min={0} className={inputClass} value={openingAmount} onChange={(e) => setOpeningAmount(Number(e.target.value))} required />
        </FormField>
        <FormField label="Observaciones">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={open.isPending}>
            {open.isPending ? 'Abriendo...' : 'Abrir caja'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MovementModal({ sessionId, onClose, onDone }: { sessionId: string; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('EFECTIVO');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => api.post(`/cash-sessions/${sessionId}/movements`, { type, concept, amount, method }),
    onSuccess: () => {
      onDone();
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Modal title="Registrar movimiento de caja" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <FormField label="Tipo">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as 'INGRESO' | 'EGRESO')}>
            <option value="EGRESO">Egreso (gasto)</option>
            <option value="INGRESO">Ingreso</option>
          </select>
        </FormField>
        <FormField label="Concepto">
          <input className={inputClass} value={concept} onChange={(e) => setConcept(e.target.value)} required />
        </FormField>
        <div className="grid grid-cols-2 gap-x-3">
          <FormField label="Monto">
            <input type="number" min={0.01} step="0.01" className={inputClass} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
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
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Guardando...' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CloseCashModal({ sessionId, expectedAmount, onClose, onDone }: { sessionId: string; expectedAmount: number; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [closingAmount, setClosingAmount] = useState(expectedAmount);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = useMutation({
    mutationFn: async () => api.post(`/cash-sessions/${sessionId}/close`, { closingAmount, notes: notes || undefined }),
    onSuccess: () => {
      onDone();
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const difference = closingAmount - expectedAmount;

  return (
    <Modal title="Cerrar caja" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          close.mutate();
        }}
      >
        <p className="mb-3 text-sm text-slate-600">
          Saldo esperado según movimientos: <span className="font-semibold">{formatCurrency(expectedAmount, user?.hotel.currency)}</span>
        </p>
        <FormField label="Monto real contado en caja">
          <input type="number" min={0} className={inputClass} value={closingAmount} onChange={(e) => setClosingAmount(Number(e.target.value))} required />
        </FormField>
        {difference !== 0 && (
          <p className={`mb-3 text-xs ${difference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            Diferencia: {difference > 0 ? '+' : ''}
            {formatCurrency(difference, user?.hotel.currency)}
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
          <Button type="submit" variant="danger" disabled={close.isPending}>
            {close.isPending ? 'Cerrando...' : 'Cerrar caja'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
