import { describe, expect, it } from 'vitest';
import { selectTierListInitialPool } from '@/features/tierlists/initialPool';
import type { CustomList, LibraryGame } from '@/types';

const libraryGames = [
  {
    id: 'user-game-1',
    game_id: 'game-1',
    title: 'Control',
    status: 'Zerado',
    cover_url: 'control.jpg',
  },
  {
    id: 'user-game-2',
    game_id: 'game-2',
    title: 'Hades',
    status: 'Jogando',
    cover_url: 'hades.jpg',
  },
] as LibraryGame[];

const customLists = [
  {
    id: 'favorites',
    name: 'Favoritos',
    games: [{ id: 'game-2', title: 'Hades', cover_url: 'hades.jpg' }],
  },
] as CustomList[];

const values = {
  title: 'Minha lista',
  gameSource: 'all' as const,
  selectedStatus: 'Zerado',
  selectedListId: 'favorites',
  isPublic: true,
};

describe('selectTierListInitialPool', () => {
  it('seleciona toda a biblioteca', () => {
    expect(selectTierListInitialPool(values, libraryGames, customLists)).toHaveLength(2);
  });

  it('seleciona somente jogos do status escolhido', () => {
    expect(
      selectTierListInitialPool(
        { ...values, gameSource: 'status' },
        libraryGames,
        customLists,
      ).map((game) => game.id),
    ).toEqual(['game-1']);
  });

  it('seleciona jogos de uma lista personalizada', () => {
    expect(
      selectTierListInitialPool(
        { ...values, gameSource: 'list' },
        libraryGames,
        customLists,
      ).map((game) => game.id),
    ).toEqual(['game-2']);
  });
});
