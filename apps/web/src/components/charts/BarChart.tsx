interface BarChartDatum {
  label: string;
  value: number;
  tooltip?: string;
}

export function BarChart({
  data,
  height = 160,
  color = '#2563eb',
  valueFormatter = (v: number) => String(Math.round(v)),
  maxValue,
}: {
  data: BarChartDatum[];
  height?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
  maxValue?: number;
}) {
  if (data.length === 0) return <p className="text-sm text-slate-400">Sin datos para graficar.</p>;

  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;
  const labelStep = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} x2={100} y1={height * (1 - f)} y2={height * (1 - f)} stroke="#e2e8f0" strokeWidth={0.3} />
        ))}
        {data.map((d, i) => {
          const barHeight = max > 0 ? (d.value / max) * (height - 4) : 0;
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.15}
              y={height - barHeight}
              width={barWidth * 0.7}
              height={barHeight}
              fill={color}
              rx={0.6}
            >
              <title>
                {d.label}: {valueFormatter(d.value)}
              </title>
            </rect>
          );
        })}
      </svg>
      <div className="relative mt-1 h-4 text-[10px] text-slate-400">
        {data.map((d, i) =>
          i % labelStep === 0 ? (
            <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${i * barWidth + barWidth / 2}%` }}>
              {d.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
