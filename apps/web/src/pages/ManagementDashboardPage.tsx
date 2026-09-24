import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ChannelReport, ConsumptionsReport, GuestsReport, KpiSeriesPoint, KpiSummary, RoomType } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { KpiTile } from '../components/kpis/KpiTile';
import { BarChart } from '../components/charts/BarChart';
import { formatCurrency, formatDate, formatPercent, startOfTodayUTC, addDaysUTC, toDateInputValue } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { useAuth } from '../auth/AuthContext';

type Preset = '7d' | '30d' | 'month' | '90d' | 'custom';

function computeRange(preset: Preset, customFrom: string, customTo: string) {
  const today = startOfTodayUTC();
  const tomorrow = addDaysUTC(today, 1);
  switch (preset) {
    case '7d':
      return { from: addDaysUTC(today, -6), to: tomorrow };
    case '30d':
      return { from: addDaysUTC(today, -29), to: tomorrow };
    case '90d':
      return { from: addDaysUTC(today, -89), to: tomorrow };
    case 'month': {
      const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return { from: monthStart, to: tomorrow };
    }
    case 'custom':
      return { from: new Date(customFrom), to: addDaysUTC(new Date(customTo), 1) };
  }
}

const METRIC_TABS = [
  { key: 'occupancyRate', label: 'Ocupación', color: '#2563eb', formatter: (v: number) => formatPercent(v) },
  { key: 'adr', label: 'ADR', color: '#0891b2', formatter: (v: number) => formatCurrency(v) },
  { key: 'revpar', label: 'RevPAR', color: '#7c3aed', formatter: (v: number) => formatCurrency(v) },
  { key: 'totalRevenue', label: 'Ingresos', color: '#059669', formatter: (v: number) => formatCurrency(v) },
] as const;

