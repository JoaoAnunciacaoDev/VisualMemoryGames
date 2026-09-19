import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { ConfirmModal, Button, Loader } from '@/components/Shared';

import { useToast } from '@/hooks/useToast';
import { useConfirmAction } from '@/hooks/useConfirmAction';

import { getBestGameCover } from '@/services/media';

import styles from '@/pages/TierList/TierList.module.css';
import TierListCreateModal, { type TierListCreateValues } from '@/pages/TierList/TierListCreateModal';
import TierListGrid from '@/pages/TierList/TierListGrid';
import {
  createTierList,
  deleteTierList,
  tierListKeys,
  tierListOverviewQuery,
} from '@/features/tierlists/queries';

const STATUS_OPTIONS = ['Zerado', 'Platinado', 'Jogando', 'Na biblioteca', 'Quero Jogar', 'Abandonado', 'Em Espera'];

export default function TierLists() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const overviewQuery = useQuery(tierListOverviewQuery());
  const tierLists = overviewQuery.data?.tierLists ?? [];
  const customLists = overviewQuery.data?.customLists ?? [];
  const libraryGames = overviewQuery.data?.libraryGames ?? [];

  const [showCreateModal, setShowCreateModal] = useState(false);

  const deleteModal = useConfirmAction<string>();

  const createMutation = useMutation({ mutationFn: createTierList });
  const deleteMutation = useMutation({
    mutationFn: deleteTierList,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tierListKeys.all }),
  });

  const handleCreate = async ({
    title,
    gameSource,
    selectedStatus,
    selectedListId,
    isPublic,
  }: TierListCreateValues) => {
    try {
      const { id: tierlistId } = await createMutation.mutateAsync({ title, isPublic });

      let gamesToAdd: { id: string; title: string; coverUrl: string | null }[] = [];

      if (gameSource === 'all') {
        gamesToAdd = libraryGames.map((g) => ({
           id: g.game_id, 
           title: g.title, 
           coverUrl: getBestGameCover({
              cover_url: g.cover_url,
              custom_cover_url: g.custom_cover_url,
            }) ?? null,
          }));

      } else if (gameSource === 'status') {
        gamesToAdd = libraryGames
          .filter((g) => g.status === selectedStatus)
          .map((g) => ({ 
            id: g.game_id, 
            title: g.title, 
            coverUrl: getBestGameCover({
              cover_url: g.cover_url,
              custom_cover_url: g.custom_cover_url,
            }) ?? null, 
          }));

      } else if (gameSource === 'list') {
        const list = customLists.find((l) => l.id === selectedListId);
        gamesToAdd = list?.games.map((g) => ({ 
          id: g.id, 
          title: g.title, 
          coverUrl: getBestGameCover({
              cover_url: g.cover_url,
            }) ?? null,
        })) ?? [];

      }

      setShowCreateModal(false);
      navigate({
        to: '/tierlists/$id',
        params: { id: tierlistId },
        state: { initialPool: gamesToAdd },
      });
    } catch {
      showToast('Erro ao criar tier list.', 'error');
    }
  };

  const confirmDeleteList = async () => {
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

  if (overviewQuery.isPending) {
    return <Loader message="Carregando tier lists..." />;
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Minhas Tier Lists</h2>

      <Button variant="primary" onClick={() => setShowCreateModal(true)} className={styles.createButton}>
        + Nova Tier List
      </Button>

      <TierListCreateModal
        open={showCreateModal}
        isCreating={createMutation.isPending}
        customLists={customLists}
        statusOptions={STATUS_OPTIONS}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />

      {tierLists.length === 0 ? (
        <div className={styles.emptyState}>Você ainda não tem tier lists. Crie uma acima!</div>
      ) : (
        <TierListGrid
          tierLists={tierLists}
          onOpen={(id) => navigate({ to: '/tierlists/$id', params: { id } })}
          onDelete={(id) => deleteModal.open(id)}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Deletar Tier List"
        message="Tem certeza que deseja deletar esta Tier List inteira? Esta ação não pode ser desfeita."
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmDeleteList}
        onCancel={deleteModal.close}
      />
    </div>
  );
}
