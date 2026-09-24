import { describe, expect, it } from 'vitest';
import { addDaysUTC, formatCurrency, formatDate, formatPercent, startOfTodayUTC, toDateInputValue } from './format';

describe('formatCurrency', () => {
  it('formatea en pesos argentinos sin decimales', () => {
    expect(formatCurrency(45000)).toContain('45.000');
  });

  it('acepta un monto como string', () => {
    expect(formatCurrency('12500')).toContain('12.500');
  });
});

describe('formatDate', () => {
  it('formatea dd/mm/aaaa en zona UTC', () => {
    expect(formatDate('2026-03-05T00:00:00.000Z')).toBe('05/03/2026');
  });
});

describe('formatPercent', () => {
  it('redondea a un decimal por defecto', () => {
    expect(formatPercent(39.777)).toBe('39.8%');
  });

  it('respeta la cantidad de dígitos pedida', () => {
    expect(formatPercent(39.777, 0)).toBe('40%');
  });
});

describe('toDateInputValue / addDaysUTC / startOfTodayUTC', () => {
  it('toDateInputValue devuelve YYYY-MM-DD', () => {
    expect(toDateInputValue('2026-01-05T15:30:00.000Z')).toBe('2026-01-05');
  });

  it('addDaysUTC suma días sin verse afectado por husos horarios locales', () => {
    const base = new Date('2026-01-31T00:00:00.000Z');
    expect(toDateInputValue(addDaysUTC(base, 1))).toBe('2026-02-01');
  });

  it('startOfTodayUTC siempre devuelve una fecha a medianoche UTC', () => {
    const today = startOfTodayUTC();
    expect(today.getUTCHours()).toBe(0);
    expect(today.getUTCMinutes()).toBe(0);
  });
});
