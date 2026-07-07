import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { useToast } from '@/hooks/useToast';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import api from '@/services/api';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import SelectGamesModal from '@/components/SelectGamesModal/SelectGamesModal';
import Input from '@/components/Shared/Input/Input';
import Button from '@/components/Shared/Button/Button';
import Card from '@/components/Shared/Card/Card';
import styles from '@/components/CustomListTab/CustomListTab.module.css';
import { getBestGameCover } from '@/services/media';
import { GameInList, LibraryGame } from '@/types';

interface CustomList {
  id: string;
  name: string;
  games: GameInList[];
  is_system: boolean;
  list_type: string | null;
}

interface Props {
  userId: string;
  libraryGames: LibraryGame[];
  onLibraryChange: () => void;
}

export default function CustomListsTab({ userId, libraryGames, onLibraryChange }: Props) {
  const [lists, setLists] = useState<CustomList[]>([]);
  const [newListName, setNewListName] = useState('');
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [selectingForList, setSelectingForList] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  const { showToast } = useToast();
  const deleteListModal = useConfirmAction<string>();
  const removeGameModal = useConfirmAction<{ listId: string; gameId: string }>();

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    try {
      const response = await api.get('/lists/me');
      const priority: Record<string, number> = {
        'favorites': 1,
        'completed_year': 2,
        'platinized_year': 3,
      };
      const sorted = response.data.sort((a: CustomList, b: CustomList) => {
        const aPriority = a.list_type ? (priority[a.list_type] ?? 4) : 4;
        const bPriority = b.list_type ? (priority[b.list_type] ?? 4) : 4;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.name.localeCompare(b.name);
      });
      setLists(sorted);
    } catch {
      showToast('Erro ao carregar listas.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await api.post('/lists/', { name: newListName.trim() });
      setNewListName('');
      await loadLists();
      showToast('Lista criada!', 'success');
    } catch {
      showToast('Erro ao criar lista.', 'error');
    }
  };

  const handleDeleteList = async () => {
    if (!deleteListModal.target) return;
    try {
      await api.delete(`/lists/${deleteListModal.target}`);
      if (expandedList === deleteListModal.target) setExpandedList(null);
      await loadLists();
      showToast('Lista removida.', 'info');
    } catch {
      showToast('Erro ao remover lista.', 'error');
    } finally {
      deleteListModal.close();
    }
  };

  const handleRenameList = async (listId: string) => {
    if (!editingListName.trim()) return;
    try {
      await api.put(`/lists/${listId}`, { name: editingListName.trim() });
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
        gameIds.map((gameId) => api.post(`/lists/${listId}/games/${gameId}`, {}))
      );
      await loadLists();
      setSelectingForList(null);
      showToast(`${gameIds.length} jogo(s) adicionado(s) à lista!`, 'success');
    } catch {
      showToast('Erro ao adicionar jogos.', 'error');
    }
  };

  const handleRemoveGame = async () => {
    if (!removeGameModal.target) return;
    try {
      await api.delete(
        `/lists/${removeGameModal.target.listId}/games/${removeGameModal.target.gameId}`
      );
      await loadLists();
      onLibraryChange();
      showToast('Jogo removido da lista.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    } finally {
      removeGameModal.close();
    }
  };

  const toggleExpand = (listId: string) => {
    setExpandedList((prev) => (prev === listId ? null : listId));
  };

  const handleListHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>, listId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpand(listId);
      setSelectedGameId(null);
    }
  };

  const handleGameItemKeyDown = (event: KeyboardEvent<HTMLDivElement>, gameId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedGameId((prev) => (prev === gameId ? null : gameId));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.createRow}>
        <Input
          type="text"
          placeholder="Nome da nova lista..."
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
        />
        <Button variant="primary" onClick={handleCreateList}>
          + Criar Lista
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className={styles.emptyState}>
          Nenhuma lista criada ainda. Crie uma acima!
        </div>
      ) : (
        <div className={styles.lists}>
          {lists.map((list) => (
            <Card key={list.id} className={`${styles.listCard} ${expandedList === list.id ? styles.listCardSelected : ''}`}>
              <div
                className={styles.listHeader}
                onClick={() => {
                  toggleExpand(list.id);
                  setSelectedGameId(null);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => handleListHeaderKeyDown(event, list.id)}
                aria-expanded={expandedList === list.id}
                aria-label={`${expandedList === list.id ? 'Recolher' : 'Expandir'} lista ${list.name}`}
              >
                <div className={styles.listInfo}>
                  {list.is_system ? (
                    <span className={styles.listName}>
                      {list.list_type === 'favorites' && '⭐ '}
                      {list.list_type === 'completed_year' && '🏁 '}
                      {list.list_type === 'platinized_year' && '🏆 '}
                      {list.name}
                    </span>
                  ) : editingListId === list.id ? (
                    <input
                      className={styles.editInput}
                      value={editingListName}
                      onChange={(e) => setEditingListName(e.target.value)}
                      onBlur={() => handleRenameList(list.id)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameList(list.id);
                        if (e.key === 'Escape') {
                          setEditingListId(null);
                          setEditingListName('');
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={styles.listName}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingListId(list.id);
                        setEditingListName(list.name);
                      }}
                      title="Clique duplo para renomear"
                    >
                      {list.name}
                    </span>
                  )}
                  <span className={styles.listCount}>{list.games.length} jogos</span>
                </div>

                <div className={styles.listActions}>
                  <span className={styles.expandIcon}>
                    {expandedList === list.id ? '▲' : '▼'}
                  </span>
                  {!list.is_system && (
                    <Button
                      type="button"
                      variant="ghost"
                      className={`${styles.iconButton} ${styles.deleteIcon}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteListModal.open(list.id);
                      }}
                    >
                      🗑
                    </Button>
                  )}
                </div>
              </div>

              {expandedList === list.id && (
                <div className={styles.listContent}>
                  <div className={styles.gameGrid}>
                    {list.games.map((game) => (
                      <div
                        key={game.id}
                        className={`${styles.gameItem} ${selectedGameId === game.id ? styles.gameItemSelected : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGameId(selectedGameId === game.id ? null : game.id);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => handleGameItemKeyDown(event, game.id)}
                        aria-pressed={selectedGameId === game.id}
                        aria-label={`${selectedGameId === game.id ? 'Desselecionar' : 'Selecionar'} jogo ${game.title}`}
                      >
                        {game.cover_url ? (
                          <img
                            src={getBestGameCover(game)}
                            alt={game.title}
                            className={styles.cover}
                          />
                        ) : (
                          <div className={styles.noCover}>
                            {game.title.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className={styles.gameTitle}>{game.title}</span>
                        {selectedGameId === game.id && (
                          <button
                            type="button"
                            className={styles.removeGame}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeGameModal.open({
                                listId: list.id,
                                gameId: game.id,
                              });
                            }}
                            title="Remover da lista"
                          >
                            X
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!list.is_system && (
                    <Button
                      type="button"
                      variant="primary"
                      className={styles.addGameButton}
                      onClick={() => setSelectingForList(list.id)}
                    >
                      + Adicionar Jogo
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteListModal.isOpen}
        title="Deletar Lista"
        message="Tem certeza que deseja deletar esta lista? Os jogos não serão removidos da biblioteca."
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleDeleteList}
        onCancel={deleteListModal.close}
      />

      <ConfirmModal
        isOpen={removeGameModal.isOpen}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da lista?"
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleRemoveGame}
        onCancel={removeGameModal.close}
      />

      {selectingForList && (
        <SelectGamesModal
          games={libraryGames}
          alreadyInList={
            new Set(
              lists.find((l) => l.id === selectingForList)?.games.map((g) => g.id) ?? []
            )
          }
          onConfirm={(ids) => handleAddGames(selectingForList, ids)}
          onClose={() => setSelectingForList(null)}
        />
      )}
    </div>
  );
}