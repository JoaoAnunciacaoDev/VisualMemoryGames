import type { Dispatch, SetStateAction } from 'react';
import type {
  TierListEditorAction,
  TierListEditorActionResult,
} from '@/features/tierlists/mutations';
import type {
  TierListEditorData,
  TierListEditorGameItem,
  TierListEditorTier,
} from '@/services/tierlistEditor';

export type GameItem = TierListEditorGameItem;
export type Tier = TierListEditorTier;

export const POOL_ID = 'unassigned';

export interface TierListEditorState {
  title: string;
  isPublic: boolean;
  tiers: Tier[];
  games: Record<string, GameItem[]>;
  poolCategoryId: string | null;
}

export type TierListEditorRunner = (
  action: TierListEditorAction,
) => Promise<TierListEditorActionResult>;

export type SetTiers = Dispatch<SetStateAction<Tier[]>>;
export type SetGames = Dispatch<SetStateAction<Record<string, GameItem[]>>>;

export const createEditorState = (
  data: TierListEditorData | null,
): TierListEditorState => ({
  title: data?.title ?? '',
  isPublic: data?.isPublic ?? true,
  tiers: data?.tiers ?? [],
  games: data?.games ?? {},
  poolCategoryId: data?.poolCategoryId ?? null,
});
