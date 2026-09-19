import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  TierListEditorData,
  TierListEditorGameItem,
  TierListEditorTier,
} from '@/services/tierlistEditor';
import { runTierListEditorAction } from '@/features/tierlists/mutations';
import { tierListKeys } from '@/features/tierlists/queries';

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
  const queryClient = useQueryClient();
  const onReload = options?.onReload;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? true);
  const [tiers, setTiers] = useState<Tier[]>(initialData?.tiers ?? []);
  const [games, setGames] = useState<Record<string, GameItem[]>>(initialData?.games ?? {});
  const [poolCategoryId, setPoolCategoryId] = useState<string | null>(initialData?.poolCategoryId ?? null);

  const [prevInitialData, setPrevInitialData] = useState(initialData);

  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setTitle(initialData?.title ?? '');
    setIsPublic(initialData?.isPublic ?? true);
    setTiers(initialData?.tiers ?? []);
    setGames(initialData?.games ?? {});
    setPoolCategoryId(initialData?.poolCategoryId ?? null);
  }

  const reload = useCallback(async () => {
    await onReload?.();
  }, [onReload]);

  const { mutateAsync: mutateEditor } = useMutation({
    mutationFn: runTierListEditorAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tierListKeys.mine() }),
  });

  const saveTitle = useCallback(async (newTitle: string) => {
    if (!tierListId) return;

    try {
      await mutateEditor({ type: 'update-title', tierListId, title: newTitle });
      setTitle(newTitle);
    } catch {
      showToast('Erro ao salvar título.', 'error');
    }
  }, [mutateEditor, showToast, tierListId]);

  const saveIsPublic = useCallback(async (newIsPublic: boolean) => {
    if (!tierListId) return;

    try {
      await mutateEditor({ type: 'update-privacy', tierListId, isPublic: newIsPublic });
      setIsPublic(newIsPublic);
      showToast(newIsPublic ? 'Tier list agora é pública!' : 'Tier list agora é privada!', 'success');
    } catch {
      showToast('Erro ao salvar privacidade.', 'error');
    }
  }, [mutateEditor, showToast, tierListId]);

  const addTier = useCallback(async (label: string, color: string) => {
    if (!tierListId) return;

    try {
      const result = await mutateEditor({
        type: 'create-category',
        tierListId,
        payload: { name: label, color, order_index: tiers.length },
      });
      if (result.type !== 'category-created') return;
      const cat = result.category;

      setTiers((prev) => [...prev, { id: cat.id, label: cat.name, color: cat.color }]);
      setGames((prev) => ({ ...prev, [cat.id]: [] }));
    } catch {
      showToast('Erro ao criar tier.', 'error');
    }
  }, [mutateEditor, showToast, tierListId, tiers.length]);

  const removeTier = useCallback(async (tierId: string) => {
    try {
      if (!tierListId) return;
      await mutateEditor({ type: 'delete-category', tierListId, categoryId: tierId });
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
  }, [mutateEditor, showToast, tierListId]);

  const updateTierLabel = useCallback(async (tierId: string, newLabel: string) => {
    try {
      if (!tierListId) return;
      await mutateEditor({
        type: 'update-category', tierListId, categoryId: tierId, payload: { name: newLabel },
      });
      setTiers((prev) => prev.map((tier) => (tier.id === tierId ? { ...tier, label: newLabel } : tier)));
    } catch {
      showToast('Erro ao renomear tier.', 'error');
    }
  }, [mutateEditor, showToast, tierListId]);

  const updateTierColor = useCallback(async (tierId: string, newColor: string) => {
    try {
      if (!tierListId) return;
      await mutateEditor({
        type: 'update-category', tierListId, categoryId: tierId, payload: { color: newColor },
      });
      setTiers((prev) => prev.map((tier) => (tier.id === tierId ? { ...tier, color: newColor } : tier)));
    } catch {
      showToast('Erro ao mudar cor.', 'error');
    }
  }, [mutateEditor, showToast, tierListId]);

  const addGameToPool = useCallback(async (game: { id: string; title: string; coverUrl: string | null }) => {
    const newItem: GameItem = {
      id: game.id,
      title: game.title,
      coverUrl: game.coverUrl ?? undefined,
    };

    try {
      if (poolCategoryId && tierListId) {
        const result = await mutateEditor({
          type: 'add-item', tierListId, categoryId: poolCategoryId, gameId: game.id,
        });
        if (result.type === 'item-created') newItem.itemId = result.item.id;
      }

      setGames((prev) => ({
        ...prev,
        [POOL_ID]: [...(prev[POOL_ID] ?? []), newItem],
      }));
      showToast(`${game.title} adicionado ao pool!`, 'success');
    } catch {
      showToast('Erro ao adicionar jogo.', 'error');
    }
  }, [mutateEditor, poolCategoryId, showToast, tierListId]);

  const removeGame = useCallback(async (gameId: string) => {
    const container = Object.keys(games).find((key) => games[key].some((game) => game.id === gameId));
    if (!container) return;

    const game = games[container].find((item) => item.id === gameId);
    if (!game?.itemId) return;

    const categoryId = container === POOL_ID ? poolCategoryId : container;
    if (!categoryId) return;

    try {
      if (!tierListId) return;
      await mutateEditor({
        type: 'delete-item', tierListId, categoryId, itemId: game.itemId,
      });
      setGames((prev) => ({
        ...prev,
        [container]: prev[container].filter((item) => item.id !== gameId),
      }));
      showToast('Jogo removido da tier list.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    }
  }, [games, mutateEditor, poolCategoryId, showToast, tierListId]);

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
          if (!tierListId) return;
          await mutateEditor({
            type: 'move-item', tierListId, fromCategoryId: fromContainer,
            itemId: game.itemId, targetCategoryId: toContainer,
          });
        } else {
          if (!tierListId) return;
          const result = await mutateEditor({
            type: 'add-item', tierListId, categoryId: toContainer, gameId: game.id,
          });
          if (result.type !== 'item-created') return;
          setGames((prev) => ({
            ...prev,
            [toContainer]: prev[toContainer].map((item) => (
              item.id === gameId ? { ...item, itemId: result.item.id } : item
            )),
          }));
        }

        setTimeout(() => {
          setGames((prev) => {
            const itemIds = prev[toContainer]
              .filter((item) => item.itemId)
              .map((item) => item.itemId!);

            if (itemIds.length > 0) {
              if (tierListId) {
                void mutateEditor({
                  type: 'reorder-items', tierListId, categoryId: toContainer, itemIds,
                });
              }
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
          if (!tierListId) return;
          await mutateEditor({
            type: 'move-item', tierListId, fromCategoryId: fromContainer,
            itemId: game.itemId, targetCategoryId: poolCategoryId,
          });
        } catch {
          showToast('Erro ao mover jogo para o pool.', 'error');
          await reload();
        }
      } else if (!game.itemId && poolCategoryId) {
        try {
          if (!tierListId) return;
          const result = await mutateEditor({
            type: 'add-item', tierListId, categoryId: poolCategoryId, gameId: game.id,
          });
          if (result.type !== 'item-created') return;
          setGames((prev) => ({
            ...prev,
            [POOL_ID]: prev[POOL_ID].map((item) => (
              item.id === gameId ? { ...item, itemId: result.item.id } : item
            )),
          }));
        } catch {
          showToast('Erro ao salvar jogo no pool.', 'error');
        }
      }
    }
  }, [games, mutateEditor, poolCategoryId, reload, showToast, tierListId]);

  const reorderTier = useCallback(async (tierId: string, itemIds: string[]) => {
    try {
      if (!tierListId) return;
      await mutateEditor({ type: 'reorder-items', tierListId, categoryId: tierId, itemIds });
    } catch {
      showToast('Erro ao salvar ordem.', 'error');
    }
  }, [mutateEditor, showToast, tierListId]);

  return {
    title,
    setTitle,
    isPublic,
    setIsPublic,
    saveIsPublic,
    ownerId: initialData?.ownerId ?? '',
    ownerUsername: initialData?.ownerUsername ?? '',
    tiers,
    setTiers,
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
