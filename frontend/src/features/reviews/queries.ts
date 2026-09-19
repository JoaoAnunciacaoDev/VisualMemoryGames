import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import type { UserGameReview } from '@/types';

interface ReviewInput {
  rating: number | null;
  notes: string | null;
}

export const reviewKeys = {
  all: ['reviews'] as const,
  forGame: (userGameId: string) => [...reviewKeys.all, userGameId] as const,
};

export const userGameReviewsQuery = (userGameId: string) => queryOptions({
  queryKey: reviewKeys.forGame(userGameId),
  queryFn: async () => (
    await api.get<UserGameReview[]>(`/user-games/${userGameId}/reviews`)
  ).data,
});

export async function saveGameReview({
  userGameId,
  reviewId,
  input,
}: {
  userGameId: string;
  reviewId?: string;
  input: ReviewInput;
}) {
  if (reviewId) {
    await api.put(`/user-games/${userGameId}/reviews/${reviewId}`, input);
    return;
  }
  await api.post(`/user-games/${userGameId}/reviews`, input);
}

export const deleteGameReview = ({ userGameId, reviewId }: { userGameId: string; reviewId: string }) =>
  api.delete(`/user-games/${userGameId}/reviews/${reviewId}`);
