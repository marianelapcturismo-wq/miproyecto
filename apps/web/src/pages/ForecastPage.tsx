import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Forecast } from '../lib/types';
import { Card } from '../components/ui/Card';
import { KpiTile } from '../components/kpis/KpiTile';
import { BarChart } from '../components/charts/BarChart';
import { formatCurrency, formatDate, formatPercent } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

export function ForecastPage() {
  const { user } = useAuth();
  const [days, setDays] = useState<7 | 30 | 90>(7);

  const { data: forecast, isLoading } = useQuery({
    queryKey: ['forecast', days],
    queryFn: async () => (await api.get<Forecast>('/forecast', { params: { days } })).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pronóstico</h1>
          <p className="text-sm text-slate-500">Situación futura según reservas confirmadas, pre-reservas y estadías en curso.</p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as 7 | 30 | 90)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${days === d ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {isLoading || !forecast ? (
        <p className="text-sm text-slate-400">Calculando pronóstico...</p>
      ) : (
        <>
          {forecast.lowDemandDates.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              ⚠ {forecast.lowDemandDates.length} día(s) con ocupación proyectada por debajo del 30% en los próximos {days} días.
              {days <= 30 && (
                <span className="ml-1">
                  ({forecast.lowDemandDates.slice(0, 6).map((d) => formatDate(d)).join(', ')}
                  {forecast.lowDemandDates.length > 6 ? '…' : ''})
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile label="Ocupación proyectada promedio" value={formatPercent(forecast.avgOccupancyRate)} />
            <KpiTile label="Llegadas" value={String(forecast.totalArrivals)} />
            <KpiTile label="Salidas" value={String(forecast.totalDepartures)} />
            <KpiTile label="Ingresos proyectados" value={formatCurrency(forecast.totalProjectedRevenue, user?.hotel.currency)} />
          </div>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Ocupación proyectada por día</h2>
            <BarChart
              data={forecast.days.map((d) => ({ label: formatDate(d.date).slice(0, 5), value: d.occupancyRate }))}
              color="#2563eb"
              valueFormatter={(v) => formatPercent(v)}
              maxValue={100}
            />
          </Card>

          {days === 7 && (
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2 text-right">Ocupación</th>
                    <th className="px-4 py-2">Llegadas</th>
                    <th className="px-4 py-2">Salidas</th>
                    <th className="px-4 py-2 text-right">Ingresos previstos</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.days.map((d) => (
                    <tr key={d.date} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 font-medium text-slate-900">{formatDate(d.date)}</td>
                      <td className={`px-4 py-2 text-right ${d.occupancyRate < 30 ? 'text-amber-600' : 'text-slate-700'}`}>{formatPercent(d.occupancyRate)}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {d.arrivals.length === 0 ? '—' : d.arrivals.map((a) => `${a.guest} (${a.room})`).join(', ')}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {d.departures.length === 0 ? '—' : d.departures.map((a) => `${a.guest} (${a.room})`).join(', ')}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-800">{formatCurrency(d.projectedRevenue, user?.hotel.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
