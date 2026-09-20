import { describe, expect, it } from 'vitest';
import { findMatchingLibraryGame } from '@/pages/Library/libraryGameMatching';
import type { GameResult, LibraryGame } from '@/types';

const libraryGame = {
  id: 'user-game-1', game_id: 'game-1', title: 'The Witcher 3', external_id: 42,
  status: 'Jogando', rating: null, favorite: false, hours_played: 0,
  cover_url: null, custom_cover_url: null, release_year: 2015, platforms: [], genres: [],
  started_at: null, finished_at: null, acquired_at: null, platinum_at: null,
  store: null, notes: null, is_manual: false,
} satisfies LibraryGame;

const result = {
  title: 'The Witcher 3', external_id: 42, cover_url: null,
  release_year: 2015, platforms: [], genres: [],
} as GameResult;

describe('findMatchingLibraryGame', () => {
  it('matches normalized titles', () => {
    expect(findMatchingLibraryGame([libraryGame], { ...result, title: '  the witcher 3 ' })).toBe(libraryGame);
  });

  it('returns undefined for a different game', () => {
    expect(findMatchingLibraryGame([libraryGame], { ...result, title: 'Cyberpunk 2077', external_id: 99 })).toBeUndefined();
  });

  it('handles an empty selection', () => {
    expect(findMatchingLibraryGame([libraryGame], null)).toBeUndefined();
  });
});
