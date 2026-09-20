import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameEditHeader from '@/components/GameEditModal/GameEditHeader';
import type { LibraryGame } from '@/types';

const game: LibraryGame = {
  id: 'library-game-1',
  game_id: 'game-1',
  external_id: null,
  title: 'Jogo manual',
  cover_url: null,
  custom_cover_url: null,
  release_year: 2025,
  status: 'Jogando',
  rating: null,
  favorite: false,
  hours_played: null,
  store: null,
  acquired_at: null,
  started_at: null,
  finished_at: null,
  platinum_at: null,
  notes: null,
  is_manual: true,
  platforms: [],
  genres: [],
};

const defaultProps = {
  game,
  displayCover: null,
  editTitle: 'Jogo manual',
  setEditTitle: vi.fn(),
  editReleaseYear: '2025',
  setEditReleaseYear: vi.fn(),
  status: 'Jogando',
  favorite: false,
  activeEditField: null,
  disabled: false,
  closeDisabled: false,
  onToggleEditField: vi.fn(),
  onFavoriteChange: vi.fn(),
  onClose: vi.fn(),
};

describe('GameEditHeader', () => {
  it('abre a edição de capa por um botão acessível', async () => {
    const onToggleEditField = vi.fn();
    render(<GameEditHeader {...defaultProps} onToggleEditField={onToggleEditField} />);

    await userEvent.click(screen.getByRole('button', { name: 'Alterar capa' }));
    expect(onToggleEditField).toHaveBeenCalledWith('cover');
  });

  it('permite iniciar a edição do título usando o teclado', () => {
    const onToggleEditField = vi.fn();
    render(<GameEditHeader {...defaultProps} onToggleEditField={onToggleEditField} />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Editar título do jogo' }), { key: 'Enter' });
    expect(onToggleEditField).toHaveBeenCalledWith('title');
  });

  it('expõe o estado de favorito no nome do botão', async () => {
    const onFavoriteChange = vi.fn();
    render(<GameEditHeader {...defaultProps} onFavoriteChange={onFavoriteChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar aos favoritos' }));
    expect(onFavoriteChange).toHaveBeenCalledWith(true);
  });
});
