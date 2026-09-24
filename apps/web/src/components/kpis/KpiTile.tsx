import { Card } from '../ui/Card';
import clsx from 'clsx';

export function KpiTile({
  label,
  value,
  variationPct,
  goodDirection = 'up',
  formula,
}: {
  label: string;
  value: string;
  variationPct?: number | null;
  goodDirection?: 'up' | 'down';
  formula?: string;
}) {
  const hasVariation = variationPct != null && Number.isFinite(variationPct);
  const isPositive = hasVariation && variationPct! > 0;
  const isImprovement = hasVariation && (goodDirection === 'up' ? variationPct! > 0 : variationPct! < 0);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {formula && (
          <span title={formula} className="cursor-help text-xs text-slate-300 hover:text-slate-500">
            ⓘ
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hasVariation && (
        <p className={clsx('mt-1 text-xs font-medium', isImprovement ? 'text-emerald-600' : 'text-red-600')}>
          {isPositive ? '▲' : '▼'} {Math.abs(variationPct!).toFixed(1)}% vs. período anterior
        </p>
      )}
    </Card>
  );
}
