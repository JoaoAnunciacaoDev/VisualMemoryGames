import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import api from '../../services/api';
import Toast from '../Toast/Toast';
import styles from './CustomListTab.module.css';

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

interface LibraryGame {
  game_id: string;
  title: string;
  cover_url: string | null;
  external_id: number;
}

interface Props {
  userId: string;
  libraryGames: LibraryGame[];
}

export default function CustomListsTab({ userId, libraryGames }: Props) {
  const [lists, setLists] = useState<CustomList[]>([]);
  const [newListName, setNewListName] = useState('');
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const loadLists = async () => {
    try {
      const response = await api.get(`/lists/user/${userId}`, { headers: getHeaders() });
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
      await api.post('/lists/', { name: newListName.trim() }, { headers: getHeaders() });
      setNewListName('');
      await loadLists();
      showToast('Lista criada!', 'success');
    } catch {
      showToast('Erro ao criar lista.', 'error');
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await api.delete(`/lists/${listId}`, { headers: getHeaders() });
      await loadLists();
      showToast('Lista removida.', 'info');
    } catch {
      showToast('Erro ao remover lista.', 'error');
    }
  };

  const handleAddGame = async (listId: string, gameId: string) => {
    try {
      await api.post(`/lists/${listId}/games/${gameId}`, {}, { headers: getHeaders() });
      await loadLists();
      setAddingToList(null);
      showToast('Jogo adicionado à lista!', 'success');
    } catch {
      showToast('Jogo já está na lista ou erro ao adicionar.', 'error');
    }
  };

  const handleRemoveGame = async (listId: string, gameId: string) => {
    try {
      await api.delete(`/lists/${listId}/games/${gameId}`, { headers: getHeaders() });
      await loadLists();
      showToast('Jogo removido da lista.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    }
  };

  const getGamesNotInList = (list: CustomList) => {
    const idsInList = new Set(list.games.map((g) => g.id));
    return libraryGames.filter((g) => !idsInList.has(g.game_id));
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
        <div className={styles.emptyState}>
          Nenhuma lista criada ainda. Crie uma acima!
        </div>
      ) : (
        <div className={styles.lists}>
          {lists.map((list) => (
            <div key={list.id} className={styles.listCard}>
              <div className={styles.listHeader}>
                <div className={styles.listInfo}>
                  <span className={styles.listName}>{list.name}</span>
                  <span className={styles.listCount}>{list.games.length} jogos</span>
                </div>
                <div className={styles.listActions}>
                  <button
                    className={styles.expandButton}
                    onClick={() => setExpandedList(expandedList === list.id ? null : list.id)}
                  >
                    {expandedList === list.id ? '▲' : '▼'}
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteList(list.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>

              {expandedList === list.id && (
                <div className={styles.listContent}>
                  <div className={styles.gameGrid}>
                    {list.games.map((game) => (
                      <div key={game.id} className={styles.gameItem}>
                        {game.cover_url ? (
                          <img src={game.cover_url} alt={game.title} className={styles.cover} />
                        ) : (
                          <div className={styles.noCover}>
                            {game.title.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className={styles.gameTitle}>{game.title}</span>
                        <button
                          className={styles.removeGame}
                          onClick={() => handleRemoveGame(list.id, game.id)}
                          title="Remover da lista"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {addingToList === list.id ? (
                    <div className={styles.addGameArea}>
                      <p className={styles.addGameLabel}>Selecione um jogo da biblioteca:</p>
                      <div className={styles.gameGrid}>
                        {getGamesNotInList(list).map((game) => (
                          <div
                            key={game.game_id}
                            className={`${styles.gameItem} ${styles.selectable}`}
                            onClick={() => handleAddGame(list.id, game.game_id)}
                          >
                            {game.cover_url ? (
                              <img src={game.cover_url} alt={game.title} className={styles.cover} />
                            ) : (
                              <div className={styles.noCover}>
                                {game.title.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className={styles.gameTitle}>{game.title}</span>
                          </div>
                        ))}
                        {getGamesNotInList(list).length === 0 && (
                          <p className={styles.allAdded}>Todos os jogos da biblioteca já estão nesta lista.</p>
                        )}
                      </div>
                      <button
                        className={styles.cancelButton}
                        onClick={() => setAddingToList(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.addGameButton}
                      onClick={() => setAddingToList(list.id)}
                    >
                      + Adicionar Jogo
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}