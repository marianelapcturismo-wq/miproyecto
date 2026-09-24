import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Reservation } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ReservationStatusBadge } from '../components/ui/Badge';
import { formatCurrency, formatDate, formatDateTime } from '../lib/format';
import { useAuth } from '../auth/AuthContext';
import { PaymentFormModal } from '../components/reservations/PaymentFormModal';
import { ConsumptionFormModal } from '../components/reservations/ConsumptionFormModal';

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [showConsumption, setShowConsumption] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn: async () => (await api.get<Reservation>(`/reservations/${id}`)).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reservation', id] });
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
  };

  const checkin = useMutation({
    mutationFn: async () => api.post(`/reservations/${id}/checkin`),
    onSuccess: invalidate,
    onError: (e) => setActionError(apiErrorMessage(e)),
  });
  const checkout = useMutation({
    mutationFn: async () => api.post(`/reservations/${id}/checkout`),
    onSuccess: invalidate,
    onError: (e) => setActionError(apiErrorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: async () => api.post(`/reservations/${id}/cancel`, { reason: 'Cancelada desde recepción' }),
    onSuccess: invalidate,
    onError: (e) => setActionError(apiErrorMessage(e)),
  });

  if (isLoading || !reservation) return <p className="text-sm text-slate-400">Cargando...</p>;

  const canCheckin = hasPermission('reservations.checkin') && ['CONFIRMADA', 'PRE_RESERVA'].includes(reservation.status);
  const canCheckout = hasPermission('reservations.checkout') && reservation.status === 'CHECK_IN';
  const canCancel = hasPermission('reservations.cancel') && !['CHECK_OUT', 'CANCELADA'].includes(reservation.status);
  const canPay = hasPermission('payments.create') && !['CANCELADA', 'NO_SHOW'].includes(reservation.status);
  const canConsume = hasPermission('consumptions.create') && !['CANCELADA', 'NO_SHOW', 'CHECK_OUT'].includes(reservation.status);

  return (
    <div className="space-y-4">
      <Link to="/reservations" className="text-sm text-slate-500 hover:text-slate-800">
        ← Volver a reservas
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {reservation.titularGuest.lastName}, {reservation.titularGuest.firstName}
          </h1>
          <p className="text-sm text-slate-500">
            Habitación {reservation.room.number} ({reservation.room.roomType.name}) · {formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)} ·{' '}
            {reservation.nights} noche(s)
          </p>
        </div>
        <ReservationStatusBadge status={reservation.status} />
      </div>

      {actionError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}

      <div className="flex flex-wrap gap-2">
        {canCheckin && (
          <Button onClick={() => checkin.mutate()} disabled={checkin.isPending}>
            Realizar check-in
          </Button>
        )}
        {canCheckout && (
          <Button onClick={() => checkout.mutate()} disabled={checkout.isPending}>
            Realizar check-out
          </Button>
        )}
        {canPay && (
          <Button variant="secondary" onClick={() => setShowPayment(true)}>
            Registrar pago
          </Button>
        )}
        {canConsume && (
          <Button variant="secondary" onClick={() => setShowConsumption(true)}>
            Cargar consumo
          </Button>
        )}
        {canCancel && (
          <Button variant="danger" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            Cancelar reserva
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Datos de la reserva</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Huésped titular</dt>
              <dd>
                <Link to={`/guests/${reservation.titularGuestId}`} className="text-brand-600 hover:underline">
                  Ver ficha
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Documento</dt>
              <dd className="text-slate-800">
                {reservation.titularGuest.documentType} {reservation.titularGuest.documentNumber}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Cant. huéspedes</dt>
              <dd className="text-slate-800">{reservation.guestsCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Canal</dt>
              <dd className="text-slate-800">{reservation.channel.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Plan de tarifa</dt>
              <dd className="text-slate-800">{reservation.ratePlan?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Check-in real</dt>
              <dd className="text-slate-800">{reservation.actualCheckInAt ? formatDateTime(reservation.actualCheckInAt) : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Check-out real</dt>
              <dd className="text-slate-800">{reservation.actualCheckOutAt ? formatDateTime(reservation.actualCheckOutAt) : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Creada por</dt>
              <dd className="text-slate-800">
                {reservation.createdBy.firstName} {reservation.createdBy.lastName}
              </dd>
            </div>
          </dl>
          {reservation.notes && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 whitespace-pre-line">
              <p className="mb-1 font-medium text-slate-500">Observaciones</p>
              {reservation.notes}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Cuenta de la estadía</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Precio por noche</dt>
              <dd className="text-slate-800">{formatCurrency(reservation.agreedPricePerNight, user?.hotel.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Noches</dt>
              <dd className="text-slate-800">{reservation.nights}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal alojamiento</dt>
              <dd className="text-slate-800">{formatCurrency(reservation.roomTotal, user?.hotel.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Consumos y servicios</dt>
              <dd className="text-slate-800">{formatCurrency(reservation.consumptionsTotal, user?.hotel.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-medium">
              <dt className="text-slate-600">Total estadía</dt>
              <dd className="text-slate-900">{formatCurrency(reservation.total, user?.hotel.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Pagado</dt>
              <dd className="text-emerald-600">{formatCurrency(reservation.paid, user?.hotel.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
              <dt className="text-slate-700">Saldo</dt>
              <dd className={reservation.balance > 0 ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(reservation.balance, user?.hotel.currency)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Pagos registrados ({reservation.payments.length})</h2>
          {reservation.payments.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no se registraron pagos.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {reservation.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{p.type === 'DEVOLUCION' ? '− ' : ''}{formatCurrency(p.amount, user?.hotel.currency)}</p>
                    <p className="text-xs text-slate-400">
                      {p.type} · {p.method} · {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Consumos y servicios ({reservation.consumptions.length})</h2>
        {reservation.consumptions.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no se cargaron consumos.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2">Servicio</th>
                <th className="py-2">Cantidad</th>
                <th className="py-2">Fecha</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {reservation.consumptions.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 text-slate-800">{c.service.name}</td>
                  <td className="py-2 text-slate-600">{c.quantity}</td>
                  <td className="py-2 text-slate-500">{formatDateTime(c.date)}</td>
                  <td className="py-2 text-right font-medium text-slate-800">{formatCurrency(Number(c.unitPrice) * c.quantity, user?.hotel.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showPayment && <PaymentFormModal reservationId={reservation.id} suggestedAmount={reservation.balance} onClose={() => setShowPayment(false)} />}
      {showConsumption && <ConsumptionFormModal reservationId={reservation.id} onClose={() => setShowConsumption(false)} />}
    </div>
  );
}
