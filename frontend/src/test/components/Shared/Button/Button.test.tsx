import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '@/components/Shared/Button/Button';

describe('Button', () => {
  it('renderiza o texto passado como children', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByRole('button', { name: /clique aqui/i })).toBeInTheDocument();
  });

  it('chama onClick quando clicado', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fica desabilitado quando a prop disabled é true', () => {
    render(<Button disabled>Desabilitado</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('aplica a classe fullWidth quando a prop é passada', () => {
    render(<Button fullWidth>Largo</Button>);
    expect(screen.getByRole('button')).toHaveClass('fullWidth');
  });
});