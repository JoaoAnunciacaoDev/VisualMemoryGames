import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';

import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmAction } from '@/hooks/useConfirmAction';

import { getBestGameCover } from '@/services/media';
import api from '@/services/api';

import type { TierListSummary, CustomList, LibraryGame } from '@/types';

import styles from '@/pages/TierList/TierList.module.css';

type GameSource = 'empty' | 'all' | 'status' | 'list';

const STATUS_OPTIONS = ['Zerado', 'Platinado', 'Jogando', 'Quero Jogar', 'Abandonado', 'Em Espera'];

export default function TierLists() {
  const navigate = useNavigate();
  const { userId, loading } = useAuth();
  const { showToast } = useToast();

  const [tierLists, setTierLists] = useState<TierListSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [gameSource, setGameSource] = useState<GameSource>('empty');
  const [selectedStatus, setSelectedStatus] = useState('Zerado');
  const [selectedListId, setSelectedListId] = useState('');
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [libraryGames, setLibraryGames] = useState<LibraryGame[]>([]);

  const deleteModal = useConfirmAction<string>();

  const loadSources = async (uid: string) => {
    const [listsRes, libraryRes] = await Promise.all([
      api.get(`/lists/user/${uid}`),
      api.get(`/user-games/user/${uid}`),
    ]);
    setCustomLists(listsRes.data);
    setLibraryGames(libraryRes.data);
  };

  const loadTierLists = async (uid: string) => {
    try {
      const [tierlistsRes] = await Promise.all([
        api.get(`/tierlists/user/${uid}`),
        loadSources(uid),
      ]);
      setTierLists(tierlistsRes.data);
    } catch {
      showToast('Erro ao carregar tier lists.', 'error');
    }
  };

  useEffect(() => {
    if (userId) loadTierLists(userId);
  }, [userId]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const response = await api.post('/tierlists/', { title: newTitle.trim() });
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
      setNewTitle('');
      setGameSource('empty');
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
      if (userId) await loadTierLists(userId);
      showToast('Tier list deletada.', 'info');
    } catch {
      showToast('Erro ao deletar tier list.', 'error');
    } finally {
      deleteModal.close();
    }
  };

  if (loading) return <p>Carregando tier lists...</p>;

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Minhas Tier Lists</h2>

      <Button variant="primary" onClick={() => setShowCreateModal(true)} className={styles.createButton}>
        + Nova Tier List
      </Button>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="460px" showCloseButton>
        <div className={styles.modalContent}>
          <h3 className={styles.modalTitle}>Nova Tier List</h3>

          <label className={styles.label}>
            Nome
            <Input
              type="text"
              placeholder="Ex: Meus Jogos de 2024"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
          </label>

          <label className={styles.label}>
            Fonte dos jogos
            <select
              value={gameSource}
              onChange={(e) => setGameSource(e.target.value as GameSource)}
              className={styles.select}
            >
              <option value="empty">Vazia (adicionar manualmente)</option>
              <option value="all">Toda a biblioteca</option>
              <option value="status">Por status</option>
              <option value="list">Lista personalizada</option>
            </select>
          </label>

          {gameSource === 'status' && (
            <label className={styles.label}>
              Status
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.select}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}

          {gameSource === 'list' && (
            <label className={styles.label}>
              Lista
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className={styles.select}
              >
                <option value="">Selecione uma lista...</option>
                {customLists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.games.length} jogos)</option>
                ))}
              </select>
            </label>
          )}

          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={isCreating || !newTitle.trim() || (gameSource === 'list' && !selectedListId)}
            >
              {isCreating ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {tierLists.length === 0 ? (
        <div className={styles.emptyState}>Você ainda não tem tier lists. Crie uma acima!</div>
      ) : (
        <div className={styles.grid}>
          {tierLists.map((tl) => (
            <div key={tl.id} className={styles.card}>
              <div
                className={styles.cardPreview}
                onClick={() => navigate(`/tierlists/${tl.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/tierlists/${tl.id}`);
                  }
                }}
                aria-label={`Abrir tier list ${tl.title}`}
              >
                {tl.categories
                  .filter((cat) => cat.name !== '__pool__')
                  .slice(0, 5)
                  .map((cat) => (
                    <div key={cat.id} className={styles.previewTier} style={{ backgroundColor: cat.color }}>
                      <span className={styles.previewLabel}>{cat.name}</span>
                      <span className={styles.previewCount}>{cat.items.length} jogos</span>
                    </div>
                  ))}
              </div>
              <div className={styles.cardFooter}>
                <button
                  type="button"
                  className={styles.cardTitle}
                  onClick={() => navigate(`/tierlists/${tl.id}`)}
                >
                  {tl.title}
                </button>
                <button type="button" className={styles.deleteButton} onClick={() => deleteModal.open(tl.id)} title="Deletar">🗑</button>
              </div>
            </div>
          ))}
        </div>
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