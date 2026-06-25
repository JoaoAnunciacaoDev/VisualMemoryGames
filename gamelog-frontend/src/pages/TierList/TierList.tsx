import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { getAuthHeaders } from '../../services/auth';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import Toast from '../../components/Toast/Toast';
import styles from './TierList.module.css';

interface TierListSummary {
  id: string;
  title: string;
  categories: { id: string; name: string; color: string; items: any[] }[];
}

interface CustomList {
  id: string;
  name: string;
  games: { id: string; title: string; cover_url: string | null }[];
}

interface LibraryGame {
  game_id: string;
  title: string;
  cover_url: string | null;
  status: string;
}

type GameSource = 'empty' | 'all' | 'status' | 'list';

const STATUS_OPTIONS = ['Zerado', 'Platinado', 'Jogando', 'Quero Jogar', 'Abandonado', 'Em Espera'];

export default function TierLists() {
  const navigate = useNavigate();
  const { userId, loading } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [tierLists, setTierLists] = useState<TierListSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [gameSource, setGameSource] = useState<GameSource>('empty');
  const [selectedStatus, setSelectedStatus] = useState('Zerado');
  const [selectedListId, setSelectedListId] = useState('');
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [libraryGames, setLibraryGames] = useState<LibraryGame[]>([]);
  const [listToRemove, setListToRemove] = useState<string | null>(null);

  const loadSources = async (uid: string) => {
    const [listsRes, libraryRes] = await Promise.all([
      api.get(`/lists/user/${uid}`, { headers: getAuthHeaders() }),
      api.get(`/user-games/user/${uid}`, { headers: getAuthHeaders() }),
    ]);
    setCustomLists(listsRes.data);
    setLibraryGames(libraryRes.data);
  };

  const loadTierLists = async (uid: string) => {
    try {
      const [tierlistsRes] = await Promise.all([
        api.get(`/tierlists/user/${uid}`, { headers: getAuthHeaders() }),
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
      const response = await api.post('/tierlists/', { title: newTitle.trim() }, { headers: getAuthHeaders() });
      const tierlistId = response.data.id;

      let gamesToAdd: { id: string; title: string; coverUrl: string | null }[] = [];

      if (gameSource === 'all') {
        gamesToAdd = libraryGames.map((g) => ({ id: g.game_id, title: g.title, coverUrl: g.cover_url }));
      } else if (gameSource === 'status') {
        gamesToAdd = libraryGames
          .filter((g) => g.status === selectedStatus)
          .map((g) => ({ id: g.game_id, title: g.title, coverUrl: g.cover_url }));
      } else if (gameSource === 'list') {
        const list = customLists.find((l) => l.id === selectedListId);
        gamesToAdd = list?.games.map((g) => ({ id: g.id, title: g.title, coverUrl: g.cover_url })) ?? [];
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
    if (!listToRemove) return;
    try {
      await api.delete(`/tierlists/${listToRemove}`, { headers: getAuthHeaders() });
      if (userId) await loadTierLists(userId);
      showToast('Tier list deletada.', 'info');
    } catch {
      showToast('Erro ao deletar tier list.', 'error');
    } finally {
      setListToRemove(null);
    }
  };

  if (loading) return <p>Carregando tier lists...</p>;

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Minhas Tier Lists</h2>

      <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
        + Nova Tier List
      </button>

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Nova Tier List</h3>

            <label className={styles.label}>
              Nome
              <input type="text" placeholder="Ex: Meus Jogos de 2024" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={styles.input} autoFocus />
            </label>

            <label className={styles.label}>
              Fonte dos jogos
              <select value={gameSource} onChange={(e) => setGameSource(e.target.value as GameSource)} className={styles.input}>
                <option value="empty">Vazia (adicionar manualmente)</option>
                <option value="all">Toda a biblioteca</option>
                <option value="status">Por status</option>
                <option value="list">Lista personalizada</option>
              </select>
            </label>

            {gameSource === 'status' && (
              <label className={styles.label}>
                Status
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={styles.input}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            )}

            {gameSource === 'list' && (
              <label className={styles.label}>
                Lista
                <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)} className={styles.input}>
                  <option value="">Selecione uma lista...</option>
                  {customLists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.games.length} jogos)</option>)}
                </select>
              </label>
            )}

            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowCreateModal(false)}>Cancelar</button>
              <button
                className={styles.confirmButton}
                onClick={handleCreate}
                disabled={isCreating || !newTitle.trim() || (gameSource === 'list' && !selectedListId)}
              >
                {isCreating ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tierLists.length === 0 ? (
        <div className={styles.emptyState}>Você ainda não tem tier lists. Crie uma acima!</div>
      ) : (
        <div className={styles.grid}>
          {tierLists.map((tl) => (
            <div key={tl.id} className={styles.card}>
              <div className={styles.cardPreview} onClick={() => navigate(`/tierlists/${tl.id}`)}>
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
                <span className={styles.cardTitle} onClick={() => navigate(`/tierlists/${tl.id}`)}>{tl.title}</span>
                <button className={styles.deleteButton} onClick={() => setListToRemove(tl.id)} title="Deletar">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={listToRemove !== null}
        title="Deletar Tier List"
        message="Tem certeza que deseja deletar esta Tier List inteira? Esta ação não pode ser desfeita."
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmDeleteList}
        onCancel={() => setListToRemove(null)}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}