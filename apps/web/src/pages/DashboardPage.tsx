import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { DashboardToday } from '../lib/types';
import { KpiCard, Card } from '../components/ui/Card';
import { formatCurrency } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-today'],
    queryFn: async () => (await api.get<DashboardToday>('/dashboard/today')).data,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <p className="text-sm text-slate-400">Cargando dashboard...</p>;

  const { occupancy } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard operativo</h1>
        <p className="text-sm text-slate-500">Situación del hotel hoy — {new Date().toLocaleDateString('es-AR')}</p>
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-1.5">
          {data.alerts.map((alert, i) => (
            <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              ⚠ {alert}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Ocupación actual" value={`${occupancy.rate}%`} sub={`${occupancy.occupiedRooms} de ${occupancy.totalRooms} habitaciones`} />
        <KpiCard label="Disponibles" value={occupancy.availableRooms} tone="success" />
        <KpiCard label="Ocupadas" value={occupancy.occupiedRooms} />
        <KpiCard label="En limpieza" value={occupancy.cleaningRooms} tone={occupancy.cleaningRooms > 0 ? 'warning' : 'default'} />
        <KpiCard label="Mantenimiento" value={occupancy.maintenanceRooms} tone={occupancy.maintenanceRooms > 0 ? 'warning' : 'default'} />
        <KpiCard label="Fuera de servicio" value={occupancy.outOfServiceRooms} />
        <KpiCard label="Reservas pendientes" value={data.pendingReservations} sub="Consultas y pre-reservas" />
        <KpiCard label="Llegadas próx. 7 días" value={data.arrivalsNext7Days} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Check-ins de hoy ({data.checkInsToday.length})</h2>
          {data.checkInsToday.length === 0 ? (
            <p className="text-sm text-slate-400">Sin llegadas pendientes para hoy.</p>
          ) : (
            <ul className="space-y-2">
              {data.checkInsToday.map((r) => (
                <li key={r.id}>
                  <Link to={`/reservations/${r.id}`} className="flex justify-between text-sm text-slate-700 hover:text-brand-600">
                    <span>{r.guest}</span>
                    <span className="font-medium">Hab. {r.room}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Check-outs de hoy ({data.checkOutsToday.length})</h2>
          {data.checkOutsToday.length === 0 ? (
            <p className="text-sm text-slate-400">Sin salidas pendientes para hoy.</p>
          ) : (
            <ul className="space-y-2">
              {data.checkOutsToday.map((r) => (
                <li key={r.id}>
                  <Link to={`/reservations/${r.id}`} className="flex justify-between text-sm text-slate-700 hover:text-brand-600">
                    <span>{r.guest}</span>
                    <span className="font-medium">Hab. {r.room}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Pagos pendientes ({data.pendingPayments.length})</h2>
          {data.pendingPayments.length === 0 ? (
            <p className="text-sm text-slate-400">No hay saldos pendientes en reservas activas.</p>
          ) : (
            <ul className="space-y-2">
              {data.pendingPayments.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link to={`/reservations/${r.id}`} className="flex justify-between text-sm text-slate-700 hover:text-brand-600">
                    <span>
                      {r.guest} <span className="text-slate-400">· Hab. {r.room}</span>
                    </span>
                    <span className="font-medium text-red-600">{formatCurrency(r.balance, user?.hotel.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
