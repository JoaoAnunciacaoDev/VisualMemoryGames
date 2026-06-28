import { useState, useCallback } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { findContainer } from '@/services/tierlist';
import { GameItem } from '@/types/index';
import { POOL_ID } from '@/hooks/useTierListEditor';

interface Props {
  games: Record<string, GameItem[]>;
  setGames: React.Dispatch<React.SetStateAction<Record<string, GameItem[]>>>;
  moveGame: (gameId: string, from: string, to: string) => Promise<void>;
  reorderTier: (tierId: string, itemIds: string[]) => void;
}

export function useDragHandlers({ games, setGames, moveGame, reorderTier }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeContainer, setActiveContainer] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const dragId = event.active.id as string;
    setActiveId(dragId);
    setActiveContainer(findContainer(games, dragId) ?? null);
  }, [games]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const from = findContainer(games, active.id as string);
    const to = findContainer(games, over.id as string) ?? (over.id as string);
    if (!from || !to || from === to) return;

    setGames((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...(prev[to] ?? [])];
      const activeIndex = fromItems.findIndex((g) => g.id === active.id);
      const overIndex = toItems.findIndex((g) => g.id === over.id);
      const newIndex = overIndex >= 0 ? overIndex : toItems.length;
      const item = fromItems[activeIndex];
      return {
        ...prev,
        [from]: fromItems.filter((g) => g.id !== active.id),
        [to]: [...toItems.slice(0, newIndex), item, ...toItems.slice(newIndex)],
      };
    });
  }, [games, setGames]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !activeContainer) { setActiveContainer(null); return; }

    const overContainer = findContainer(games, over.id as string) ?? (over.id as string);

    if (activeContainer === overContainer) {
      const activeIndex = games[activeContainer].findIndex((g) => g.id === active.id);
      const overIndex = games[overContainer].findIndex((g) => g.id === over.id);
      if (activeIndex !== overIndex) {
        const reordered = arrayMove(games[activeContainer], activeIndex, overIndex);
        setGames((prev) => ({ ...prev, [activeContainer]: reordered }));
        if (activeContainer !== POOL_ID) {
          const itemIds = reordered.filter((g) => g.itemId).map((g) => g.itemId!);
          reorderTier(activeContainer, itemIds);
        }
      }
    } else {
      await moveGame(active.id as string, activeContainer, overContainer);
    }
    setActiveContainer(null);
  }, [games, setGames, activeContainer, moveGame, reorderTier]);

  const activeGame = activeId
    ? Object.values(games).flat().find((g) => g.id === activeId) ?? null
    : null;

  return { activeId, activeGame, handleDragStart, handleDragOver, handleDragEnd };
}