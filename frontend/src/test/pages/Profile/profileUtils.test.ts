import { describe, expect, it } from 'vitest';
import type { YearlyGames } from '@/features/profile/queries';
import { filterYearlyGames, formatProfileDate } from '@/pages/Profile/profileUtils';

const yearlyGames: YearlyGames[] = [
  {
    year: 2025,
    games: [
      { title: 'Janeiro', cover_url: null, hours_played: 10, rating: 8, finished_at: '2025-01-15' },
      { title: 'Fevereiro', cover_url: null, hours_played: 20, rating: null, finished_at: '2025-02-10' },
      { title: 'Sem data', cover_url: null, hours_played: 0, rating: null, finished_at: null },
    ],
  },
];

describe('profileUtils', () => {
  it('filters games by year and month', () => {
    expect(filterYearlyGames(yearlyGames, 2025, '1').map((game) => game.title)).toEqual(['Fevereiro']);
  });

  it('uses the first available year when the selected year is absent', () => {
    expect(filterYearlyGames(yearlyGames, 2030, 'all')).toHaveLength(3);
  });

  it('returns an empty list when no yearly data exists', () => {
    expect(filterYearlyGames([], 2025, 'all')).toEqual([]);
  });

  it('formats profile dates and handles missing values', () => {
    expect(formatProfileDate(null)).toBe('Data desconhecida');
    expect(formatProfileDate('2025-03-12')).toContain('2025');
  });
});
