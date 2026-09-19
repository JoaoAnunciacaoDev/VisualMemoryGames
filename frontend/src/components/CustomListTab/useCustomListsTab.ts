import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  addGamesToCustomList, createCustomList, customListKeys, customListsQuery,
  deleteCustomList, removeGameFromCustomList, renameCustomList, reorderCustomList,
  type CustomList,
} from '@/features/custom-lists/queries';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useToast } from '@/hooks/useToast';

export function useCustomListsTab(onLibraryChange: () => void) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: lists = [] } = useQuery(customListsQuery());
  const [newListName, setNewListName] = useState('');
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [selectingForList, setSelectingForList] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const deleteListModal = useConfirmAction<string>();
  const removeGameModal = useConfirmAction<{ listId: string; gameId: string }>();
  const refreshLists = () => queryClient.invalidateQueries({ queryKey: customListKeys.mine() });
  const createMutation = useMutation({ mutationFn: createCustomList, onSuccess: refreshLists });
  const deleteMutation = useMutation({ mutationFn: deleteCustomList, onSuccess: refreshLists });
  const renameMutation = useMutation({ mutationFn: renameCustomList, onSuccess: refreshLists });
  const addGamesMutation = useMutation({ mutationFn: addGamesToCustomList, onSuccess: refreshLists });
  const removeGameMutation = useMutation({ mutationFn: removeGameFromCustomList, onSuccess: refreshLists });
  const reorderMutation = useMutation({ mutationFn: reorderCustomList });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const createList = async () => {
    if (!newListName.trim()) return;
    try {
      await createMutation.mutateAsync(newListName.trim());
      setNewListName('');
      showToast('Lista criada!', 'success');
    } catch { showToast('Erro ao criar lista.', 'error'); }
  };

  const deleteList = async () => {
    const listId = deleteListModal.target;
    if (!listId) return;
    try {
      await deleteMutation.mutateAsync(listId);
      if (expandedList === listId) setExpandedList(null);
      showToast('Lista removida.', 'info');
    } catch { showToast('Erro ao remover lista.', 'error'); }
    finally { deleteListModal.close(); }
  };

  const renameList = async (listId: string) => {
    if (!editingListName.trim()) return;
    try {
      await renameMutation.mutateAsync({ id: listId, name: editingListName.trim() });
      showToast('Lista renomeada!', 'success');
    } catch { showToast('Erro ao renomear lista.', 'error'); }
    finally { setEditingListId(null); setEditingListName(''); }
  };

  const addGames = async (listId: string, gameIds: string[]) => {
    try {
      await addGamesMutation.mutateAsync({ listId, gameIds });
      setSelectingForList(null);
      showToast(`${gameIds.length} jogo(s) adicionado(s) à lista!`, 'success');
    } catch { showToast('Erro ao adicionar jogos.', 'error'); }
  };

  const removeGame = async () => {
    if (!removeGameModal.target) return;
    try {
      await removeGameMutation.mutateAsync(removeGameModal.target);
      onLibraryChange();
      showToast('Jogo removido da lista.', 'info');
    } catch { showToast('Erro ao remover jogo.', 'error'); }
    finally { removeGameModal.close(); }
  };

  const reorderGames = async (event: DragEndEvent, listId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentList = lists.find((list) => list.id === listId);
    if (!currentList) return;
    const oldIndex = currentList.games.findIndex((game) => game.id === active.id);
    const newIndex = currentList.games.findIndex((game) => game.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reorderedGames = [...currentList.games];
    const [movedGame] = reorderedGames.splice(oldIndex, 1);
    reorderedGames.splice(newIndex, 0, movedGame);
    const previousLists = queryClient.getQueryData<CustomList[]>(customListKeys.mine());
    queryClient.setQueryData<CustomList[]>(customListKeys.mine(), (current = []) => current.map((list) => list.id === listId ? { ...list, games: reorderedGames } : list));
    try {
      await reorderMutation.mutateAsync({ listId, gameIds: reorderedGames.map((game) => game.id) });
      showToast('Ordem da lista salva!', 'success');
    } catch {
      queryClient.setQueryData(customListKeys.mine(), previousLists);
      showToast('Erro ao salvar a ordem da lista.', 'error');
    }
  };

  const toggleList = (listId: string) => {
    setExpandedList((current) => current === listId ? null : listId);
    setSelectedGameId(null);
  };

  const startRenaming = (list: CustomList) => { setEditingListId(list.id); setEditingListName(list.name); };

  return {
    lists, newListName, setNewListName, expandedList, selectingForList, setSelectingForList,
    editingListId, editingListName, setEditingListName, selectedGameId, setSelectedGameId,
    deleteListModal, removeGameModal, sensors,
    createList, deleteList, renameList, addGames, removeGame, reorderGames, toggleList, startRenaming,
    cancelRenaming: () => { setEditingListId(null); setEditingListName(''); },
  };
}
