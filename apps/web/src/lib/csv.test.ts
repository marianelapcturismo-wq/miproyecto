import { describe, expect, it } from 'vitest';
import { buildCsvContent } from './csv';

describe('buildCsvContent', () => {
  it('genera encabezados y filas separados por coma', () => {
    const csv = buildCsvContent(['Nombre', 'Monto'], [['Juan Pérez', 1000]]);
    expect(csv).toContain('Nombre,Monto');
    expect(csv).toContain('Juan Pérez,1000');
  });

  it('entrecomilla celdas que contienen comas', () => {
    const csv = buildCsvContent(['Canal'], [['Booking, directo']]);
    expect(csv).toContain('"Booking, directo"');
  });

  it('escapa comillas dobles duplicándolas', () => {
    const csv = buildCsvContent(['Nota'], [['Dijo "hola"']]);
    expect(csv).toContain('"Dijo ""hola"""');
  });

  it('incluye el BOM UTF-8 para que Excel abra los acentos correctamente', () => {
    const csv = buildCsvContent(['Habitación'], [['Doble']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});
