import { describe, expect, it } from 'vitest';
import { groupLibraryGames } from '@/pages/Library/libraryGameGroups';
import type { LibraryGame } from '@/types';

const game = (id: string, status: string, store: string | null): LibraryGame =>
  ({ id, title: id, status, store }) as LibraryGame;

describe('groupLibraryGames', () => {
  it('respeita a ordem de negócio dos status conhecidos', () => {
    const groups = groupLibraryGames(
      [game('a', 'Zerado', 'Steam'), game('b', 'Jogando', 'GOG')],
      'status',
    );

    expect(groups.map(({ label }) => label)).toEqual(['Jogando', 'Zerado']);
  });

  it('mantém status desconhecidos depois dos conhecidos', () => {
    const groups = groupLibraryGames(
      [game('a', 'Personalizado', 'Steam'), game('b', 'Zerado', 'Steam')],
      'status',
    );

    expect(groups.map(({ label }) => label)).toEqual(['Zerado', 'Personalizado']);
  });

  it('ordena lojas e agrupa valores vazios em Sem Loja', () => {
    const groups = groupLibraryGames(
      [game('a', 'Zerado', null), game('b', 'Zerado', 'Steam'), game('c', 'Zerado', 'GOG')],
      'store',
    );

    expect(groups.map(({ label }) => label)).toEqual(['GOG', 'Sem Loja', 'Steam']);
  });
});
