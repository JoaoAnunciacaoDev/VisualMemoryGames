import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameEditModal from '@/components/GameEditModal/GameEditModal';
import { useGameEditForm } from '@/hooks/useGameEditForm';
import type { LibraryGame } from '@/types';

vi.mock('@/hooks/useGameEditForm');
vi.mock('@/hooks/useConfirmAction', () => ({
  useConfirmAction: () => ({ isOpen: false, open: vi.fn(), close: vi.fn() }),
}));
vi.mock('@/components/RatingStars/RatingStars', () => ({
  default: ({ value }: { value: number | null }) => <div data-testid="rating-stars">Rating: {value}</div>,
}));

const mockGame: LibraryGame = {
  id: 'ug-1', game_id: 'game-1', external_id: 100, title: 'Zelda Breath of the Wild',
  cover_url: 'https://example.com/zelda.jpg', custom_cover_url: null, release_year: 2017,
  status: 'Zerado', rating: 9, favorite: false, hours_played: 50, store: 'Steam',
  acquired_at: '2023-01-15', started_at: '2023-02-01', finished_at: '2023-06-20',
  platinum_at: null, notes: 'Jogo incrível!', is_manual: false, platforms: ['Nintendo Switch'],
  genres: ['Action', 'Adventure'],
};

const baseForm = {
  form: {
    status: 'Zerado', rating: 9, favorite: false, hours_played: 50, store: 'Steam',
    acquired_at: '2023-01-15', started_at: '2023-02-01', finished_at: '2023-06-20',
    platinum_at: '', custom_cover_url: '', notes: 'Jogo incrível!',
  },
  coverFile: null,
  editTitle: 'Zelda Breath of the Wild',
  setEditTitle: vi.fn(),
  editReleaseYear: '2017',
  setEditReleaseYear: vi.fn(),
  editPlatforms: 'Nintendo Switch',
  setEditPlatforms: vi.fn(),
  editGenres: 'Action, Adventure',
  setEditGenres: vi.fn(),
  canReview: true,
  updateField: vi.fn(),
  handleStatusChange: vi.fn(),
  handleFileChange: vi.fn(),
  handleUrlChange: vi.fn(),
  clearCoverFile: vi.fn(),
  handleSave: vi.fn().mockResolvedValue({ status: 'Zerado', rating: 9 }),
  displayCover: 'https://example.com/zelda.jpg',
};

describe('GameEditModal', () => {
  const onSave = vi.fn();
  const onRemove = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGameEditForm).mockReturnValue(baseForm);
  });

  function renderModal(game: LibraryGame = mockGame) {
    return render(<GameEditModal game={game} onSave={onSave} onRemove={onRemove} onClose={onClose} />);
  }

  it('deve esconder campos de review quando status é Quero Jogar', () => {
    vi.mocked(useGameEditForm).mockReturnValue({
      ...baseForm,
      form: { ...baseForm.form, status: 'Quero Jogar', rating: null, finished_at: '', notes: '', platinum_at: '' },
      canReview: false,
    });
    renderModal({ ...mockGame, status: 'Quero Jogar' });

    expect(screen.queryByText('Data de início')).toBeNull();
    expect(screen.queryByText('Data de conclusão')).toBeNull();
    expect(screen.queryByText('Platinado em')).toBeNull();
    expect(screen.queryByText('Horas jogadas')).toBeNull();
    expect(screen.queryByTestId('rating-stars')).toBeNull();
    expect(screen.queryByText('Comentário')).toBeNull();
  });

  it('deve mostrar data de conclusão e platinado para status Platinado', () => {
    vi.mocked(useGameEditForm).mockReturnValue({
      ...baseForm,
      form: { ...baseForm.form, status: 'Platinado', platinum_at: '2023-07-01' },
    });
    renderModal({ ...mockGame, status: 'Platinado', platinum_at: '2023-07-01' });

    expect(screen.getByText('Data de conclusão')).toBeInTheDocument();
    expect(screen.getByText('Platinado em')).toBeInTheDocument();
  });

  it('deve mostrar campo de platinado apenas para status Platinado', () => {
    vi.mocked(useGameEditForm).mockReturnValue({
      ...baseForm,
      form: { ...baseForm.form, status: 'Platinado', platinum_at: '2023-07-01' },
    });
    renderModal({ ...mockGame, status: 'Platinado', platinum_at: '2023-07-01' });

    expect(screen.getByText('Platinado em')).toBeInTheDocument();
  });
});