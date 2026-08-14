import { useState, useMemo, useCallback } from 'react';

import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useLibrary } from '@/hooks/useLibrary';
import { useLibraryFilters } from '@/hooks/useLibraryFilters';
import { useGameSearch } from '@/hooks/useGameSearch';
import { useConfirmAction } from '@/hooks/useConfirmAction';

import {
  GameEditModal,
  CustomListsTab,
  GameModal,
  ManualGameModal
} from '@/components';
import { ConfirmModal, Button, Loader } from '@/components/Shared';

import { LibraryGame, GameResult } from '@/types';

import LibraryTabs from '@/pages/Library/LibraryTabs';
import LibraryFilters from '@/pages/Library/LibraryFilters';
import LibraryGamesView from '@/pages/Library/LibraryGamesView';
import LibrarySearchView from '@/pages/Library/LibrarySearchView';
import type { LibraryTab, GroupMode } from '@/pages/Library/Library.types';

import styles from '@/pages/Library/Library.module.css';

import { STORE_OPTIONS, getStoreLabel } from '@/types/enums';

const STATUS_OPTIONS = [
  'Todos', 'Quero Jogar', 'Jogando', 'Zerado', 'Platinado', 'Abandonado', 'Em Espera',
];

export default function Library() {
  const { loading: authLoading } = useAuth();
  const { games, loadLibrary, removeGame, loading: libraryLoading, error: libraryError } = useLibrary();
  const {
    filtered, search, setSearch,
    statusFilter, setStatusFilter,
    storeFilter, setStoreFilter,
    originFilter, setOriginFilter,
    sortBy, setSortBy, sortOrder, setSortOrder,
    yearField, setYearField, yearValue, setYearValue,
    hoursOperator, setHoursOperator, hoursValue, setHoursValue, hoursValueMax, setHoursValueMax,
    clearAllFilters,
  } = useLibraryFilters(games);
  const {
    searchResults,
    isSearching,
    isLoadingMore,
    hasMore,
    error: searchError,
    searchGames,
    loadMore,
    addGameToLibrary,
  } = useGameSearch();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<LibraryTab>('library');
  const [selectedLibraryGame, setSelectedLibraryGame] = useState<LibraryGame | null>(null);
  const [selectedSearchGame, setSelectedSearchGame] = useState<GameResult | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  const removeConfirm = useConfirmAction<GameResult>();

  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());
  const [groupMode, setGroupMode] = useState<GroupMode>('status');

  const toggleStatusCollapse = (groupName: string) => {
    setCollapsedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const storeOptions = useMemo(() => {
    const list = ['Todas', ...STORE_OPTIONS.map((o) => o.label)];
    games.forEach((g) => {
      if (g.store) {
        const label = getStoreLabel(g.store);
        if (!list.includes(label)) {
          list.push(label);
        }
      }
    });
    return list;
  }, [games]);

  const isGameInLibrary = useCallback(
    (searchGame: GameResult | null) => {
      if (!searchGame) return false;
      const cleanTitle = searchGame.title.trim().toLowerCase();
      return games.some(
        (g) =>
          g.title.trim().toLowerCase() === cleanTitle ||
          (searchGame.external_id !== null &&
            g.external_id === searchGame.external_id &&
            g.title.trim().toLowerCase() === cleanTitle)
      );
    },
    [games]
  );

  const getLibraryUserGameId = useCallback(
    (searchGame: GameResult | null) => {
      if (!searchGame) return undefined;
      const cleanTitle = searchGame.title.trim().toLowerCase();
      const match = games.find(
        (g) =>
          g.title.trim().toLowerCase() === cleanTitle ||
          (searchGame.external_id !== null &&
            g.external_id === searchGame.external_id &&
            g.title.trim().toLowerCase() === cleanTitle)
      );
      return match?.id;
    },
    [games]
  );

  const handleSaveLibraryGame = async () => {
    try {
      await loadLibrary();
      setSelectedLibraryGame(null);
      showToast('Jogo atualizado com sucesso!', 'success');
    } catch {
      showToast('Erro ao salvar alterações.', 'error');
    }
  };

  const handleAddGame = async (game: GameResult) => {
    try {
      await addGameToLibrary(game);
      await loadLibrary();
      showToast('Jogo adicionado à biblioteca!', 'success');

      // Navega para a biblioteca, descolapsa "Quero Jogar" e foca na busca
      setActiveTab('library');
      setSearch(game.title);
      setCollapsedStatuses((prev) => {
        const next = new Set(prev);
        next.delete('Quero Jogar');
        return next;
      });
    } catch {
      showToast('Erro ao adicionar jogo.', 'error');
    }
  };

  const confirmRemove = async () => {
    if (removeConfirm.target === null) return;
    try {
      const userGameId = getLibraryUserGameId(removeConfirm.target);
      if (!userGameId) return;
      await removeGame(userGameId);
      setSelectedSearchGame(null);
      showToast('Jogo removido da biblioteca.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    } finally {
      removeConfirm.close();
    }
  };

  const handleClearAll = () => {
    clearAllFilters();
    setGroupMode('none');
  };

  if (authLoading || (libraryLoading && games.length === 0)) {
    return <Loader message="Carregando biblioteca..." />;
  }

  return (
    <div className={styles.page}>
      {libraryError && (
        <div className={styles.emptyState} role="alert">
          <p>{libraryError}</p>
          <Button variant="ghost" onClick={loadLibrary}>
            Tentar novamente
          </Button>
        </div>
      )}

      <header className={styles.header}>
        <h2 className={styles.heading}>Minha Biblioteca</h2>
      </header>

      <LibraryTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'library' && (
        <>
          <LibraryFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            storeFilter={storeFilter}
            onStoreFilterChange={setStoreFilter}
            originFilter={originFilter}
            onOriginFilterChange={setOriginFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            yearField={yearField}
            onYearFieldChange={setYearField}
            yearValue={yearValue}
            onYearValueChange={setYearValue}
            hoursOperator={hoursOperator}
            onHoursOperatorChange={setHoursOperator}
            hoursValue={hoursValue}
            onHoursValueChange={setHoursValue}
            hoursValueMax={hoursValueMax}
            onHoursValueMaxChange={setHoursValueMax}
            groupMode={groupMode}
            onGroupModeChange={setGroupMode}
            statusOptions={STATUS_OPTIONS}
            storeOptions={storeOptions}
            onClearAllFilters={handleClearAll}
          />

          <LibraryGamesView
            games={games}
            filteredGames={filtered}
            groupMode={groupMode}
            collapsedStatuses={collapsedStatuses}
            onToggleStatusCollapse={toggleStatusCollapse}
            onSelectGame={setSelectedLibraryGame}
          />
        </>
      )}

      {activeTab === 'search' && (
        <LibrarySearchView
          searchGames={searchGames}
          isSearching={isSearching}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          searchResults={searchResults}
          isGameAdded={isGameInLibrary}
          error={searchError}
          onAddGame={handleAddGame}
          onRemoveGame={(game) => removeConfirm.open(game)}
          onOpenGame={setSelectedSearchGame}
          onManualAdd={() => setShowManualModal(true)}
        />
      )}

      {activeTab === 'lists' && (
        <CustomListsTab libraryGames={games} onLibraryChange={loadLibrary} />
      )}

      {selectedLibraryGame && (
        <GameEditModal
          game={selectedLibraryGame}
          onSave={handleSaveLibraryGame}
          onRemove={async () => {
            try {
              await removeGame(selectedLibraryGame.id);
              setSelectedLibraryGame(null);
              showToast('Jogo removido da biblioteca.', 'info');
            } catch {
              showToast('Erro ao remover jogo.', 'error');
            }
          }}
          onClose={() => {
            setSelectedLibraryGame(null);
            loadLibrary();
          }}
        />
      )}

      <GameModal
        game={selectedSearchGame ? {
          title: selectedSearchGame.title,
          coverUrl: selectedSearchGame.cover_url,
          releaseYear: selectedSearchGame.release_year,
          platforms: selectedSearchGame.platforms,
          genres: selectedSearchGame.genres,
        } : null}
        isAdded={isGameInLibrary(selectedSearchGame)}
        onClose={() => setSelectedSearchGame(null)}
        onAdd={() => selectedSearchGame && handleAddGame(selectedSearchGame)}
        onRemove={() => selectedSearchGame && removeConfirm.open(selectedSearchGame)}
      />

      <ConfirmModal
        isOpen={removeConfirm.isOpen}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da sua biblioteca? Você perderá todos os dados salvos sobre ele."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmRemove}
        onCancel={removeConfirm.close}
      />

      {showManualModal && (
        <ManualGameModal
          onSuccess={async () => {
            await loadLibrary();
            showToast('Jogo adicionado à biblioteca!', 'success');
          }}
          onClose={() => setShowManualModal(false)}
        />
      )}
    </div>
  );
}