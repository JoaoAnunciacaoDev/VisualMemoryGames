import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragHandlers } from '@/hooks/useDragHandlers';
import { GameItem } from '@/types';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';

vi.mock('@/services/tierlist', () => ({
  findContainer: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn(),
}));

import { findContainer } from '@/services/tierlist';
import { arrayMove } from '@dnd-kit/sortable';

const mockGames: Record<string, GameItem[]> = {
  'unassigned': [
    { id: 'game1', title: 'Game 1', coverUrl: undefined, itemId: 'item1' },
    { id: 'game2', title: 'Game 2', coverUrl: undefined, itemId: 'item2' },
  ],
  'cat-s': [
    { id: 'game3', title: 'Game 3', coverUrl: undefined, itemId: 'item3' },
  ],
  'cat-a': [
    { id: 'game4', title: 'Game 4', coverUrl: undefined, itemId: 'item4' },
  ],
};

describe('useDragHandlers', () => {
  const moveGame = vi.fn();
  const reorderTier = vi.fn();
  const setGames = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findContainer).mockReset();
    vi.mocked(arrayMove).mockReset();
  });

  it('deve iniciar com activeId e activeContainer null', () => {
    const { result } = renderHook(() =>
      useDragHandlers({ games: mockGames, setGames, moveGame, reorderTier })
    );

    expect(result.current.activeId).toBeNull();
    expect(result.current.activeGame).toBeNull();
  });

  it('handleDragStart deve definir activeId e activeContainer', () => {
    vi.mocked(findContainer).mockReturnValue('unassigned');
    const { result } = renderHook(() =>
      useDragHandlers({ games: mockGames, setGames, moveGame, reorderTier })
    );

    const event = { active: { id: 'game1' } } as DragStartEvent;

    act(() => {
      result.current.handleDragStart(event);
    });

    expect(result.current.activeId).toBe('game1');
    expect(findContainer).toHaveBeenCalledWith(mockGames, 'game1');
  });

  it('handleDragOver deve actualizar games ao mover para outro container', () => {
    vi.mocked(findContainer)
      .mockReturnValueOnce('unassigned')
      .mockReturnValueOnce('cat-s');

    const { result } = renderHook(() =>
      useDragHandlers({ games: mockGames, setGames, moveGame, reorderTier })
    );

    const event = {
      active: { id: 'game1' },
      over: { id: 'cat-s' },
    } as DragOverEvent;

    act(() => {
      result.current.handleDragOver(event);
    });

    expect(setGames).toHaveBeenCalledOnce();
    const updater = setGames.mock.calls[0][0];
    const newState = updater(mockGames);
    expect(newState['unassigned']).toHaveLength(1);
    expect(newState['cat-s']).toHaveLength(2);
  });

  it('handleDragEnd deve reordenar dentro do mesmo container (tier normal)', () => {
    vi.mocked(findContainer).mockReturnValue('cat-s');
    vi.mocked(arrayMove).mockReturnValue([
      mockGames['cat-s'][0],
    ]);

    const { result } = renderHook(
      ({ games }) => useDragHandlers({ games, setGames, moveGame, reorderTier }),
      { initialProps: { games: mockGames } }
    );

    vi.mocked(findContainer).mockReturnValueOnce('cat-s');
    act(() => {
      result.current.handleDragStart({ active: { id: 'game3' } } as DragStartEvent);
    });

    const event = {
      active: { id: 'game3' },
      over: { id: 'game4' },
    } as DragEndEvent;

    act(() => {
      result.current.handleDragEnd(event);
    });

    expect(arrayMove).toHaveBeenCalled();
    expect(reorderTier).toHaveBeenCalledWith('cat-s', expect.any(Array));
  });

  it('handleDragEnd deve mover jogo para outro container', async () => {
    const { result } = renderHook(() =>
      useDragHandlers({ games: mockGames, setGames, moveGame, reorderTier })
    );

    vi.mocked(findContainer).mockReturnValueOnce('unassigned');
    act(() => {
      result.current.handleDragStart({ active: { id: 'game1' } } as DragStartEvent);
    });

    vi.mocked(findContainer).mockReturnValueOnce('cat-s');
    const event = {
      active: { id: 'game1' },
      over: { id: 'cat-s' },
    } as DragEndEvent;

    await act(async () => {
      await result.current.handleDragEnd(event);
    });

    expect(moveGame).toHaveBeenCalledWith('game1', 'unassigned', 'cat-s');
    expect(result.current.activeId).toBeNull();
  });

  it('activeGame deve retornar o jogo activo', () => {
    vi.mocked(findContainer).mockReturnValue('cat-s');
    const { result } = renderHook(() =>
      useDragHandlers({ games: mockGames, setGames, moveGame, reorderTier })
    );

    act(() => {
      result.current.handleDragStart({ active: { id: 'game3' } } as DragStartEvent);
    });

    expect(result.current.activeGame).toEqual(mockGames['cat-s'][0]);
  });
});