import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarChart } from './BarChart';

describe('BarChart', () => {
  it('muestra un mensaje cuando no hay datos', () => {
    render(<BarChart data={[]} />);
    expect(screen.getByText('Sin datos para graficar.')).toBeInTheDocument();
  });

  it('dibuja una barra por cada punto de datos', () => {
    const { container } = render(
      <BarChart data={[{ label: '01/09', value: 10 }, { label: '02/09', value: 20 }, { label: '03/09', value: 5 }]} />,
    );
    expect(container.querySelectorAll('rect')).toHaveLength(3);
  });

  it('muestra las etiquetas visibles según el paso calculado', () => {
    render(<BarChart data={[{ label: 'A', value: 1 }, { label: 'B', value: 2 }]} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
