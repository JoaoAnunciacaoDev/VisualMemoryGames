import { Button, ConfirmModal, Input } from '@/components/Shared';
import { Plus } from 'lucide-react';
import SelectGamesModal from '@/components/SelectGamesModal/SelectGamesModal';
import type { LibraryGame } from '@/types';
import CustomListCard from './CustomListCard';
import { useCustomListsTab } from './useCustomListsTab';
import styles from './CustomListTab.module.css';

interface Props {
  libraryGames: LibraryGame[];
  onLibraryChange: () => void;
}

export default function CustomListsTab({ libraryGames, onLibraryChange }: Props) {
  const controller = useCustomListsTab(onLibraryChange);
  const selectedList = controller.lists.find((list) => list.id === controller.selectingForList);

  return (
    <div className={styles.container}>
      <div className={styles.createRow}>
        <Input
          type="text"
          placeholder="Nome da nova lista..."
          value={controller.newListName}
          onChange={(event) => controller.setNewListName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && controller.createList()}
        />
        <Button variant="primary" onClick={controller.createList}>
          <Plus aria-hidden="true" size={16} /> Criar Lista
        </Button>
      </div>

      {controller.lists.length === 0 ? (
        <div className={styles.emptyState}>Nenhuma lista criada ainda. Crie uma acima!</div>
      ) : (
        <div className={styles.lists}>
          {controller.lists.map((list) => (
            <CustomListCard
              key={list.id}
              list={list}
              expanded={controller.expandedList === list.id}
              editing={controller.editingListId === list.id}
              editingName={controller.editingListName}
              selectedGameId={controller.selectedGameId}
              sensors={controller.sensors}
              onToggle={() => controller.toggleList(list.id)}
              onEditingNameChange={controller.setEditingListName}
              onStartRenaming={() => controller.startRenaming(list)}
              onRename={() => controller.renameList(list.id)}
              onCancelRenaming={controller.cancelRenaming}
              onDelete={() => controller.deleteListModal.open(list.id)}
              onSelectGame={controller.setSelectedGameId}
              onRemoveGame={controller.removeGameModal.open}
              onAddGames={() => controller.setSelectingForList(list.id)}
              onReorder={(event) => controller.reorderGames(event, list.id)}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={controller.deleteListModal.isOpen}
        title="Deletar Lista"
        message="Tem certeza que deseja deletar esta lista? Os jogos não serão removidos da biblioteca."
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        isDestructive
        onConfirm={controller.deleteList}
        onCancel={controller.deleteListModal.close}
      />
      <ConfirmModal
        isOpen={controller.removeGameModal.isOpen}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da lista?"
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive
        onConfirm={controller.removeGame}
        onCancel={controller.removeGameModal.close}
      />
      {controller.selectingForList && (
        <SelectGamesModal
          games={libraryGames}
          alreadyInList={new Set(selectedList?.games.map((game) => game.id) ?? [])}
          onConfirm={(ids) => controller.addGames(controller.selectingForList!, ids)}
          onClose={() => controller.setSelectingForList(null)}
        />
      )}
    </div>
  );
}
