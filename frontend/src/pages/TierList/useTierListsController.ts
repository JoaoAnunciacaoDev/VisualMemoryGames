import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { selectTierListInitialPool } from '@/features/tierlists/initialPool';
import {
  createTierList,
  deleteTierList,
  tierListKeys,
  tierListOverviewQuery,
} from '@/features/tierlists/queries';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useToast } from '@/hooks/useToast';
import type { TierListCreateValues } from '@/features/tierlists/types';

export const TIER_LIST_STATUS_OPTIONS = [
  'Zerado',
  'Platinado',
  'Jogando',
  'Na biblioteca',
  'Quero Jogar',
  'Abandonado',
  'Em Espera',
];

export function useTierListsController() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const overviewQuery = useQuery(tierListOverviewQuery());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const deleteModal = useConfirmAction<string>();
  const createMutation = useMutation({ mutationFn: createTierList });
  const deleteMutation = useMutation({
    mutationFn: deleteTierList,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tierListKeys.all }),
  });

  const tierLists = overviewQuery.data?.tierLists ?? [];
  const customLists = overviewQuery.data?.customLists ?? [];
  const libraryGames = overviewQuery.data?.libraryGames ?? [];

  const create = async (values: TierListCreateValues) => {
    try {
      const { id } = await createMutation.mutateAsync({
        title: values.title,
        isPublic: values.isPublic,
      });
      const initialPool = selectTierListInitialPool(values, libraryGames, customLists);
      setShowCreateModal(false);
      navigate({ to: '/tierlists/$id', params: { id }, state: { initialPool } });
    } catch {
      showToast('Erro ao criar tier list.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.target) return;
    try {
      await deleteMutation.mutateAsync(deleteModal.target);
      showToast('Tier list deletada.', 'info');
    } catch {
      showToast('Erro ao deletar tier list.', 'error');
    } finally {
      deleteModal.close();
    }
  };

  return {
    isLoading: overviewQuery.isPending,
    tierLists,
    customLists,
    showCreateModal,
    setShowCreateModal,
    isCreating: createMutation.isPending,
    deleteModal,
    create,
    confirmDelete,
    open: (id: string) => navigate({ to: '/tierlists/$id', params: { id } }),
  };
}
