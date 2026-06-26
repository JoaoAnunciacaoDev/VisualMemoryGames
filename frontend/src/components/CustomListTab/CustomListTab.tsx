import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { getAuthHeaders } from '@/services/auth';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal';
import SelectGamesModal from '@/components/SelectGamesModal/SelectGamesModal';
import Toast from '@/components/Toast/Toast';
import styles from '@/components/CustomListTab/CustomListTab.module.css';
import { LibraryGame } from '@/types/game';
import { getBestGameCover } from '@/services/media';

interface GameInList {
  id: string;
  title: string;
  cover_url: string | null;
  external_id: number;
}

interface CustomList {
  id: string;
  name: string;
  games: GameInList[];
}

interface Props {
  userId: string;
  libraryGames: LibraryGame[];
}

export default function CustomListsTab({ userId, libraryGames }: Props) {
  const [lists, setLists] = useState<CustomList[]>([]);
  const [newListName, setNewListName] = useState('');
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [selectingForList, setSelectingForList] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [gameToRemove, setGameToRemove] = useState<{ listId: string; gameId: string } | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const loadLists = async () => {
    try {
      const response = await api.get(`/lists/user/${userId}`, { headers: getAuthHeaders() });
      setLists(response.data);
    } catch {
      showToast('Erro ao carregar listas.', 'error');
    }
  };

  useEffect(() => {
    if (userId) loadLists();
  }, [userId]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await api.post('/lists/', { name: newListName.trim() }, { headers: getAuthHeaders() });
      setNewListName('');
      await loadLists();
      showToast('Lista criada!', 'success');
    } catch {
      showToast('Erro ao criar lista.', 'error');
    }
  };

  const handleDeleteList = async () => {
    if (!listToDelete) return;
    try {
      await api.delete(`/lists/${listToDelete}`, { headers: getAuthHeaders() });
      await loadLists();
      showToast('Lista removida.', 'info');
    } catch {
      showToast('Erro ao remover lista.', 'error');
    } finally {
      setListToDelete(null);
    }
  };

  const handleRenameList = async (listId: string) => {
    if (!editingListName.trim()) return;
    try {
      await api.put(`/lists/${listId}`, { name: editingListName.trim() }, { headers: getAuthHeaders() });
      await loadLists();
      showToast('Lista renomeada!', 'success');
    } catch {
      showToast('Erro ao renomear lista.', 'error');
    } finally {
      setEditingListId(null);
      setEditingListName('');
    }
  };

  const handleAddGames = async (listId: string, gameIds: string[]) => {
    try {
      await Promise.all(
        gameIds.map((gameId) =>
          api.post(`/lists/${listId}/games/${gameId}`, {}, { headers: getAuthHeaders() })
        )
      );
      await loadLists();
      setSelectingForList(null);
      showToast(`${gameIds.length} jogo(s) adicionado(s) à lista!`, 'success');
    } catch {
      showToast('Erro ao adicionar jogos.', 'error');
    }
  };

  const handleRemoveGame = async () => {
    if (!gameToRemove) return;
    try {
      await api.delete(`/lists/${gameToRemove.listId}/games/${gameToRemove.gameId}`, { headers: getAuthHeaders() });
      await loadLists();
      showToast('Jogo removido da lista.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    } finally {
      setGameToRemove(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.createRow}>
        <input
          type="text"
          placeholder="Nome da nova lista..."
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
          className={styles.input}
        />
        <button className={styles.createButton} onClick={handleCreateList}>
          + Criar Lista
        </button>
      </div>

      {lists.length === 0 ? (
        <div className={styles.emptyState}>Nenhuma lista criada ainda. Crie uma acima!</div>
      ) : (
        <div className={styles.lists}>
          {lists.map((list) => (
            <div key={list.id} className={styles.listCard}>
              <div className={styles.listHeader}>
                <div className={styles.listInfo}>
                  {editingListId === list.id ? (
                    <input
                      className={styles.editInput}
                      value={editingListName}
                      onChange={(e) => setEditingListName(e.target.value)}
                      onBlur={() => handleRenameList(list.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameList(list.id);
                        if (e.key === 'Escape') { setEditingListId(null); setEditingListName(''); }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={styles.listName}
                      onDoubleClick={() => { setEditingListId(list.id); setEditingListName(list.name); }}
                      title="Clique duplo para renomear"
                    >
                      {list.name}
                    </span>
                  )}
                  <span className={styles.listCount}>{list.games.length} jogos</span>
                </div>
                <div className={styles.listActions}>
                  <button className={styles.expandButton} onClick={() => setExpandedList(expandedList === list.id ? null : list.id)}>
                    {expandedList === list.id ? '▲' : '▼'}
                  </button>
                  <button className={styles.deleteButton} onClick={() => setListToDelete(list.id)}>🗑</button>
                </div>
              </div>

              {expandedList === list.id && (
                <div className={styles.listContent}>
                  <div className={styles.gameGrid}>
                    {list.games.map((game) => (
                      <div key={game.id} className={styles.gameItem}>
                        {game.cover_url ? (
                          <img src={getBestGameCover(game)} alt={game.title} className={styles.cover} />
                        ) : (
                          <div className={styles.noCover}>{game.title.substring(0, 2).toUpperCase()}</div>
                        )}
                        <span className={styles.gameTitle}>{game.title}</span>
                        <button className={styles.removeGame} onClick={() => setGameToRemove({ listId: list.id, gameId: game.id })} title="Remover da lista">✕</button>
                      </div>
                    ))}
                  </div>
                  <button className={styles.addGameButton} onClick={() => setSelectingForList(list.id)}>
                    + Adicionar Jogo
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={listToDelete !== null}
        title="Deletar Lista"
        message="Tem certeza que deseja deletar esta lista? Os jogos não serão removidos da biblioteca."
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleDeleteList}
        onCancel={() => setListToDelete(null)}
      />

      <ConfirmModal
        isOpen={gameToRemove !== null}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da lista?"
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleRemoveGame}
        onCancel={() => setGameToRemove(null)}
      />

      {selectingForList && (
        <SelectGamesModal
          games={libraryGames}
          alreadyInList={new Set(lists.find((l) => l.id === selectingForList)?.games.map((g) => g.id) ?? [])}
          onConfirm={(ids) => handleAddGames(selectingForList, ids)}
          onClose={() => setSelectingForList(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}