import { useCallback } from 'react';
import type { ToastType } from '@/hooks/useToast';
import {
  POOL_ID,
  type GameItem,
  type SetGames,
  type TierListEditorRunner,
} from './types';
import { useTierGameMovement } from './useTierGameMovement';

interface Options {
  tierListId: string | undefined;
  poolCategoryId: string | null;
  games: Record<string, GameItem[]>;
  mutateEditor: TierListEditorRunner;
  setGames: SetGames;
  reload: () => Promise<void>;
  showToast: (message: string, type?: ToastType) => void;
}

export function useTierGameActions({
  tierListId,
  poolCategoryId,
  games,
  mutateEditor,
  setGames,
  reload,
  showToast,
}: Options) {
  const movement = useTierGameMovement({
    tierListId,
    poolCategoryId,
    games,
    mutateEditor,
    setGames,
    reload,
    showToast,
  });
  const addGameToPool = useCallback(
    async (game: { id: string; title: string; coverUrl: string | null }) => {
      const newItem: GameItem = {
        id: game.id,
        title: game.title,
        coverUrl: game.coverUrl ?? undefined,
      };

      try {
        if (poolCategoryId && tierListId) {
          const result = await mutateEditor({
            type: 'add-item',
            tierListId,
            categoryId: poolCategoryId,
            gameId: game.id,
          });
          if (result.type === 'item-created') newItem.itemId = result.item.id;
        }

        setGames((current) => ({
          ...current,
          [POOL_ID]: [...(current[POOL_ID] ?? []), newItem],
        }));
        showToast(`${game.title} adicionado ao pool!`, 'success');
      } catch {
        showToast('Erro ao adicionar jogo.', 'error');
      }
    },
    [mutateEditor, poolCategoryId, setGames, showToast, tierListId],
  );

  const removeGame = useCallback(
    async (gameId: string) => {
      const container = Object.keys(games).find((key) =>
        games[key].some((game) => game.id === gameId),
      );
      if (!container) return;

      const game = games[container].find((item) => item.id === gameId);
      const categoryId = container === POOL_ID ? poolCategoryId : container;
      if (!game?.itemId || !categoryId || !tierListId) return;

      try {
        await mutateEditor({
          type: 'delete-item',
          tierListId,
          categoryId,
          itemId: game.itemId,
        });
        setGames((current) => ({
          ...current,
          [container]: current[container].filter((item) => item.id !== gameId),
        }));
        showToast('Jogo removido da tier list.', 'info');
      } catch {
        showToast('Erro ao remover jogo.', 'error');
      }
    },
    [games, mutateEditor, poolCategoryId, setGames, showToast, tierListId],
  );

  return { addGameToPool, removeGame, ...movement };
}
