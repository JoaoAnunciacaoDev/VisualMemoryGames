import api from '@/services/api';
import { getBestGameCover } from '@/services/media';

export interface TierListEditorGameItem {
  id: string;
  title: string;
  coverUrl: string | undefined;
  itemId?: string;
}

export interface TierListEditorTier {
  id: string;
  label: string;
  color: string;
}

export interface TierListEditorInitialGame {
  id: string;
  title: string;
  coverUrl: string | null;
}

export interface TierListEditorData {
  title: string;
  tiers: TierListEditorTier[];
  games: Record<string, TierListEditorGameItem[]>;
  poolCategoryId: string | null;
}

interface TierListItemApi {
  id: string;
  game_id: string;
  order_index: number;
  game?: {
    title?: string | null;
    cover_url?: string | null;
    custom_cover_url?: string | null;
  } | null;
}

interface TierListCategoryApi {
  id: string;
  name: string;
  color: string;
  items: TierListItemApi[];
}

interface TierListApiResponse {
  title: string;
  categories: TierListCategoryApi[];
}

interface ApiConflictError {
  response?: {
    status?: number;
  };
}

function isApiConflictError(error: unknown): error is ApiConflictError {
  return typeof error === 'object' && error !== null
    && 'response' in error
    && typeof (error as ApiConflictError).response?.status === 'number'
    && (error as ApiConflictError).response?.status === 400;
}

function mapTierListItem(item: TierListItemApi): TierListEditorGameItem {
  return {
    id: item.game_id,
    itemId: item.id,
    title: item.game?.title ?? 'Jogo',
    coverUrl: getBestGameCover({
      cover_url: item.game?.cover_url,
      custom_cover_url: item.game?.custom_cover_url,
    }),
  };
}

function mapTierListData(data: TierListApiResponse): TierListEditorData {
  const poolCategory = data.categories.find((category) => category.name === '__pool__');
  const regularCategories = data.categories.filter((category) => category.name !== '__pool__');

  const games: Record<string, TierListEditorGameItem[]> = {};

  for (const category of regularCategories) {
    games[category.id] = [...category.items]
      .sort((left, right) => left.order_index - right.order_index)
      .map(mapTierListItem);
  }

  games.unassigned = poolCategory?.items.map(mapTierListItem) ?? [];

  return {
    title: data.title,
    tiers: regularCategories.map((category) => ({
      id: category.id,
      label: category.name,
      color: category.color,
    })),
    games,
    poolCategoryId: poolCategory?.id ?? null,
  };
}

async function syncInitialPool(
  poolCategoryId: string,
  savedPool: TierListEditorGameItem[],
  initialPool: TierListEditorInitialGame[]
): Promise<TierListEditorGameItem[]> {
  if (initialPool.length === 0) {
    return savedPool;
  }

  const savedPoolIds = new Set(savedPool.map((game) => game.id));
  const newGames = initialPool.filter((game) => !savedPoolIds.has(game.id));
  const mergedPool = [...savedPool];

  for (const game of newGames) {
    try {
      const response = await api.post(`/tierlists/category/${poolCategoryId}/items`, {
        game_id: game.id,
      });

      mergedPool.push({
        ...game,
        coverUrl: game.coverUrl ?? undefined,
        itemId: response.data.id,
      });
    } catch (error: unknown) {
      if (!isApiConflictError(error)) {
        mergedPool.push({
          ...game,
          coverUrl: game.coverUrl ?? undefined,
        });
      }
    }
  }

  return mergedPool;
}

export async function loadTierListEditorData(
  tierListId: string,
  initialPool: TierListEditorInitialGame[] = []
): Promise<TierListEditorData> {
  const response = await api.get(`/tierlists/${tierListId}`);
  const data = mapTierListData(response.data as TierListApiResponse);

  if (data.poolCategoryId) {
    data.games.unassigned = await syncInitialPool(
      data.poolCategoryId,
      data.games.unassigned ?? [],
      initialPool
    );
  }

  return data;
}

export async function updateTierListTitle(tierListId: string, title: string) {
  await api.put(`/tierlists/${tierListId}`, { title });
}

export async function createTierListCategory(
  tierListId: string,
  payload: { name: string; color: string; order_index: number }
) {
  const response = await api.post(`/tierlists/${tierListId}/categories`, payload);
  return response.data as { id: string; name: string; color: string };
}

export async function deleteTierListCategory(tierId: string) {
  await api.delete(`/tierlists/category/${tierId}`);
}

export async function updateTierListCategory(
  tierId: string,
  payload: { name?: string; color?: string }
) {
  await api.put(`/tierlists/category/${tierId}`, payload);
}

export async function addTierListCategoryItem(categoryId: string, gameId: string) {
  const response = await api.post(`/tierlists/category/${categoryId}/items`, { game_id: gameId });
  return response.data as { id: string };
}

export async function deleteTierListCategoryItem(categoryId: string, itemId: string) {
  await api.delete(`/tierlists/category/${categoryId}/items/${itemId}`);
}

export async function moveTierListCategoryItem(
  fromCategoryId: string,
  itemId: string,
  targetCategoryId: string
) {
  await api.put(`/tierlists/category/${fromCategoryId}/items/${itemId}/move`, {
    target_category_id: targetCategoryId,
  });
}

export async function reorderTierListCategoryItems(categoryId: string, itemIds: string[]) {
  await api.put(`/tierlists/category/${categoryId}/reorder`, { item_ids: itemIds });
}