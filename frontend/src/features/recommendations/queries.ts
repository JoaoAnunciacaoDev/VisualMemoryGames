import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import type { RecommendationGame } from '@/components/RecommendationCarousel/RecommendationCarousel';

export interface RecommendationCategory {
  title: string;
  games: RecommendationGame[];
}

export const recommendationKeys = {
  all: ['recommendations'] as const,
  mine: () => [...recommendationKeys.all, 'me'] as const,
};

export const recommendationsQuery = () => queryOptions({
  queryKey: recommendationKeys.mine(),
  queryFn: async () => (await api.get<RecommendationCategory[]>('/users/me/recommendations')).data,
  staleTime: 5 * 60_000,
});