export function ManagementDashboardPage() {
  const { user } = useAuth();
  const currency = user?.hotel.currency;
  const [preset, setPreset] = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState(toDateInputValue(addDaysUTC(startOfTodayUTC(), -30)));
  const [customTo, setCustomTo] = useState(toDateInputValue(startOfTodayUTC()));
  const [compare, setCompare] = useState<'previous_period' | 'previous_year' | 'none'>('previous_period');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [metricTab, setMetricTab] = useState<(typeof METRIC_TABS)[number]['key']>('occupancyRate');

  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const fromStr = toDateInputValue(range.from);
  const toStr = toDateInputValue(range.to);

  const { data: roomTypes } = useQuery({ queryKey: ['room-types'], queryFn: async () => (await api.get<RoomType[]>('/room-types')).data });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['kpi-summary', fromStr, toStr, compare, roomTypeId],
    queryFn: async () => (await api.get<KpiSummary>('/kpis/summary', { params: { from: fromStr, to: toStr, compare, roomTypeId: roomTypeId || undefined } })).data,
  });
  const { data: series } = useQuery({
    queryKey: ['kpi-series', fromStr, toStr, roomTypeId],
    queryFn: async () => (await api.get<KpiSeriesPoint[]>('/kpis/series', { params: { from: fromStr, to: toStr, roomTypeId: roomTypeId || undefined, compare: 'none' } })).data,
  });
  const { data: channels } = useQuery({
    queryKey: ['kpi-channels', fromStr, toStr, roomTypeId],
    queryFn: async () => (await api.get<ChannelReport[]>('/kpis/channels', { params: { from: fromStr, to: toStr, roomTypeId: roomTypeId || undefined } })).data,
  });
  const { data: guestsReport } = useQuery({
    queryKey: ['kpi-guests', fromStr, toStr],
    queryFn: async () => (await api.get<GuestsReport>('/kpis/guests', { params: { from: fromStr, to: toStr } })).data,
  });
  const { data: consumptionsReport } = useQuery({
    queryKey: ['kpi-consumptions', fromStr, toStr],
    queryFn: async () => (await api.get<ConsumptionsReport>('/kpis/consumptions', { params: { from: fromStr, to: toStr } })).data,
  });

  const chartData = useMemo(() => {
    if (!series) return [];
    return series.map((p) => ({
      label: formatDate(p.date).slice(0, 5),
      value: metricTab === 'totalRevenue' ? p.roomRevenue + p.otherRevenue : p[metricTab as 'occupancyRate' | 'adr' | 'revpar'],
    }));
  }, [series, metricTab]);

  const activeTab = METRIC_TABS.find((t) => t.key === metricTab)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard gerencial</h1>
        <p className="text-sm text-slate-500">Ocupación, ADR, RevPAR e ingresos — con comparación contra un período anterior.</p>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex flex-wrap gap-1">
          {(['7d', '30d', 'month', '90d', 'custom'] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${preset === p ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {{ '7d': '7 días', '30d': '30 días', month: 'Mes actual', '90d': '90 días', custom: 'Personalizado' }[p]}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="rounded-lg border border-slate-300 px-2 py-1 text-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-slate-400">→</span>
            <input type="date" className="rounded-lg border border-slate-300 px-2 py-1 text-sm" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <select className="rounded-lg border border-slate-300 px-2 py-1 text-sm" value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
            <option value="">Todos los tipos</option>
            {roomTypes?.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-slate-300 px-2 py-1 text-sm" value={compare} onChange={(e) => setCompare(e.target.value as typeof compare)}>
            <option value="previous_period">vs. período anterior</option>
            <option value="previous_year">vs. mismo período año anterior</option>
            <option value="none">Sin comparación</option>
          </select>
        </div>
      </Card>

      {loadingSummary || !summary ? (
        <p className="text-sm text-slate-400">Calculando indicadores...</p>
      ) : (
        <>
          {summary.alerts.length > 0 && (
            <div className="space-y-1.5">
              {summary.alerts.map((alert, i) => (
                <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  ⚠ {alert}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile
              label="Ocupación"
              value={formatPercent(summary.occupancyRate.current)}
              variationPct={summary.occupancyRate.percent}
              formula="Ocupación = habitaciones vendidas ÷ habitaciones disponibles × 100"
            />
            <KpiTile
              label="ADR"
              value={formatCurrency(summary.adr.current, currency)}
              variationPct={summary.adr.percent}
              formula="ADR (tarifa promedio diaria) = ingresos por habitaciones ÷ habitaciones vendidas"
            />
            <KpiTile
              label="RevPAR"
              value={formatCurrency(summary.revpar.current, currency)}
              variationPct={summary.revpar.percent}
              formula="RevPAR = ingresos por habitaciones ÷ habitaciones disponibles (= ADR × Ocupación)"
            />
            <KpiTile
              label="Ingresos totales"
              value={formatCurrency(summary.totalRevenue.current, currency)}
              variationPct={summary.totalRevenue.percent}
              formula="Ingresos totales = ingresos por alojamiento + consumos y servicios"
            />
          </div>

          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {METRIC_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setMetricTab(t.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${metricTab === t.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  series &&
                  downloadCsv(
                    `serie-${metricTab}-${fromStr}-${toStr}.csv`,
                    ['Fecha', 'Ocupación %', 'ADR', 'RevPAR', 'Ingresos alojamiento', 'Ingresos consumos'],
                    series.map((p) => [toDateInputValue(p.date), p.occupancyRate.toFixed(1), Math.round(p.adr), Math.round(p.revpar), Math.round(p.roomRevenue), Math.round(p.otherRevenue)]),
                  )
                }
              >
                Exportar CSV
              </Button>
            </div>
            <BarChart data={chartData} color={activeTab.color} valueFormatter={activeTab.formatter} />
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile label="Reservas" value={String(summary.reservations.total.current)} variationPct={summary.reservations.total.percent} />
            <KpiTile label="Canceladas" value={String(summary.reservations.cancelled.current)} variationPct={summary.reservations.cancelled.percent} goodDirection="down" />
            <KpiTile label="No show" value={String(summary.reservations.noShow.current)} variationPct={summary.reservations.noShow.percent} goodDirection="down" />
            <KpiTile label="Tasa cancelación" value={formatPercent(summary.reservations.cancellationRate.current)} variationPct={summary.reservations.cancellationRate.percent} goodDirection="down" />
            <KpiTile label="Estadía promedio" value={`${summary.reservations.avgStayNights.current.toFixed(1)} noches`} variationPct={summary.reservations.avgStayNights.percent} />
            <KpiTile label="Anticipación promedio" value={`${summary.reservations.avgLeadTimeDays.current.toFixed(0)} días`} variationPct={summary.reservations.avgLeadTimeDays.percent} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-4 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Canales de venta</h2>
                {channels && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      downloadCsv(
                        `canales-${fromStr}-${toStr}.csv`,
                        ['Canal', 'Reservas', 'Participación %', 'Cancelaciones', 'Ingreso bruto', 'Ingreso neto', 'Comisión %'],
                        channels.map((c) => [c.channelName, c.reservationsCount, c.participationPct.toFixed(1), c.cancelledCount, Math.round(c.grossRevenue), Math.round(c.netRevenue), c.commissionPct]),
                      )
                    }
                  >
                    Exportar CSV
                  </Button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2">Canal</th>
                    <th className="py-2 text-right">Reservas</th>
                    <th className="py-2 text-right">Particip.</th>
                    <th className="py-2 text-right">Cancel.</th>
                    <th className="py-2 text-right">Ingreso bruto</th>
                    <th className="py-2 text-right">Ingreso neto</th>
                  </tr>
                </thead>
                <tbody>
                  {channels?.map((c) => (
                    <tr key={c.channelId} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 font-medium text-slate-900">{c.channelName}</td>
                      <td className="py-2 text-right text-slate-700">{c.reservationsCount}</td>
                      <td className="py-2 text-right text-slate-600">{formatPercent(c.participationPct)}</td>
                      <td className="py-2 text-right text-slate-600">{c.cancelledCount}</td>
                      <td className="py-2 text-right text-slate-800">{formatCurrency(c.grossRevenue, currency)}</td>
                      <td className="py-2 text-right text-slate-500" title={`Comisión ${c.commissionPct}%`}>
                        {formatCurrency(c.netRevenue, currency)}
                      </td>
                    </tr>
                  ))}
                  {channels?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Sin reservas en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            <div className="space-y-4">
              <Card className="p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Huéspedes</h2>
                {guestsReport ? (
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Huéspedes distintos</dt>
                      <dd className="text-slate-800">{guestsReport.distinctGuests}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Nuevos</dt>
                      <dd className="text-slate-800">{guestsReport.newGuests}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Recurrentes</dt>
                      <dd className="text-slate-800">{guestsReport.recurringGuests}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Tasa de repetición</dt>
                      <dd className="text-slate-800">{formatPercent(guestsReport.repeatRatePct)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Gasto promedio/estadía</dt>
                      <dd className="text-slate-800">{formatCurrency(guestsReport.avgSpendPerStay, currency)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-slate-400">Cargando...</p>
                )}
              </Card>

              <Card className="p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Consumos y servicios</h2>
                {consumptionsReport ? (
                  <>
                    <p className="mb-2 text-sm text-slate-600">
                      Ingreso total: <span className="font-semibold text-slate-900">{formatCurrency(consumptionsReport.totalRevenue, currency)}</span>
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {consumptionsReport.services.slice(0, 5).map((s) => (
                        <li key={s.serviceId} className="flex justify-between">
                          <span>{s.name}</span>
                          <span>{formatCurrency(s.revenue, currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">Cargando...</p>
                )}
              </Card>
            </div>
          </div>

          <Card className="p-4 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Rentabilidad (GOP / GOPPAR)</p>
            <p className="mt-1">Este indicador requiere registrar los costos operativos del hotel (personal, insumos, gastos fijos), que todavía no se cargan en el sistema. Cuando existan esos datos, se calculará como parte de esta misma pantalla.</p>
          </Card>
        </>
      )}
    </div>
  );
}
