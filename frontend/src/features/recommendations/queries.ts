import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';

export interface RecommendationGame {
  id: string;
  external_id: number;
  title: string;
  cover_url: string;
  release_year: number | null;
  rating?: number;
  source: 'igdb' | 'rawg' | 'catalog';
}

interface Store {
  id: number;
  name: string;
  url: string;
}

export interface RecommendationGameDetails {
  synopsis: string;
  genres: string[];
  trailer_url?: string;
  stores?: Store[];
  rating?: number;
}

export interface RecommendationCategory {
  title: string;
  games: RecommendationGame[];
}

export const recommendationKeys = {
  all: ['recommendations'] as const,
  mine: () => [...recommendationKeys.all, 'me'] as const,
  details: (externalId: number, source?: string) => [...recommendationKeys.all, 'details', source ?? 'auto', externalId] as const,
};

export const recommendationsQuery = () => queryOptions({
  queryKey: recommendationKeys.mine(),
  queryFn: async () => (await api.get<RecommendationCategory[]>('/users/me/recommendations')).data,
  staleTime: 5 * 60_000,
});

export const recommendationDetailsQuery = (externalId: number | null, source?: string) => queryOptions({
  queryKey: recommendationKeys.details(externalId ?? 0, source),
  queryFn: async () => (
    await api.get<RecommendationGameDetails>(`/users/me/recommendations/game-details/${externalId}`, {
      params: source && source !== 'catalog' ? { source } : undefined,
    })
  ).data,
  enabled: externalId !== null,
  staleTime: 10 * 60_000,
});
