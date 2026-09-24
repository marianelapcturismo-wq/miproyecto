import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Reservation, ReservationStatus } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ReservationStatusBadge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/format';
import { useAuth } from '../auth/AuthContext';
import { ReservationFormModal } from '../components/reservations/ReservationFormModal';

const STATUS_OPTIONS: ReservationStatus[] = ['CONSULTA', 'PRE_RESERVA', 'CONFIRMADA', 'CHECK_IN', 'CHECK_OUT', 'CANCELADA', 'NO_SHOW'];

export function ReservationsPage() {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', status],
    queryFn: async () => (await api.get<Reservation[]>('/reservations', { params: status ? { status } : {} })).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Reservas</h1>
          <p className="text-sm text-slate-500">Todas las reservas del hotel.</p>
        </div>
        {hasPermission('reservations.create') && <Button onClick={() => setShowForm(true)}>+ Nueva reserva</Button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatus('')} className={`rounded-full px-3 py-1 text-xs font-medium ${status === '' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          Todas
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 text-xs font-medium ${status === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {s}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <p className="p-4 text-sm text-slate-400">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Huésped</th>
                <th className="px-4 py-2">Habitación</th>
                <th className="px-4 py-2">Entrada</th>
                <th className="px-4 py-2">Salida</th>
                <th className="px-4 py-2">Canal</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {reservations?.map((r) => (
                <tr key={r.id} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50" onClick={() => navigate(`/reservations/${r.id}`)}>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {r.titularGuest.lastName}, {r.titularGuest.firstName}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.room.number}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(r.checkInDate)}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(r.checkOutDate)}</td>
                  <td className="px-4 py-2 text-slate-500 capitalize">{r.channel}</td>
                  <td className="px-4 py-2">
                    <ReservationStatusBadge status={r.status} />
                  </td>
                  <td className={`px-4 py-2 text-right font-medium ${r.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(r.balance, user?.hotel.currency)}
                  </td>
                </tr>
              ))}
              {reservations?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                    No hay reservas para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showForm && (
        <ReservationFormModal
          onClose={() => setShowForm(false)}
          onCreated={(id) => {
            setShowForm(false);
            navigate(`/reservations/${id}`);
          }}
        />
      )}
    </div>
  );
}
