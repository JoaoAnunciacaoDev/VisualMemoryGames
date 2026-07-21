import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameEditForm } from '@/hooks/useGameEditForm';
import api from '@/services/api';
import type { LibraryGame } from '@/types';
import { ChangeEvent } from 'react';

vi.mock('@/services/api', () => ({
  default: {
    put: vi.fn(),
  },
}));

globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

const mockGame: LibraryGame = {
  id: 'ug-1',
  game_id: 'game-1',
  external_id: 100,
  title: 'Test Game',
  cover_url: 'https://example.com/cover.jpg',
  custom_cover_url: null,
  release_year: 2020,
  status: 'Jogando',
  rating: 8,
  favorite: false,
  hours_played: 10,
  store: null,
  acquired_at: null,
  started_at: null,
  finished_at: null,
  platinum_at: null,
  notes: '',
  is_manual: false,
  platforms: ['PC'],
  genres: ['Action'],
};

const mockManualGame: LibraryGame = {
  ...mockGame,
  is_manual: true,
  game_id: 'manual-game-1',
};

describe('useGameEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar o estado com os valores do jogo', () => {
    const { result } = renderHook(() => useGameEditForm(mockGame));

    expect(result.current.form.status).toBe('Jogando');
    expect(result.current.form.rating).toBe(8);
    expect(result.current.form.favorite).toBe(false);
    expect(result.current.editTitle).toBe('Test Game');
    expect(result.current.editReleaseYear).toBe('2020');
    expect(result.current.editPlatforms).toEqual(['PC']);
    expect(result.current.editGenres).toEqual(['Action']);
    expect(result.current.canReview).toBe(true);
    expect(result.current.displayCover).toBe('https://example.com/cover.jpg');
  });

  it('updateField deve atualizar um campo do formulário', () => {
    const { result } = renderHook(() => useGameEditForm(mockGame));

    act(() => {
      result.current.updateField('rating', 9);
    });

    expect(result.current.form.rating).toBe(9);
  });

  it('handleStatusChange para "Quero Jogar" deve limpar campos', () => {
    const { result } = renderHook(() => useGameEditForm(mockGame));

    act(() => {
      result.current.handleStatusChange('Quero Jogar');
    });

    expect(result.current.form.status).toBe('Quero Jogar');
    expect(result.current.form.rating).toBeNull();
    expect(result.current.form.finished_at).toBe('');
    expect(result.current.form.notes).toBe('');
    expect(result.current.form.platinum_at).toBe('');
    expect(result.current.canReview).toBe(false);
  });

  it('handleFileChange deve actualizar coverFile e coverPreview', () => {
    const { result } = renderHook(() => useGameEditForm(mockGame));
    const file = new File([''], 'test.png', { type: 'image/png' });
    const event = {
      target: { files: [file] },
    } as unknown as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
    });

    expect(result.current.coverFile).toBe(file);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it('handleUrlChange deve actualizar custom_cover_url e limpar coverFile', () => {
    const { result } = renderHook(() => useGameEditForm(mockGame));

    act(() => {
      result.current.handleUrlChange({ target: { value: 'https://new-cover.jpg' } } as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.form.custom_cover_url).toBe('https://new-cover.jpg');
    expect(result.current.coverFile).toBeNull();
  });

  it('clearCoverFile deve limpar coverFile e coverPreview', () => {
    const { result } = renderHook(() => useGameEditForm(mockGame));
    const file = new File([''], 'test.png', { type: 'image/png' });
    const event = {
      target: { files: [file] },
    } as unknown as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
    });
    act(() => {
      result.current.clearCoverFile();
    });

    expect(result.current.coverFile).toBeNull();
  });

  it('displayCover deve dar prioridade ao coverPreview', () => {
    const { result } = renderHook(() => useGameEditForm(mockGame));
    const file = new File([''], 'test.png', { type: 'image/png' });
    const event = {
      target: { files: [file] },
    } as unknown as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
    });

    expect(result.current.displayCover).toBe('blob:mock-url');
  });

  it('handleSave deve actualizar o jogo e devolver o payload', async () => {
    vi.mocked(api.put).mockResolvedValue({});

    const { result } = renderHook(() => useGameEditForm(mockGame));

    let payload;
    await act(async () => {
      payload = await result.current.handleSave();
    });

    expect(api.put).toHaveBeenCalledWith('/user-games/ug-1', expect.objectContaining({
      status: 'Jogando',
      rating: 8,
      favorite: false,
    }));
    expect(payload).toHaveProperty('status', 'Jogando');
  });

  it('handleSave deve actualizar jogo manual antes do user-game', async () => {
    vi.mocked(api.put).mockResolvedValue({});

    const { result } = renderHook(() => useGameEditForm(mockManualGame));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(api.put).toHaveBeenNthCalledWith(1, '/games/manual/manual-game-1', expect.any(FormData), expect.any(Object));
    expect(api.put).toHaveBeenNthCalledWith(2, '/user-games/ug-1', expect.any(Object));
  });

  it('handleSave deve fazer upload de capa personalizada se houver coverFile', async () => {
    vi.mocked(api.put)
      .mockResolvedValueOnce({ data: { custom_cover_url: '/uploads/covers/new-cover.jpg' } })
      .mockResolvedValueOnce({});

    const { result } = renderHook(() => useGameEditForm(mockGame));
    const file = new File([''], 'test.png', { type: 'image/png' });
    const event = {
      target: { files: [file] },
    } as unknown as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
    });

    let payload;
    await act(async () => {
      payload = await result.current.handleSave();
    });

    expect(api.put).toHaveBeenCalledWith('/user-games/ug-1/cover', expect.any(FormData), expect.any(Object));
    expect(api.put).toHaveBeenCalledWith('/user-games/ug-1', expect.objectContaining({
      custom_cover_url: '/uploads/covers/new-cover.jpg',
    }));
    expect(payload).toHaveProperty('custom_cover_url', '/uploads/covers/new-cover.jpg');
  });
});