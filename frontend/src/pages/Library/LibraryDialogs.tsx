import { GameEditModal, GameModal, ManualGameModal } from '@/components';
import { ConfirmModal } from '@/components/Shared';
import type { useLibraryPageController } from './useLibraryPageController';

type Controller = ReturnType<typeof useLibraryPageController>;

export default function LibraryDialogs({ controller }: { controller: Controller }) {
  const searchGame = controller.selectedSearchGame;
  return (
    <>
      {controller.selectedLibraryGame && (
        <GameEditModal
          game={controller.selectedLibraryGame}
          onSave={controller.saveLibraryGame}
          onRemove={controller.removeSelectedLibraryGame}
          onClose={() => { controller.setSelectedLibraryGame(null); void controller.loadLibrary(); }}
        />
      )}
      <GameModal
        game={searchGame ? {
          title: searchGame.title, coverUrl: searchGame.cover_url, releaseYear: searchGame.release_year,
          platforms: searchGame.platforms, genres: searchGame.genres,
        } : null}
        isAdded={controller.isGameInLibrary(searchGame)}
        onClose={() => controller.setSelectedSearchGame(null)}
        onAdd={() => searchGame && controller.addGame(searchGame)}
        onRemove={() => searchGame && controller.removeConfirm.open(searchGame)}
      />
      <ConfirmModal
        isOpen={controller.removeConfirm.isOpen}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da sua biblioteca? Você perderá todos os dados salvos sobre ele."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive
        onConfirm={controller.confirmRemove}
        onCancel={controller.removeConfirm.close}
      />
      {controller.showManualModal && (
        <ManualGameModal onSuccess={controller.manualGameCreated} onClose={() => controller.setShowManualModal(false)} />
      )}
    </>
  );
}
