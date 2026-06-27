import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '@/services/api';
import { getBestGameCover } from '@/services/media';
import { useToast } from '@/hooks/useToast';

export interface GameItem {
  id: string;
  title: string;
  coverUrl: string | undefined;
  itemId?: string;
}

export interface Tier {
  id: string;
  label: string;
  color: string;
}

export const POOL_ID = 'unassigned';

export function useTierListEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [games, setGames] = useState<Record<string, GameItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [poolCategoryId, setPoolCategoryId] = useState<string | null>(null);
  const initialPoolProcessed = useRef(false);

  const loadTierList = useCallback(async () => {
    try {
      const response = await api.get(`/tierlists/${id}`);
      const data = response.data;
      setTitle(data.title);

      const poolCat = data.categories.find((cat: any) => cat.name === '__pool__');
      const normalCats = data.categories.filter((cat: any) => cat.name !== '__pool__');

      const loadedTiers: Tier[] = normalCats.map((cat: any) => ({
        id: cat.id,
        label: cat.name,
        color: cat.color,
      }));
      setTiers(loadedTiers);

      if (poolCat) setPoolCategoryId(poolCat.id);

      const loadedGames: Record<string, GameItem[]> = {};

      for (const cat of normalCats) {
        loadedGames[cat.id] = [...cat.items]
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((item: any) => ({
            id: item.game_id,
            itemId: item.id,
            title: item.game?.title ?? 'Jogo',
            coverUrl: getBestGameCover({
              cover_url: item.game?.cover_url,
              custom_cover_url: item.game?.custom_cover_url,
            }),
          }));
      }

      const savedPool: GameItem[] = poolCat?.items.map((item: any) => ({
        id: item.game_id,
        itemId: item.id,
        title: item.game?.title ?? 'Jogo',
        coverUrl: getBestGameCover({
          cover_url: item.game?.cover_url,
          custom_cover_url: item.game?.custom_cover_url,
        }),
      })) ?? [];

      const initialPool: GameItem[] = location.state?.initialPool ?? [];
      if (initialPool.length > 0 && poolCat && !initialPoolProcessed.current) {
        initialPoolProcessed.current = true;
        const savedPoolIds = new Set(savedPool.map((g) => g.id));
        const newGames = initialPool.filter((g) => !savedPoolIds.has(g.id));
        const savedNewGames: GameItem[] = [];

        for (const game of newGames) {
          try {
            const res = await api.post(
              `/tierlists/category/${poolCat.id}/items`,
              { game_id: game.id }
            );
            savedNewGames.push({ ...game, coverUrl: game.coverUrl ?? undefined, itemId: res.data.id });
          } catch (err: any) {
            if (err.response?.status !== 400) {
              savedNewGames.push({ ...game, coverUrl: game.coverUrl ?? undefined });
            }
          }
        }
        loadedGames[POOL_ID] = [...savedPool, ...savedNewGames];
      } else {
        loadedGames[POOL_ID] = savedPool;
      }

      setGames(loadedGames);
    } catch {
      navigate('/tierlists');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, location.state]);

  useEffect(() => {
    loadTierList();
  }, [loadTierList]);

  const saveTitle = useCallback(async (newTitle: string) => {
    try {
      await api.put(`/tierlists/${id}`, { title: newTitle });
      setTitle(newTitle);
    } catch {
      showToast('Erro ao salvar título.', 'error');
    }
  }, [id, showToast]);

  const addTier = useCallback(async (label: string, color: string) => {
    try {
      const res = await api.post(`/tierlists/${id}/categories`, {
        name: label,
        color,
        order_index: tiers.length,
      });
      const cat = res.data;
      setTiers((prev) => [...prev, { id: cat.id, label: cat.name, color: cat.color }]);
      setGames((prev) => ({ ...prev, [cat.id]: [] }));
    } catch {
      showToast('Erro ao criar tier.', 'error');
    }
  }, [id, tiers.length, showToast]);

  const removeTier = useCallback(async (tierId: string) => {
    try {
      await api.delete(`/tierlists/category/${tierId}`);
      setGames((prev) => {
        const updated = { ...prev };
        if (updated[tierId]) {
          updated[POOL_ID] = [...(updated[POOL_ID] ?? []), ...updated[tierId].map((g) => ({ ...g, itemId: undefined }))];
          delete updated[tierId];
        }
        return updated;
      });
      setTiers((prev) => prev.filter((t) => t.id !== tierId));
    } catch {
      showToast('Erro ao deletar tier.', 'error');
    }
  }, [showToast]);

  const updateTierLabel = useCallback(async (tierId: string, newLabel: string) => {
    try {
      await api.put(`/tierlists/category/${tierId}`, { name: newLabel });
      setTiers((prev) => prev.map((t) => (t.id === tierId ? { ...t, label: newLabel } : t)));
    } catch {
      showToast('Erro ao renomear tier.', 'error');
    }
  }, [showToast]);

  const updateTierColor = useCallback(async (tierId: string, newColor: string) => {
    try {
      await api.put(`/tierlists/category/${tierId}`, { color: newColor });
      setTiers((prev) => prev.map((t) => (t.id === tierId ? { ...t, color: newColor } : t)));
    } catch {
      showToast('Erro ao mudar cor.', 'error');
    }
  }, [showToast]);

  const addGameToPool = useCallback(async (game: { id: string; title: string; coverUrl: string | null }) => {
    const newItem: GameItem = { id: game.id, title: game.title, coverUrl: game.coverUrl ?? undefined };
    try {
      if (poolCategoryId) {
        const res = await api.post(`/tierlists/category/${poolCategoryId}/items`, { game_id: game.id });
        newItem.itemId = res.data.id;
      }
      setGames((prev) => ({ ...prev, [POOL_ID]: [...(prev[POOL_ID] ?? []), newItem] }));
      showToast(`${game.title} adicionado ao pool!`, 'success');
    } catch {
      showToast('Erro ao adicionar jogo.', 'error');
    }
  }, [poolCategoryId, showToast]);

  const removeGame = useCallback(async (gameId: string) => {
    const container = Object.keys(games).find((key) => games[key].some((g) => g.id === gameId));
    if (!container) return;
    const game = games[container].find((g) => g.id === gameId);
    if (!game?.itemId) return;

    const categoryId = container === POOL_ID ? poolCategoryId : container;
    if (!categoryId) return;

    try {
      await api.delete(`/tierlists/category/${categoryId}/items/${game.itemId}`);
      setGames((prev) => ({
        ...prev,
        [container]: prev[container].filter((g) => g.id !== gameId),
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
    overIndex: number
  ) => {
    const game = games[fromContainer]?.find((g) => g.id === gameId);
    if (!game) return;

    setGames((prev) => {
      const fromItems = prev[fromContainer].filter((g) => g.id !== gameId);
      const toItems = [...(prev[toContainer] ?? [])];
      toItems.splice(overIndex, 0, game);
      return { ...prev, [fromContainer]: fromItems, [toContainer]: toItems };
    });

    if (toContainer !== POOL_ID) {
      try {
        if (game.itemId) {
          await api.put(
            `/tierlists/category/${fromContainer}/items/${game.itemId}/move`,
            { target_category_id: toContainer }
          );
        } else {
          const res = await api.post(`/tierlists/category/${toContainer}/items`, { game_id: game.id });
          setGames((prev) => ({
            ...prev,
            [toContainer]: prev[toContainer].map((g) => (g.id === gameId ? { ...g, itemId: res.data.id } : g)),
          }));
        }
      } catch {
        showToast('Erro ao mover jogo.', 'error');
        loadTierList();
      }
    } else {
      if (game.itemId && poolCategoryId) {
        try {
          await api.put(
            `/tierlists/category/${fromContainer}/items/${game.itemId}/move`,
            { target_category_id: poolCategoryId }
          );
        } catch {
          showToast('Erro ao mover jogo para o pool.', 'error');
          loadTierList();
        }
      } else if (!game.itemId && poolCategoryId) {
        try {
          const res = await api.post(`/tierlists/category/${poolCategoryId}/items`, { game_id: game.id });
          setGames((prev) => ({
            ...prev,
            [POOL_ID]: prev[POOL_ID].map((g) => (g.id === gameId ? { ...g, itemId: res.data.id } : g)),
          }));
        } catch {
          showToast('Erro ao salvar jogo no pool.', 'error');
        }
      }
    }
  }, [games, poolCategoryId, showToast, loadTierList]);

  const reorderTier = useCallback(async (tierId: string, itemIds: string[]) => {
    try {
      await api.put(`/tierlists/category/${tierId}/reorder`, { item_ids: itemIds });
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
    loading,
    poolCategoryId,
    existingGameIds: new Set(Object.values(games).flat().map((g) => g.id)),
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