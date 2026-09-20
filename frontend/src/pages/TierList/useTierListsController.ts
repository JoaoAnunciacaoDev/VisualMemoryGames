import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { customListsQuery } from '@/features/custom-lists/queries';
import { selectTierListInitialPool } from '@/features/tierlists/initialPool';
import {
  createTierList,
  deleteTierList,
  tierListKeys,
  tierListOverviewQuery,
} from '@/features/tierlists/queries';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useAuth } from '@/hooks/useAuth';
import { useLibrary } from '@/hooks/useLibrary';
import { useToast } from '@/hooks/useToast';
import type { TierListCreateValues, TierListGameSource } from '@/features/tierlists/types';

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
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const overviewQuery = useQuery(tierListOverviewQuery());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSource, setCreateSource] = useState<TierListGameSource>('empty');
  const needsLibrary = showCreateModal && (createSource === 'all' || createSource === 'status');
  const needsCustomLists = showCreateModal && createSource === 'list';
  const library = useLibrary(userId, needsLibrary);
  const listsQuery = useQuery({ ...customListsQuery(), enabled: needsCustomLists });
  const deleteModal = useConfirmAction<string>();
  const createMutation = useMutation({ mutationFn: createTierList });
  const deleteMutation = useMutation({
    mutationFn: deleteTierList,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tierListKeys.all }),
  });

  const tierLists = overviewQuery.data ?? [];
  const customLists = listsQuery.data ?? [];
  const libraryGames = library.games;
  const sourceLoading = needsLibrary
    ? library.loading || library.loadingMore || library.hasMore
    : needsCustomLists && listsQuery.isPending;
  const sourceError = needsLibrary
    ? library.error
    : needsCustomLists && listsQuery.isError
      ? 'Erro ao carregar listas personalizadas.'
      : null;

  const openCreate = () => {
    setCreateSource('empty');
    setShowCreateModal(true);
  };

  const closeCreate = () => {
    setCreateSource('empty');
    setShowCreateModal(false);
  };

  const create = async (values: TierListCreateValues) => {
    if (sourceLoading || sourceError) return;
    try {
      const { id } = await createMutation.mutateAsync({
        title: values.title,
        isPublic: values.isPublic,
      });
      const initialPool = selectTierListInitialPool(values, libraryGames, customLists);
      closeCreate();
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
    openCreate,
    closeCreate,
    setCreateSource,
    sourceLoading,
    sourceError,
    isCreating: createMutation.isPending,
    deleteModal,
    create,
    confirmDelete,
    open: (id: string) => navigate({ to: '/tierlists/$id', params: { id } }),
  };
}
