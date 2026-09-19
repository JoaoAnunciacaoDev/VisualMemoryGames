import { useState, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import SelectGamesModal from '@/components/SelectGamesModal/SelectGamesModal';
import Input from '@/components/Shared/Input/Input';
import Button from '@/components/Shared/Button/Button';
import Card from '@/components/Shared/Card/Card';
import styles from '@/components/CustomListTab/CustomListTab.module.css';
import { getBestGameCover } from '@/services/media';
import { GameInList, LibraryGame } from '@/types';
import { ChevronDown, ChevronUp, Flag, Star, Trash2, Trophy } from 'lucide-react';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  addGamesToCustomList,
  createCustomList,
  customListKeys,
  customListsQuery,
  deleteCustomList,
  removeGameFromCustomList,
  renameCustomList,
  reorderCustomList,
  type CustomList,
} from '@/features/custom-lists/queries';

interface Props {
  libraryGames: LibraryGame[];
  onLibraryChange: () => void;
}

export default function CustomListsTab({ libraryGames, onLibraryChange }: Props) {
  const queryClient = useQueryClient();
  const { data: lists = [] } = useQuery(customListsQuery());
  const [newListName, setNewListName] = useState('');
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [selectingForList, setSelectingForList] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  const { showToast } = useToast();
  const deleteListModal = useConfirmAction<string>();
  const removeGameModal = useConfirmAction<{ listId: string; gameId: string }>();

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const refreshLists = () => queryClient.invalidateQueries({ queryKey: customListKeys.mine() });
  const createMutation = useMutation({ mutationFn: createCustomList, onSuccess: refreshLists });
  const deleteMutation = useMutation({ mutationFn: deleteCustomList, onSuccess: refreshLists });
  const renameMutation = useMutation({ mutationFn: renameCustomList, onSuccess: refreshLists });
  const addGamesMutation = useMutation({ mutationFn: addGamesToCustomList, onSuccess: refreshLists });
  const removeGameMutation = useMutation({ mutationFn: removeGameFromCustomList, onSuccess: refreshLists });
  const reorderMutation = useMutation({ mutationFn: reorderCustomList });

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await createMutation.mutateAsync(newListName.trim());
      setNewListName('');
      showToast('Lista criada!', 'success');
    } catch {
      showToast('Erro ao criar lista.', 'error');
    }
  };

  const handleDeleteList = async () => {
    if (!deleteListModal.target) return;
    try {
      await deleteMutation.mutateAsync(deleteListModal.target);
      if (expandedList === deleteListModal.target) setExpandedList(null);
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
      await renameMutation.mutateAsync({ id: listId, name: editingListName.trim() });
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
      await addGamesMutation.mutateAsync({ listId, gameIds });
      setSelectingForList(null);
      showToast(`${gameIds.length} jogo(s) adicionado(s) à lista!`, 'success');
    } catch {
      showToast('Erro ao adicionar jogos.', 'error');
    }
  };

  const handleRemoveGame = async () => {
    if (!removeGameModal.target) return;
    try {
      await removeGameMutation.mutateAsync(removeGameModal.target);
      onLibraryChange();
      showToast('Jogo removido da lista.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    } finally {
      removeGameModal.close();
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent, listId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentList = lists.find((l) => l.id === listId);
    if (!currentList) return;

    const oldIndex = currentList.games.findIndex((g) => g.id === active.id);
    const newIndex = currentList.games.findIndex((g) => g.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedGames = [...currentList.games];
    const [movedGame] = reorderedGames.splice(oldIndex, 1);
    reorderedGames.splice(newIndex, 0, movedGame);

    const previousLists = queryClient.getQueryData<CustomList[]>(customListKeys.mine());
    queryClient.setQueryData<CustomList[]>(customListKeys.mine(), (current = []) =>
      current.map((list) => (list.id === listId ? { ...list, games: reorderedGames } : list)),
    );

    try {
      const gameIds = reorderedGames.map((g) => g.id);
      await reorderMutation.mutateAsync({ listId, gameIds });
      showToast('Ordem da lista salva!', 'success');
    } catch {
      showToast('Erro ao salvar a ordem da lista.', 'error');
      queryClient.setQueryData(customListKeys.mine(), previousLists);
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
                      {list.list_type === 'favorites' && <Star aria-hidden="true" size={16} />}
                      {list.list_type === 'completed_year' && <Flag aria-hidden="true" size={16} />}
                      {list.list_type === 'platinized_year' && <Trophy aria-hidden="true" size={16} />}
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
                    {expandedList === list.id ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
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
                      <Trash2 aria-hidden="true" size={18} />
                    </Button>
                  )}
                </div>
              </div>

              {expandedList === list.id && (
                <div className={styles.listContent}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, list.id)}
                  >
                    <SortableContext items={list.games.map((g) => g.id)} strategy={rectSortingStrategy}>
                      <div className={styles.gameGrid}>
                        {list.games.map((game) => (
                          <SortableCustomListGame
                            key={game.id}
                            game={game}
                            listId={list.id}
                            selectedGameId={selectedGameId}
                            setSelectedGameId={setSelectedGameId}
                            removeGameModal={removeGameModal}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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

interface SortableCustomListGameProps {
  game: GameInList;
  listId: string;
  selectedGameId: string | null;
  setSelectedGameId: (id: string | null) => void;
  removeGameModal: { open: (target: { listId: string; gameId: string }) => void };
}

function SortableCustomListGame({
  game,
  listId,
  selectedGameId,
  setSelectedGameId,
  removeGameModal,
}: SortableCustomListGameProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: game.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  const isSelected = selectedGameId === game.id;

  const handleGameItemKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedGameId(isSelected ? null : game.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.gameItem} ${isSelected ? styles.gameItemSelected : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedGameId(isSelected ? null : game.id);
      }}
      onKeyDown={handleGameItemKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Desselecionar' : 'Selecionar'} jogo ${game.title}`}
    >
      <div {...attributes} {...listeners} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {getBestGameCover(game) ? (
          <img
            src={getBestGameCover(game)}
            alt={game.title}
            className={styles.cover}
            draggable={false}
          />
        ) : (
          <div className={styles.noCover}>
            {game.title.substring(0, 2).toUpperCase()}
          </div>
        )}
        <span className={styles.gameTitle}>{game.title}</span>
      </div>
      {isSelected && (
        <button
          type="button"
          className={styles.removeGame}
          onClick={(e) => {
            e.stopPropagation();
            removeGameModal.open({
              listId,
              gameId: game.id,
            });
          }}
          title="Remover da lista"
        >
          X
        </button>
      )}
    </div>
  );
}
