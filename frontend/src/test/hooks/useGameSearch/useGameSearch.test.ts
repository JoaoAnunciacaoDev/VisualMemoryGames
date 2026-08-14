import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameSearch } from '@/hooks/useGameSearch';
import api from '@/services/api';
import type { GameResult } from '@/types';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
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

describe('useGameSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('deve iniciar com estados padrão', () => {
    const { result } = renderHook(() => useGameSearch());
    expect(result.current.searchResults).toEqual([]);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.isAdding).toBe(false);
  });

  it('searchGames deve pesquisar e atualizar resultados', async () => {
    const mockResponse = { data: { results: [mockGame] } };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useGameSearch());

    await act(async () => {
      await result.current.searchGames('hollow');
    });

    expect(api.get).toHaveBeenCalledWith('/games/search', { params: { q: 'hollow', page: 1 } });
    expect(result.current.searchResults).toEqual([mockGame]);
    expect(result.current.hasSearched).toBe(true);
    expect(result.current.isSearching).toBe(false);
  });

  it('searchGames deve lidar com resposta sem .results', async () => {
    const mockResponse = { data: [mockGame] };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useGameSearch());

    await act(async () => {
      await result.current.searchGames('hollow');
    });

    expect(api.get).toHaveBeenCalledWith('/games/search', { params: { q: 'hollow', page: 1 } });
    expect(result.current.searchResults).toEqual([mockGame]);
  });

  it('loadMore deve paginar e acumular novos resultados', async () => {
    const firstPageItems: GameResult[] = Array.from({ length: 15 }, (_, i) => ({
      ...mockGame,
      external_id: 1000 + i,
      title: `Game ${i}`,
    }));

    const mockGame2: GameResult = {
      external_id: 10000,
      title: 'Hollow Knight: Silksong',
      cover_url: 'https://example.com/silksong.jpg',
      release_year: 2025,
      platforms: ['PC'],
      genres: ['Metroidvania'],
    };

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { results: firstPageItems } })
      .mockResolvedValueOnce({ data: { results: [mockGame2] } });

    const { result } = renderHook(() => useGameSearch());

    await act(async () => {
      await result.current.searchGames('hollow');
    });

    expect(result.current.searchResults).toEqual(firstPageItems);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(api.get).toHaveBeenLastCalledWith('/games/search', { params: { q: 'hollow', page: 2 } });
    expect(result.current.searchResults).toEqual([...firstPageItems, mockGame2]);
  });

  it('searchGames não deve pesquisar se o query tiver menos de 3 caracteres', async () => {
    const { result } = renderHook(() => useGameSearch());

    await act(async () => {
      await result.current.searchGames('ab');
    });

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.isSearching).toBe(false);
  });

  it('searchGames deve limpar resultados em caso de erro', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useGameSearch());

    await act(async () => {
      await result.current.searchGames('hollow');
    });

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.hasSearched).toBe(true);
    expect(result.current.isSearching).toBe(false);
  });

  it('clearResults deve limpar searchResults e hasSearched', () => {
    const { result } = renderHook(() => useGameSearch());

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  it('addGameToLibrary deve criar o jogo e adicionar à biblioteca', async () => {
    const mockGameId = 'game-id-123';
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: mockGameId } })
      .mockResolvedValueOnce({});

    const { result } = renderHook(() => useGameSearch());

    await act(async () => {
      await result.current.addGameToLibrary(mockGame);
    });

    expect(api.post).toHaveBeenNthCalledWith(1, '/games/', {
      external_id: mockGame.external_id,
      title: mockGame.title,
      cover_url: mockGame.cover_url,
      release_year: mockGame.release_year,
      platforms: mockGame.platforms,
      genres: mockGame.genres,
    });
    expect(api.post).toHaveBeenNthCalledWith(2, '/user-games/', { game_id: mockGameId });
    expect(result.current.isAdding).toBe(false);
  });

  it('addGameToLibrary deve reutilizar jogo existente em caso de 400', async () => {
    const mockGameId = 'existing-game-id';
    vi.mocked(api.post)
      .mockRejectedValueOnce({ response: { status: 400 } });
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: [{ external_id: mockGame.external_id, id: mockGameId, title: mockGame.title }] });
    vi.mocked(api.post)
      .mockResolvedValueOnce({});

    const { result } = renderHook(() => useGameSearch());

    await act(async () => {
      await result.current.addGameToLibrary(mockGame);
    });

    expect(api.get).toHaveBeenCalledWith('/games/');
    expect(api.post).toHaveBeenCalledWith('/user-games/', { game_id: mockGameId });
  });

  it('addGameToLibrary deve propagar erro desconhecido', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Fatal error'));

    const { result } = renderHook(() => useGameSearch());

    await expect(
      act(async () => {
        await result.current.addGameToLibrary(mockGame);
      })
    ).rejects.toThrow('Fatal error');
    expect(result.current.isAdding).toBe(false);
  });
});