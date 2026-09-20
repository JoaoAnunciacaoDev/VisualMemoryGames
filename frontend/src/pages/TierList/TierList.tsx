import { Plus } from 'lucide-react';
import { Button, ConfirmModal, Loader } from '@/components/Shared';
import TierListCreateModal from './TierListCreateModal';
import TierListGrid from './TierListGrid';
import styles from './TierList.module.css';
import {
  TIER_LIST_STATUS_OPTIONS,
  useTierListsController,
} from './useTierListsController';

export default function TierLists() {
  const controller = useTierListsController();

  if (controller.isLoading) return <Loader message="Carregando tier lists..." />;

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Minhas Tier Lists</h2>

      <Button
        variant="primary"
        onClick={controller.openCreate}
        className={styles.createButton}
      >
        <Plus aria-hidden="true" size={18} /> Nova Tier List
      </Button>

      <TierListCreateModal
        open={controller.showCreateModal}
        isCreating={controller.isCreating}
        isSourceLoading={controller.sourceLoading}
        sourceError={controller.sourceError}
        customLists={controller.customLists}
        statusOptions={TIER_LIST_STATUS_OPTIONS}
        onClose={controller.closeCreate}
        onGameSourceChange={controller.setCreateSource}
        onCreate={controller.create}
      />

      {controller.tierLists.length === 0 ? (
        <div className={styles.emptyState}>
          Você ainda não tem tier lists. Crie uma acima!
        </div>
      ) : (
        <TierListGrid
          tierLists={controller.tierLists}
          onOpen={controller.open}
          onDelete={controller.deleteModal.open}
        />
      )}

      <ConfirmModal
        isOpen={controller.deleteModal.isOpen}
        title="Deletar Tier List"
        message="Tem certeza que deseja deletar esta Tier List inteira? Esta ação não pode ser desfeita."
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        isDestructive
        onConfirm={controller.confirmDelete}
        onCancel={controller.deleteModal.close}
      />
    </div>
  );
}
