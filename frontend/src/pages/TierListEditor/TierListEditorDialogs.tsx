import { GameSearchModal } from '@/components';
import { ConfirmModal } from '@/components/Shared';

interface Props {
  showSearchModal: boolean;
  existingGameIds: Set<string>;
  removeGameConfirm: { isOpen: boolean; target: string | null; close: () => void };
  removeTierConfirm: { isOpen: boolean; target: string | null; close: () => void };
  onAddGame: (game: { id: string; title: string; coverUrl: string | null }) => void;
  onCloseSearchModal: () => void;
  onRemoveGame: (gameId: string) => void;
  onRemoveTier: (tierId: string) => void;
}

export default function TierListEditorDialogs({
  showSearchModal,
  existingGameIds,
  removeGameConfirm,
  removeTierConfirm,
  onAddGame,
  onCloseSearchModal,
  onRemoveGame,
  onRemoveTier,
}: Props) {
  return (
    <>
      {showSearchModal && (
        <GameSearchModal
          onSelect={onAddGame}
          onClose={onCloseSearchModal}
          existingGameIds={existingGameIds}
        />
      )}

      <ConfirmModal
        isOpen={removeGameConfirm.isOpen}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da tier list?"
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (removeGameConfirm.target) onRemoveGame(removeGameConfirm.target);
          removeGameConfirm.close();
        }}
        onCancel={removeGameConfirm.close}
      />

      <ConfirmModal
        isOpen={removeTierConfirm.isOpen}
        title="Remover Tier"
        message="Tem certeza que deseja remover este tier? Os jogos nele voltarão para a área de não classificados."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (removeTierConfirm.target) onRemoveTier(removeTierConfirm.target);
          removeTierConfirm.close();
        }}
        onCancel={removeTierConfirm.close}
      />
    </>
  );
}