import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Guest } from '../lib/types';
import { Card } from '../components/ui/Card';
import { ReservationStatusBadge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

export function GuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest', id],
    queryFn: async () => (await api.get<Guest>(`/guests/${id}`)).data,
  });

  if (isLoading || !guest) return <p className="text-sm text-slate-400">Cargando...</p>;

  const reservations = guest.reservationsAsTitular ?? [];

  return (
    <div className="space-y-4">
      <Link to="/guests" className="text-sm text-slate-500 hover:text-slate-800">
        ← Volver a huéspedes
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {guest.lastName}, {guest.firstName}
          </h1>
          <p className="text-sm text-slate-500">
            {guest.documentType} {guest.documentNumber} · {guest.nationality ?? 'Sin nacionalidad'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Datos de contacto</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Teléfono</dt>
              <dd className="text-slate-800">{guest.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-800">{guest.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Dirección</dt>
              <dd className="text-slate-800">{guest.address ?? '—'}</dd>
            </div>
          </dl>
          {guest.notes && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <p className="mb-1 font-medium text-slate-500">Observaciones</p>
              {guest.notes}
            </div>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Historial de reservas ({reservations.length})</h2>
          {reservations.length === 0 ? (
            <p className="text-sm text-slate-400">Este huésped todavía no tiene reservas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2">Fechas</th>
                  <th className="py-2">Habitación</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">
                      <Link to={`/reservations/${r.id}`} className="text-slate-700 hover:text-brand-600">
                        {formatDate(r.checkInDate)} → {formatDate(r.checkOutDate)}
                      </Link>
                    </td>
                    <td className="py-2 text-slate-600">{r.room?.number}</td>
                    <td className="py-2">
                      <ReservationStatusBadge status={r.status} />
                    </td>
                    <td className="py-2 text-right font-medium text-slate-800">
                      {formatCurrency(Number(r.agreedPricePerNight) * r.nights, user?.hotel.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
