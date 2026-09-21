import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLibrary } from '@/hooks/useLibrary';
import api from '@/services/api';
import { TestQueryProvider } from '@/test/TestRouter';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGames = [
  {
    id: 'ug1', game_id: 'g1', external_id: 101, title: 'Zelda Breath of the Wild',
    cover_url: null, release_year: 2017, rating: 10, status: 'Zerado',
    started_at: null, finished_at: null, acquired_at: null, platinum_at: null,
    hours_played: 120, store: null, custom_cover_url: null, favorite: false, notes: null,
    is_manual: false, platforms: [], genres: [],
  },
  {
    id: 'ug2', game_id: 'g2', external_id: 102, title: 'Hollow Knight',
    cover_url: null, release_year: 2018, rating: 9.5, status: 'Platinado',
    started_at: null, finished_at: null, acquired_at: null, platinum_at: null,
    hours_played: 80, store: null, custom_cover_url: null, favorite: true, notes: null,
    is_manual: false, platforms: [], genres: [],
  },
];

describe('useLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar a biblioteca com sucesso', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockGames });

    const { result } = renderHook(() => useLibrary(), { wrapper: TestQueryProvider });

    await waitFor(() => {
      expect(result.current.games).toEqual(mockGames);
    });

    expect(api.get).toHaveBeenCalledWith('/user-games/me', {
      params: { offset: 0, limit: 100 },
    });
  });

  it('deve carregar mesmo se o userId for vazio', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockGames });
    const { result } = renderHook(() => useLibrary(), { wrapper: TestQueryProvider });

    await waitFor(() => {
      expect(result.current.games).toEqual(mockGames);
    });

    expect(api.get).toHaveBeenCalledWith('/user-games/me', {
      params: { offset: 0, limit: 100 },
    });
  });

  it('updateGame deve atualizar um jogo e recarregar a biblioteca', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockGames });
    vi.mocked(api.put).mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useLibrary(), { wrapper: TestQueryProvider });

    await waitFor(() => {
      expect(result.current.games).toEqual(mockGames);
    });

    await act(async () => {
      await result.current.updateGame('ug1', { rating: 8 });
    });

    expect(api.put).toHaveBeenCalledWith(`/user-games/ug1`, { rating: 8 });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('removeGame deve remover um jogo e recarregar a biblioteca', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockGames });
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useLibrary(), { wrapper: TestQueryProvider });

    await waitFor(() => {
      expect(result.current.games).toEqual(mockGames);
    });

    await act(async () => {
      await result.current.removeGame('ug1');
    });

    expect(api.delete).toHaveBeenCalledWith(`/user-games/ug1`);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('deve expor a função loadLibrary para recarga manual', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockGames });
    const { result } = renderHook(() => useLibrary(), { wrapper: TestQueryProvider });

    await waitFor(() => {
      expect(result.current.games).toEqual(mockGames);
    });

    vi.mocked(api.get).mockResolvedValueOnce({ data: [mockGames[0]] });
    await act(async () => {
      await result.current.loadLibrary();
    });

    expect(api.get).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.games).toEqual([mockGames[0]]));
  });

  it('exibe a primeira página enquanto carrega a próxima', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...mockGames[0],
      id: `ug-${index}`,
    }));
    let resolveSecondPage: ((value: { data: typeof mockGames }) => void) | undefined;
    const secondPage = new Promise<{ data: typeof mockGames }>((resolve) => {
      resolveSecondPage = resolve;
    });
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: firstPage })
      .mockReturnValueOnce(secondPage);

    const { result } = renderHook(() => useLibrary('user-123'), {
      wrapper: TestQueryProvider,
    });

    await waitFor(() => expect(result.current.games).toHaveLength(100));
    expect(result.current.loading).toBe(false);
    await waitFor(() => expect(result.current.loadingMore).toBe(true));

    await act(async () => {
      resolveSecondPage?.({ data: mockGames });
      await secondPage;
    });

    await waitFor(() => expect(result.current.games).toHaveLength(102));
    expect(api.get).toHaveBeenNthCalledWith(2, '/user-games/me', {
      params: { offset: 100, limit: 100 },
    });
  });

});
