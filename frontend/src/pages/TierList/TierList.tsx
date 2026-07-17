import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConfirmModal, Button } from '@/components/Shared';

import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmAction } from '@/hooks/useConfirmAction';

import { getBestGameCover } from '@/services/media';
import api from '@/services/api';

import type { TierListSummary, CustomList, LibraryGame } from '@/types';

import styles from '@/pages/TierList/TierList.module.css';
import TierListCreateModal, { type TierListCreateValues } from '@/pages/TierList/TierListCreateModal';
import TierListGrid from '@/pages/TierList/TierListGrid';

const STATUS_OPTIONS = ['Zerado', 'Platinado', 'Jogando', 'Quero Jogar', 'Abandonado', 'Em Espera'];

export default function TierLists() {
  const navigate = useNavigate();
  const { loading } = useAuth();
  const { showToast } = useToast();

  const [tierLists, setTierLists] = useState<TierListSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [libraryGames, setLibraryGames] = useState<LibraryGame[]>([]);

  const deleteModal = useConfirmAction<string>();

  const reloadTierLists = useCallback(async () => {
    try {
      const response = await api.get('/tierlists/me');
      setTierLists(response.data);
    } catch {
      showToast('Erro ao carregar tier lists.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/tierlists/me'),
      api.get('/lists/me'),
      api.get('/user-games/me'),
    ])
      .then(([tierlistsRes, listsRes, libraryRes]) => {
        if (active) {
          setTierLists(tierlistsRes.data);
          setCustomLists(listsRes.data);
          setLibraryGames(libraryRes.data);
        }
      })
      .catch(() => {
        if (active) {
          showToast('Erro ao carregar dados das tier lists.', 'error');
        }
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  const handleCreate = async ({
    title,
    gameSource,
    selectedStatus,
    selectedListId,
  }: TierListCreateValues) => {
    setIsCreating(true);
    try {
      const response = await api.post('/tierlists/', { title });
      const tierlistId = response.data.id;

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
              custom_cover_url: null,
            }) ?? null,
        })) ?? [];

      }

      setShowCreateModal(false);
      navigate(`/tierlists/${tierlistId}`, { state: { initialPool: gamesToAdd } });
    } catch {
      showToast('Erro ao criar tier list.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDeleteList = async () => {
    if (!deleteModal.target) return;
    try {
      await api.delete(`/tierlists/${deleteModal.target}`);
      await reloadTierLists();
      showToast('Tier list deletada.', 'info');
    } catch {
      showToast('Erro ao deletar tier list.', 'error');
    } finally {
      deleteModal.close();
    }
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.loader}></div>
        <p>Carregando tier lists...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Minhas Tier Lists</h2>

      <Button variant="primary" onClick={() => setShowCreateModal(true)} className={styles.createButton}>
        + Nova Tier List
      </Button>

      <TierListCreateModal
        open={showCreateModal}
        isCreating={isCreating}
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
          onOpen={(id) => navigate(`/tierlists/${id}`)}
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