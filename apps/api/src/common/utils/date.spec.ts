import { addDays, diffDays, enumerateDays, startOfDay } from './date';

describe('date utils', () => {
  it('startOfDay trunca a medianoche UTC', () => {
    const d = new Date('2026-03-15T18:42:07.123Z');
    const result = startOfDay(d);
    expect(result.toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('addDays suma (o resta) días en UTC', () => {
    const base = new Date('2026-01-31T00:00:00.000Z');
    expect(addDays(base, 1).toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(addDays(base, -31).toISOString()).toBe('2025-12-31T00:00:00.000Z');
  });

  it('diffDays calcula la cantidad de días entre dos fechas', () => {
    expect(diffDays(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-04T00:00:00Z'))).toBe(3);
    expect(diffDays(new Date('2026-01-04T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))).toBe(-3);
  });

  it('enumerateDays devuelve un día por cada fecha en [from, to), to exclusivo', () => {
    const days = enumerateDays(new Date('2026-06-01T00:00:00Z'), new Date('2026-06-04T00:00:00Z'));
    expect(days).toHaveLength(3);
    expect(days.map((d) => d.toISOString().slice(0, 10))).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });

  it('enumerateDays devuelve un array vacío si from >= to', () => {
    const days = enumerateDays(new Date('2026-06-04T00:00:00Z'), new Date('2026-06-01T00:00:00Z'));
    expect(days).toHaveLength(0);
  });
});
