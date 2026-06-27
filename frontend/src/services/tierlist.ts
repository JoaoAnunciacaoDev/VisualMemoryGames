import { GameItem } from '@/types';

export function findContainer(games: Record<string, GameItem[]>, itemId: string) {
  if (itemId in games) return itemId;
  return Object.keys(games).find((key) => games[key].some((g) => g.id === itemId));
}