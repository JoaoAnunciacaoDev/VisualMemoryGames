import type { LibraryGame } from '@/types';
import { getStoreLabel } from '@/types/enums';
import type { GroupMode } from './Library.types';

const STATUS_ORDER = [
  'Jogando',
  'Zerado',
  'Platinado',
  'Em Espera',
  'Abandonado',
  'Quero Jogar',
  'Na biblioteca',
];

export interface LibraryGameGroup {
  label: string;
  games: LibraryGame[];
}

const groupBy = (games: LibraryGame[], getLabel: (game: LibraryGame) => string) => {
  const grouped = new Map<string, LibraryGame[]>();
  games.forEach((game) => {
    const label = getLabel(game);
    grouped.set(label, [...(grouped.get(label) ?? []), game]);
  });
  return grouped;
};

export function groupLibraryGames(
  games: LibraryGame[],
  mode: Exclude<GroupMode, 'none'>,
): LibraryGameGroup[] {
  const grouped = groupBy(
    games,
    mode === 'status'
      ? (game) => game.status || 'Outro'
      : (game) => getStoreLabel(game.store) || 'Sem Loja',
  );
  const labels =
    mode === 'status'
      ? [
          ...STATUS_ORDER.filter((status) => grouped.has(status)),
          ...[...grouped.keys()].filter((status) => !STATUS_ORDER.includes(status)),
        ]
      : [...grouped.keys()].sort((left, right) => left.localeCompare(right));

  return labels.map((label) => ({ label, games: grouped.get(label) ?? [] }));
}
