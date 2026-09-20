import { useCallback } from 'react';
import type { ToastType } from '@/hooks/useToast';
import {
  POOL_ID,
  type GameItem,
  type SetGames,
  type TierListEditorRunner,
} from './types';

interface Options {
  tierListId: string | undefined;
  poolCategoryId: string | null;
  games: Record<string, GameItem[]>;
  mutateEditor: TierListEditorRunner;
  setGames: SetGames;
  reload: () => Promise<void>;
  showToast: (message: string, type?: ToastType) => void;
}

export function useTierGameMovement(options: Options) {
  const {
    tierListId,
    poolCategoryId,
    games,
    mutateEditor,
    setGames,
    reload,
    showToast,
  } = options;

  const persistDestinationOrder = useCallback(
    (containerId: string) => {
      setGames((current) => {
        const itemIds = current[containerId].flatMap((item) =>
          item.itemId ? [item.itemId] : [],
        );
        if (tierListId && itemIds.length > 0) {
          void mutateEditor({
            type: 'reorder-items',
            tierListId,
            categoryId: containerId,
            itemIds,
          });
        }
        return current;
      });
    },
    [mutateEditor, setGames, tierListId],
  );

  const moveToTier = useCallback(
    async (game: GameItem, fromContainer: string, toContainer: string) => {
      if (!tierListId) return;
      if (game.itemId) {
        await mutateEditor({
          type: 'move-item',
          tierListId,
          fromCategoryId: fromContainer,
          itemId: game.itemId,
          targetCategoryId: toContainer,
        });
      } else {
        const result = await mutateEditor({
          type: 'add-item',
          tierListId,
          categoryId: toContainer,
          gameId: game.id,
        });
        if (result.type !== 'item-created') return;
        setGames((current) => ({
          ...current,
          [toContainer]: current[toContainer].map((item) =>
            item.id === game.id ? { ...item, itemId: result.item.id } : item,
          ),
        }));
      }
      setTimeout(() => persistDestinationOrder(toContainer), 0);
    },
    [mutateEditor, persistDestinationOrder, setGames, tierListId],
  );

  const moveToPool = useCallback(
    async (game: GameItem, fromContainer: string) => {
      if (!tierListId || !poolCategoryId) return;
      if (game.itemId) {
        await mutateEditor({
          type: 'move-item',
          tierListId,
          fromCategoryId: fromContainer,
          itemId: game.itemId,
          targetCategoryId: poolCategoryId,
        });
        return;
      }
      const result = await mutateEditor({
        type: 'add-item',
        tierListId,
        categoryId: poolCategoryId,
        gameId: game.id,
      });
      if (result.type !== 'item-created') return;
      setGames((current) => ({
        ...current,
        [POOL_ID]: current[POOL_ID].map((item) =>
          item.id === game.id ? { ...item, itemId: result.item.id } : item,
        ),
      }));
    },
    [mutateEditor, poolCategoryId, setGames, tierListId],
  );

  const moveGame = useCallback(
    async (gameId: string, fromContainer: string, toContainer: string) => {
      const game = Object.values(games)
        .flat()
        .find((item) => item.id === gameId);
      if (!game) return;
      try {
        if (toContainer === POOL_ID) await moveToPool(game, fromContainer);
        else await moveToTier(game, fromContainer, toContainer);
      } catch {
        showToast(
          toContainer === POOL_ID
            ? 'Erro ao mover jogo para o pool.'
            : 'Erro ao mover jogo.',
          'error',
        );
        await reload();
      }
    },
    [games, moveToPool, moveToTier, reload, showToast],
  );

  const reorderTier = useCallback(
    async (tierId: string, itemIds: string[]) => {
      if (!tierListId) return;
      try {
        await mutateEditor({
          type: 'reorder-items',
          tierListId,
          categoryId: tierId,
          itemIds,
        });
      } catch {
        showToast('Erro ao salvar ordem.', 'error');
      }
    },
    [mutateEditor, showToast, tierListId],
  );

  return { moveGame, reorderTier };
}
