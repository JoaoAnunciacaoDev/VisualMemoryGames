import { useState, useCallback, useEffect } from 'react';

import {
  addTierListCategoryItem,
  createTierListCategory,
  deleteTierListCategory,
  deleteTierListCategoryItem,
  moveTierListCategoryItem,
  reorderTierListCategoryItems,
  type TierListEditorData,
  type TierListEditorGameItem,
  type TierListEditorTier,
  updateTierListCategory,
  updateTierListTitle,
} from '@/services/tierlistEditor';

import { useToast } from '@/hooks/useToast';

export type GameItem = TierListEditorGameItem;
export type Tier = TierListEditorTier;

export const POOL_ID = 'unassigned';

interface UseTierListEditorOptions {
  onReload?: () => Promise<void> | void;
}

export function useTierListEditor(
  tierListId: string | undefined,
  initialData: TierListEditorData | null,
  options?: UseTierListEditorOptions
) {
  const { showToast } = useToast();
  const onReload = options?.onReload;

  const [title, setTitle] = useState('');
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [games, setGames] = useState<Record<string, GameItem[]>>({});
  const [poolCategoryId, setPoolCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) {
      setTitle('');
      setTiers([]);
      setGames({});
      setPoolCategoryId(null);
      return;
    }

    setTitle(initialData.title);
    setTiers(initialData.tiers);
    setGames(initialData.games);
    setPoolCategoryId(initialData.poolCategoryId);
  }, [initialData]);

  const reload = useCallback(async () => {
    await onReload?.();
  }, [onReload]);

  const saveTitle = useCallback(async (newTitle: string) => {
    if (!tierListId) return;

    try {
      await updateTierListTitle(tierListId, newTitle);
      setTitle(newTitle);
    } catch {
      showToast('Erro ao salvar título.', 'error');
    }
  }, [showToast, tierListId]);

  const addTier = useCallback(async (label: string, color: string) => {
    if (!tierListId) return;

    try {
      const cat = await createTierListCategory(tierListId, {
        name: label,
        color,
        order_index: tiers.length,
      });

      setTiers((prev) => [...prev, { id: cat.id, label: cat.name, color: cat.color }]);
      setGames((prev) => ({ ...prev, [cat.id]: [] }));
    } catch {
      showToast('Erro ao criar tier.', 'error');
    }
  }, [showToast, tierListId, tiers.length]);

  const removeTier = useCallback(async (tierId: string) => {
    try {
      await deleteTierListCategory(tierId);
      setGames((prev) => {
        const updated = { ...prev };
        if (updated[tierId]) {
          updated[POOL_ID] = [
            ...(updated[POOL_ID] ?? []),
            ...updated[tierId].map((game) => ({ ...game, itemId: undefined })),
          ];
          delete updated[tierId];
        }
        return updated;
      });
      setTiers((prev) => prev.filter((tier) => tier.id !== tierId));
    } catch {
      showToast('Erro ao deletar tier.', 'error');
    }
  }, [showToast]);

  const updateTierLabel = useCallback(async (tierId: string, newLabel: string) => {
    try {
      await updateTierListCategory(tierId, { name: newLabel });
      setTiers((prev) => prev.map((tier) => (tier.id === tierId ? { ...tier, label: newLabel } : tier)));
    } catch {
      showToast('Erro ao renomear tier.', 'error');
    }
  }, [showToast]);

  const updateTierColor = useCallback(async (tierId: string, newColor: string) => {
    try {
      await updateTierListCategory(tierId, { color: newColor });
      setTiers((prev) => prev.map((tier) => (tier.id === tierId ? { ...tier, color: newColor } : tier)));
    } catch {
      showToast('Erro ao mudar cor.', 'error');
    }
  }, [showToast]);

  const addGameToPool = useCallback(async (game: { id: string; title: string; coverUrl: string | null }) => {
    const newItem: GameItem = {
      id: game.id,
      title: game.title,
      coverUrl: game.coverUrl ?? undefined,
    };

    try {
      if (poolCategoryId) {
        const res = await addTierListCategoryItem(poolCategoryId, game.id);
        newItem.itemId = res.id;
      }

      setGames((prev) => ({
        ...prev,
        [POOL_ID]: [...(prev[POOL_ID] ?? []), newItem],
      }));
      showToast(`${game.title} adicionado ao pool!`, 'success');
    } catch {
      showToast('Erro ao adicionar jogo.', 'error');
    }
  }, [poolCategoryId, showToast]);

  const removeGame = useCallback(async (gameId: string) => {
    const container = Object.keys(games).find((key) => games[key].some((game) => game.id === gameId));
    if (!container) return;

    const game = games[container].find((item) => item.id === gameId);
    if (!game?.itemId) return;

    const categoryId = container === POOL_ID ? poolCategoryId : container;
    if (!categoryId) return;

    try {
      await deleteTierListCategoryItem(categoryId, game.itemId);
      setGames((prev) => ({
        ...prev,
        [container]: prev[container].filter((item) => item.id !== gameId),
      }));
      showToast('Jogo removido da tier list.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    }
  }, [games, poolCategoryId, showToast]);

  const moveGame = useCallback(async (
    gameId: string,
    fromContainer: string,
    toContainer: string,
  ) => {
    const game = Object.values(games).flat().find((item) => item.id === gameId);
    if (!game) return;

    if (toContainer !== POOL_ID) {
      try {
        if (game.itemId) {
          await moveTierListCategoryItem(fromContainer, game.itemId, toContainer);
        } else {
          const res = await addTierListCategoryItem(toContainer, game.id);
          setGames((prev) => ({
            ...prev,
            [toContainer]: prev[toContainer].map((item) => (item.id === gameId ? { ...item, itemId: res.id } : item)),
          }));
        }

        setTimeout(() => {
          setGames((prev) => {
            const itemIds = prev[toContainer]
              .filter((item) => item.itemId)
              .map((item) => item.itemId!);

            if (itemIds.length > 0) {
              void reorderTierListCategoryItems(toContainer, itemIds);
            }

            return prev;
          });
        }, 0);
      } catch {
        showToast('Erro ao mover jogo.', 'error');
        await reload();
      }
    } else {
      if (game.itemId && poolCategoryId) {
        try {
          await moveTierListCategoryItem(fromContainer, game.itemId, poolCategoryId);
        } catch {
          showToast('Erro ao mover jogo para o pool.', 'error');
          await reload();
        }
      } else if (!game.itemId && poolCategoryId) {
        try {
          const res = await addTierListCategoryItem(poolCategoryId, game.id);
          setGames((prev) => ({
            ...prev,
            [POOL_ID]: prev[POOL_ID].map((item) => (item.id === gameId ? { ...item, itemId: res.id } : item)),
          }));
        } catch {
          showToast('Erro ao salvar jogo no pool.', 'error');
        }
      }
    }
  }, [games, poolCategoryId, reload, showToast]);

  const reorderTier = useCallback(async (tierId: string, itemIds: string[]) => {
    try {
      await reorderTierListCategoryItems(tierId, itemIds);
    } catch {
      showToast('Erro ao salvar ordem.', 'error');
    }
  }, [showToast]);

  return {
    title,
    setTitle,
    tiers,
    games,
    setGames,
    poolCategoryId,
    existingGameIds: new Set(Object.values(games).flat().map((game) => game.id)),
    reload,
    saveTitle,
    addTier,
    removeTier,
    updateTierLabel,
    updateTierColor,
    addGameToPool,
    removeGame,
    moveGame,
    reorderTier,
  };
}