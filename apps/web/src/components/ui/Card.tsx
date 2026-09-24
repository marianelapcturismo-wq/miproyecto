import { ReactNode } from 'react';
import clsx from 'clsx';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function KpiCard({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: string; tone?: 'default' | 'warning' | 'success' }) {
  const toneClasses = {
    default: 'text-slate-900',
    warning: 'text-amber-600',
    success: 'text-emerald-600',
  }[tone];
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={clsx('mt-1 text-2xl font-semibold', toneClasses)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}
