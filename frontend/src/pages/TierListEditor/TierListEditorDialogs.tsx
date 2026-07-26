import { GameSearchModal } from '@/components';
import { ConfirmModal } from '@/components/Shared';

interface Props {
  showSearchModal: boolean;
  existingGameIds: Set<string>;
  removeGameConfirm: { isOpen: boolean; target: string | null; close: () => void };
  removeTierConfirm: { isOpen: boolean; target: string | null; close: () => void };
  privacyConfirm: { isOpen: boolean; target: boolean | null; close: () => void };
  onAddGame: (game: { id: string; title: string; coverUrl: string | null }) => void;
  onCloseSearchModal: () => void;
  onRemoveGame: (gameId: string) => void;
  onRemoveTier: (tierId: string) => void;
  onTogglePrivacy: (newIsPublic: boolean) => void;
}

export default function TierListEditorDialogs({
  showSearchModal,
  existingGameIds,
  removeGameConfirm,
  removeTierConfirm,
  privacyConfirm,
  onAddGame,
  onCloseSearchModal,
  onRemoveGame,
  onRemoveTier,
  onTogglePrivacy,
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

      <ConfirmModal
        isOpen={privacyConfirm.isOpen}
        title="Alterar Privacidade"
        message={
          privacyConfirm.target
            ? "Tem certeza que deseja tornar esta Tier List pública? Ela ficará visível para outros usuários."
            : "Tem certeza que deseja tornar esta Tier List privada? Apenas você poderá visualizá-la."
        }
        confirmText="Sim, alterar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (privacyConfirm.target !== null) onTogglePrivacy(privacyConfirm.target);
          privacyConfirm.close();
        }}
        onCancel={privacyConfirm.close}
      />
    </>
  );
}