import { CustomListsTab } from '@/components';
import LibraryFilters from './LibraryFilters';
import LibraryGamesView from './LibraryGamesView';
import LibrarySearchView from './LibrarySearchView';
import type { useLibraryPageController } from './useLibraryPageController';

type Controller = ReturnType<typeof useLibraryPageController>;

export default function LibraryTabContent({ controller }: { controller: Controller }) {
  if (controller.activeTab === 'library') {
    return (
      <>
        <LibraryFilters {...controller.filterProps} />
        <LibraryGamesView
          games={controller.games}
          filteredGames={controller.filteredGames}
          groupMode={controller.filterProps.groupMode}
          collapsedStatuses={controller.collapsedGroups}
          onToggleStatusCollapse={controller.toggleGroup}
          onSelectGame={controller.setSelectedLibraryGame}
        />
      </>
    );
  }
  if (controller.activeTab === 'search') {
    return (
      <LibrarySearchView
        searchGames={controller.gameSearch.searchGames}
        isSearching={controller.gameSearch.isSearching}
        hasMore={controller.gameSearch.hasMore}
        isLoadingMore={controller.gameSearch.isLoadingMore}
        onLoadMore={controller.gameSearch.loadMore}
        searchResults={controller.gameSearch.searchResults}
        isGameAdded={controller.isGameInLibrary}
        error={controller.gameSearch.error}
        onAddGame={controller.addGame}
        onRemoveGame={controller.removeConfirm.open}
        onOpenGame={controller.setSelectedSearchGame}
        onManualAdd={() => controller.setShowManualModal(true)}
      />
    );
  }
  return <CustomListsTab libraryGames={controller.games} onLibraryChange={controller.loadLibrary} />;
}
