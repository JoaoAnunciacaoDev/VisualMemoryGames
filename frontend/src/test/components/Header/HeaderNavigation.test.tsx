import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HeaderNavigation from '@/components/Header/HeaderNavigation';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

describe('HeaderNavigation', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('opens the compact menu and closes it after navigation', () => {
    render(<HeaderNavigation isAdmin={false} />);

    const menuButton = screen.getByRole('button', { name: 'Abrir menu de navegação' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuButton);
    expect(screen.getByRole('button', { name: 'Fechar menu de navegação' }))
      .toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Biblioteca' }));

    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/library' }));
    expect(screen.getByRole('button', { name: 'Abrir menu de navegação' }))
      .toHaveAttribute('aria-expanded', 'false');
  });

  it('only shows the admin destination to administrators', () => {
    const { rerender } = render(<HeaderNavigation isAdmin={false} />);
    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();

    rerender(<HeaderNavigation isAdmin />);
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
  });
});
