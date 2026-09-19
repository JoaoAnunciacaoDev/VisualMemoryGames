import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PatchNoteList from '@/pages/PatchNotes/PatchNoteList';
import type { PatchNote } from '@/features/patch-notes/queries';

const patch: PatchNote = {
  id: 'patch-1', title: 'Versão 2', content: '**Melhorias**', author_id: 'admin-1',
  created_at: '2026-01-01T10:00:00Z', updated_at: '2026-01-01T10:05:00Z',
  author: { id: 'admin-1', username: 'admin' },
};

describe('PatchNoteList', () => {
  it('renders patch metadata and admin actions', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<PatchNoteList patches={[patch]} isAdmin onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('Versão 2')).toBeInTheDocument();
    expect(screen.getByText(/Editado em/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onEdit).toHaveBeenCalledWith(patch);
    expect(onDelete).toHaveBeenCalledWith(patch);
  });

  it('renders the empty state', () => {
    render(<PatchNoteList patches={[]} isAdmin={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Nenhuma nota de atualização publicada ainda.')).toBeInTheDocument();
  });
});
