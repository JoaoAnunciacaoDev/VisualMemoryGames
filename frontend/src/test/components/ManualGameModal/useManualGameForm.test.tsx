import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestQueryProvider } from '@/test/TestRouter';
import { addManualGameToLibrary } from '@/features/games/mutations';
import { useManualGameForm } from '@/components/ManualGameModal/useManualGameForm';

vi.mock('@/features/games/mutations', () => ({ addManualGameToLibrary: vi.fn() }));

const mockAddGame = vi.mocked(addManualGameToLibrary);

describe('useManualGameForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires a game title', async () => {
    const { result } = renderHook(() => useManualGameForm(vi.fn(), vi.fn()), { wrapper: TestQueryProvider });
    await act(() => result.current.submit());
    expect(result.current.error).toBe('O nome do jogo é obrigatório.');
    expect(mockAddGame).not.toHaveBeenCalled();
  });

  it('rejects an invalid cover URL', async () => {
    const { result } = renderHook(() => useManualGameForm(vi.fn(), vi.fn()), { wrapper: TestQueryProvider });
    act(() => {
      result.current.setTitle('Meu jogo');
      result.current.setCoverFromUrl('not-a-url');
    });
    await act(() => result.current.submit());
    expect(result.current.error).toContain('HTTP ou HTTPS');
  });

  it('submits valid data and completes the flow', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    mockAddGame.mockResolvedValue({ id: 'game-1' });
    const { result } = renderHook(() => useManualGameForm(onSuccess, onClose), { wrapper: TestQueryProvider });
    act(() => {
      result.current.setTitle('Meu jogo');
      result.current.setReleaseYear('2024');
      result.current.setSelectedPlatforms(['PC']);
      result.current.setSelectedGenres(['RPG']);
    });
    await act(() => result.current.submit());
    await waitFor(() => expect(mockAddGame).toHaveBeenCalledOnce());
    const formData = mockAddGame.mock.calls[0][0];
    expect(formData.get('title')).toBe('Meu jogo');
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
