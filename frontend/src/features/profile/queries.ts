import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import { fetchAllPages } from '@/services/pagination';
import type { LibraryGame } from '@/types';

export interface DashboardGame {
  title: string;
  cover_url: string | null;
  custom_cover_url?: string | null;
  hours_played: number;
  rating: number | null;
  finished_at: string | null;
}

export interface YearlyGames {
  year: number;
  games: DashboardGame[];
}

export interface DashboardData {
  username: string;
  created_at: string | null;
  games_count: number;
  lists_count: number;
  tierlists_count: number;
  favorites_count: number;
  status_distribution: Record<string, number>;
  most_played_genre: string | null;
  genre_distribution: Record<string, number>;
  has_pending_genres: boolean;
  followers_count: number;
  following_count: number;
  store_distribution: Record<string, number>;
  playing_games: DashboardGame[];
  yearly_games: YearlyGames[];
  yearly_platinums: YearlyGames[];
  favorite_games: DashboardGame[];
  is_following?: boolean;
}

export interface UserPublicProfile {
  id: string;
  username: string;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export const profileKeys = {
  all: ['profiles'] as const,
  dashboard: (userId?: string) => [...profileKeys.all, 'dashboard', userId ?? 'me'] as const,
  games: (userId?: string) => [...profileKeys.all, 'games', userId ?? 'me'] as const,
  follows: (userId: string, type: 'followers' | 'following') => [...profileKeys.all, 'follows', userId, type] as const,
};

export const profileDashboardQuery = (userId?: string) => queryOptions({
  queryKey: profileKeys.dashboard(userId),
  queryFn: async () => (await api.get<DashboardData>(userId ? `/users/${userId}/dashboard` : '/users/me/dashboard')).data,
  staleTime: 5 * 60 * 1000,
});

export const profileGamesQuery = (userId?: string) => queryOptions({
  queryKey: profileKeys.games(userId),
  queryFn: () => fetchAllPages<LibraryGame>(userId ? `/user-games/user/${userId}` : '/user-games/me'),
});

export const followListQuery = (userId: string, type: 'followers' | 'following') => queryOptions({
  queryKey: profileKeys.follows(userId, type),
  queryFn: () => fetchAllPages<UserPublicProfile>(`/social/users/${userId}/${type}`),
});

export const toggleProfileFollow = async ({ username, following }: { username: string; following: boolean }) => {
  const url = `/social/users/${username}/follow`;
  if (following) await api.delete(url);
  else await api.post(url);
};
