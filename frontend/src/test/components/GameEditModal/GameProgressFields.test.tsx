import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameDateFields from '@/components/GameEditModal/GameDateFields';
import GameProgressFields from '@/components/GameEditModal/GameProgressFields';

describe('GameProgressFields', () => {
  it('identifica o status selecionado e permite alterá-lo', async () => {
    const onStatusChange = vi.fn();
    render(
      <GameProgressFields
        form={{ status: 'Jogando', store: 'STEAM', hours_played: 12 }}
        canReview
        activeEditField={null}
        disabled={false}
        onToggleEditField={vi.fn()}
        onStatusChange={onStatusChange}
        onFieldChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Jogando' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Zerado' }));
    expect(onStatusChange).toHaveBeenCalledWith('Zerado');
  });

  it('abre a edição da loja usando o teclado', () => {
    const onToggleEditField = vi.fn();
    render(
      <GameProgressFields
        form={{ status: 'Jogando', store: 'STEAM', hours_played: 12 }}
        canReview
        activeEditField={null}
        disabled={false}
        onToggleEditField={onToggleEditField}
        onStatusChange={vi.fn()}
        onFieldChange={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Editar loja' }), { key: 'Enter' });
    expect(onToggleEditField).toHaveBeenCalledWith('store');
  });
});

describe('GameDateFields', () => {
  const baseProps = {
    activeEditField: null,
    disabled: false,
    onToggleEditField: vi.fn(),
    onFieldChange: vi.fn(),
  };

  it('mostra conclusão e platina somente para o status Platinado', () => {
    const { rerender } = render(
      <GameDateFields {...baseProps} form={{ status: 'Jogando', acquired_at: null, started_at: null, finished_at: null, platinum_at: null }} canReview />,
    );
    expect(screen.queryByText('Data de conclusão')).not.toBeInTheDocument();
    expect(screen.queryByText('Platinado em')).not.toBeInTheDocument();

    rerender(
      <GameDateFields {...baseProps} form={{ status: 'Platinado', acquired_at: null, started_at: null, finished_at: null, platinum_at: null }} canReview />,
    );
    expect(screen.getByText('Data de conclusão')).toBeInTheDocument();
    expect(screen.getByText('Platinado em')).toBeInTheDocument();
  });

  it('sempre permite editar a data de aquisição pelo teclado', () => {
    const onToggleEditField = vi.fn();
    render(
      <GameDateFields
        {...baseProps}
        form={{ status: 'Na biblioteca', acquired_at: null, started_at: null, finished_at: null, platinum_at: null }}
        canReview={false}
        onToggleEditField={onToggleEditField}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Editar adquirido em' }), { key: 'Enter' });
    expect(onToggleEditField).toHaveBeenCalledWith('acquired_at');
  });
});
