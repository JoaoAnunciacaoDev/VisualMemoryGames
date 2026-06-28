import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from '@/components/Shared/Card/Card';

describe('Card', () => {
  it('renderiza children', () => {
    render(<Card><p>Conteúdo do card</p></Card>);
    expect(screen.getByText('Conteúdo do card')).toBeInTheDocument();
  });

  it('chama onClick quando clicado', async () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Card</Card>);
    await userEvent.click(screen.getByText('Card'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('aplica className adicional', () => {
    render(<Card className="extra">Card</Card>);
    expect(screen.getByText('Card').closest('div')).toHaveClass('extra');
  });
});