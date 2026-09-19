import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteGameReview,
  reviewKeys,
  saveGameReview,
  userGameReviewsQuery,
} from '@/features/reviews/queries';
import { useToast } from '@/hooks/useToast';
import type { UserGameReview } from '@/types';

export function useGameReviews({
  userGameId,
  rating,
  onAllDeleted,
}: {
  userGameId: string;
  rating: number | null | undefined;
  onAllDeleted: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const reviewsQuery = useQuery(userGameReviewsQuery(userGameId));
  const [showHistory, setShowHistory] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const saveMutation = useMutation({
    mutationFn: saveGameReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.forGame(userGameId) }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteGameReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.forGame(userGameId) }),
  });

  const save = async () => {
    if (rating === null && !notes.trim()) {
      showToast('Adicione uma nota (no topo do modal) ou um comentário para salvar a avaliação.', 'error');
      return;
    }

    try {
      await saveMutation.mutateAsync({
        userGameId,
        reviewId: editingReviewId ?? undefined,
        input: { rating: rating ?? null, notes: notes.trim() || null },
      });
      showToast(editingReviewId ? 'Avaliação atualizada com sucesso!' : 'Avaliação adicionada com sucesso!', 'success');
      setNotes('');
      setEditingReviewId(null);
    } catch {
      showToast('Erro ao salvar avaliação.', 'error');
    }
  };

  const startEditing = (review: UserGameReview) => {
    setEditingReviewId(review.id);
    setNotes(review.notes ?? '');
    document.getElementById('review-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingReviewId(null);
    setNotes('');
  };

  const remove = async (reviewId: string) => {
    try {
      await deleteMutation.mutateAsync({ userGameId, reviewId });
      showToast('Avaliação excluída com sucesso!', 'success');
      if (editingReviewId === reviewId) cancelEditing();
      const updatedReviews = await queryClient.fetchQuery(userGameReviewsQuery(userGameId));
      if (updatedReviews.length === 0) onAllDeleted();
    } catch {
      showToast('Erro ao excluir avaliação.', 'error');
    }
  };

  return {
    reviews: reviewsQuery.data ?? [],
    latestReview: reviewsQuery.data?.[0],
    isLoading: reviewsQuery.isPending,
    isMutating: saveMutation.isPending || deleteMutation.isPending,
    showHistory,
    setShowHistory,
    editingReviewId,
    notes,
    setNotes,
    save,
    startEditing,
    cancelEditing,
    remove,
  };
}

export type GameReviewsController = ReturnType<typeof useGameReviews>;
