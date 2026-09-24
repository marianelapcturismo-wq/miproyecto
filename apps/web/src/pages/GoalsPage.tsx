import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { GoalMetric, GoalProgress } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate, formatPercent, toDateInputValue } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

const METRIC_LABEL: Record<GoalMetric, string> = {
  OCUPACION: 'Ocupación (%)',
  ADR: 'ADR',
  REVPAR: 'RevPAR',
  INGRESOS: 'Ingresos totales',
  CANCELACIONES: 'Cancelaciones (máximo)',
  VENTA_DIRECTA_PCT: 'Participación venta directa (%)',
};

function formatMetricValue(metric: GoalMetric, value: number, currency?: string) {
  if (metric === 'ADR' || metric === 'REVPAR' || metric === 'INGRESOS') return formatCurrency(value, currency);
  if (metric === 'OCUPACION' || metric === 'VENTA_DIRECTA_PCT') return formatPercent(value);
  return value.toFixed(0);
}

export function GoalsPage() {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission('goals.manage');
  const currency = user?.hotel.currency;

  const { data: goals, isLoading } = useQuery({ queryKey: ['goals-progress'], queryFn: async () => (await api.get<GoalProgress[]>('/goals/progress')).data });

  const [showForm, setShowForm] = useState(false);
  const deleteGoal = useMutation({
    mutationFn: async (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals-progress'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Objetivos</h1>
          <p className="text-sm text-slate-500">Metas del hotel por período, comparadas contra el resultado real.</p>
        </div>
        {canManage && <Button onClick={() => setShowForm(true)}>+ Nuevo objetivo</Button>}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals?.map((g) => {
            const pct = Math.min(100, Math.max(0, g.achievedPct));
            return (
              <Card key={g.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{METRIC_LABEL[g.metric]}</h3>
                    <p className="text-xs text-slate-500">
                      {formatDate(g.periodStart)} → {formatDate(g.periodEnd)}
                    </p>
                  </div>
                  <Badge color={g.onTrack ? 'green' : 'red'}>{g.onTrack ? 'En objetivo' : 'Fuera de objetivo'}</Badge>
                </div>
                <div className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="text-slate-500">Real</span>
                  <span className="font-semibold text-slate-900">{formatMetricValue(g.metric, g.actualValue, currency)}</span>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-slate-500">Objetivo {g.isMaxTarget ? '(máximo)' : ''}</span>
                  <span className="text-slate-700">{formatMetricValue(g.metric, Number(g.targetValue), currency)}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${g.onTrack ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                </div>
                {g.notes && <p className="mt-2 text-xs text-slate-500">{g.notes}</p>}
                {canManage && (
                  <button onClick={() => deleteGoal.mutate(g.id)} className="mt-3 text-xs font-medium text-red-600 hover:underline">
                    Eliminar
                  </button>
                )}
              </Card>
            );
          })}
          {goals?.length === 0 && <p className="col-span-full py-6 text-center text-sm text-slate-400">No hay objetivos configurados todavía.</p>}
        </div>
      )}

      {showForm && <GoalFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}

function GoalFormModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const today = toDateInputValue(new Date());
  const [metric, setMetric] = useState<GoalMetric>('OCUPACION');
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [targetValue, setTargetValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => api.post('/goals', { metric, periodStart, periodEnd, targetValue, notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Modal title="Nuevo objetivo" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <FormField label="Indicador">
          <select className={inputClass} value={metric} onChange={(e) => setMetric(e.target.value as GoalMetric)}>
            {Object.entries(METRIC_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-x-3">
          <FormField label="Desde">
            <input type="date" className={inputClass} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </FormField>
          <FormField label="Hasta">
            <input type="date" className={inputClass} value={periodEnd} min={periodStart} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </FormField>
        </div>
        <FormField label="Valor objetivo">
          <input type="number" min={0} step="0.01" className={inputClass} value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} required />
        </FormField>
        <FormField label="Notas">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
