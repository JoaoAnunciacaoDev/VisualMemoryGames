import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addGameToLibrary } from '@/hooks/useAddGame';
import api from '@/services/api';
import { ensureGameRecord } from '@/services/gameCatalog';
import type { GameResult } from '@/types';

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/services/gameCatalog', () => ({
  ensureGameRecord: vi.fn(),
}));

const mockGame: GameResult = {
  external_id: 9999,
  title: 'Hollow Knight',
  cover_url: 'https://example.com/hollow_knight.jpg',
  release_year: 2017,
  platforms: ['PC', 'Nintendo Switch'],
  genres: ['Metroidvania', 'Action'],
};

describe('addGameToLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve registar o jogo no catálogo e adicionar à biblioteca', async () => {
    const mockGameId = 'game-id-123';
    vi.mocked(ensureGameRecord).mockResolvedValue(mockGameId);
    vi.mocked(api.post).mockResolvedValue({});

    await addGameToLibrary(mockGame);

    expect(ensureGameRecord).toHaveBeenCalledWith(mockGame);
    expect(api.post).toHaveBeenCalledWith('/user-games/', { game_id: mockGameId });
  });

  it('deve propagar o erro se ensureGameRecord falhar', async () => {
    const error = new Error('Erro ao registar jogo');
    vi.mocked(ensureGameRecord).mockRejectedValue(error);

    await expect(addGameToLibrary(mockGame)).rejects.toThrow('Erro ao registar jogo');
    expect(api.post).not.toHaveBeenCalled();
  });
});