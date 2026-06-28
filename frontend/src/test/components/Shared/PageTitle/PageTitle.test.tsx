import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageTitle from '@/components/Shared/PageTitle/PageTitle';

describe('PageTitle', () => {
  it('renderiza como h1 por padrão', () => {
    render(<PageTitle>Título</PageTitle>);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Título');
  });

  it('renderiza como h2 quando level="h2"', () => {
    render(<PageTitle level="h2">Subtítulo</PageTitle>);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Subtítulo');
  });

  it('aplica className adicional', () => {
    render(<PageTitle className="extra">Título</PageTitle>);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('extra');
  });
});