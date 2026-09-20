import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminUserTable from '@/pages/Admin/AdminUserTable';
import type { User } from '@/types';

const user: User = {
  id: 'user-1', username: 'alice', email: 'alice@example.com', is_public: true,
  is_admin: false, is_deleted: false, games_count: 3, created_at: '2026-01-01',
};

describe('AdminUserTable', () => {
  it('renders users and delegates actions', () => {
    const onToggleAdmin = vi.fn();
    const onToggleActive = vi.fn();
    const onDelete = vi.fn();
    render(<AdminUserTable users={[user]} onToggleAdmin={onToggleAdmin} onToggleActive={onToggleActive} onDelete={onDelete} />);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tornar Admin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onToggleAdmin).toHaveBeenCalledWith(user);
    expect(onToggleActive).toHaveBeenCalledWith(user);
    expect(onDelete).toHaveBeenCalledWith(user);
  });

  it('renders the empty state', () => {
    render(<AdminUserTable users={[]} onToggleAdmin={vi.fn()} onToggleActive={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Nenhum usuário correspondente encontrado.')).toBeInTheDocument();
  });
});
