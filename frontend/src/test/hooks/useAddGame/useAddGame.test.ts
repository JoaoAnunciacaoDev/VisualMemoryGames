import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addGameToLibrary } from '@/hooks/useAddGame';
import api from '@/services/api';
import type { GameResult } from '@/types';

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
  },
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
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: mockGameId } })
      .mockResolvedValueOnce({ data: undefined });

    await addGameToLibrary(mockGame);

    expect(api.post).toHaveBeenNthCalledWith(1, '/games/', mockGame);
    expect(api.post).toHaveBeenCalledWith('/user-games/', { game_id: mockGameId });
  });

  it('deve propagar o erro se o registro no catálogo falhar', async () => {
    const error = new Error('Erro ao registar jogo');
    vi.mocked(api.post).mockRejectedValue(error);

    await expect(addGameToLibrary(mockGame)).rejects.toThrow('Erro ao registar jogo');
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
