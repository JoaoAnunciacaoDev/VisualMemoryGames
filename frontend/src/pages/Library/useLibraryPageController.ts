import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { validateLibrarySearch } from '@/app/search';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useGameSearch } from '@/hooks/useGameSearch';
import { useLibrary } from '@/hooks/useLibrary';
import { useLibraryFilters } from '@/hooks/useLibraryFilters';
import { useToast } from '@/hooks/useToast';
import type { GameResult, LibraryGame } from '@/types';
import { getStoreLabel, STORE_OPTIONS } from '@/types/enums';
import type { GroupMode, LibraryFilterState, LibraryTab } from './Library.types';
import type { LibraryFiltersProps } from './LibraryFilters.types';
import { findMatchingLibraryGame } from './libraryGameMatching';

const STATUS_OPTIONS = [
  'Todos', 'Na biblioteca', 'Quero Jogar', 'Jogando', 'Zerado', 'Platinado', 'Abandonado', 'Em Espera',
];

export function useLibraryPageController() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { loading: authLoading, userId } = useAuth();
  const routeSearch = validateLibrarySearch(useSearch({ strict: false }) as Record<string, unknown>);
  const {
    games,
    loadLibrary,
    removeGame,
    loading: libraryLoading,
    loadingMore: libraryLoadingMore,
    error: libraryError,
  } = useLibrary(userId);
  const updateSearch = useCallback((updates: Partial<typeof routeSearch>, replace = true) => {
    void navigate({
      to: '/library',
      replace,
      resetScroll: false,
      search: (previous) => ({ ...validateLibrarySearch(previous), ...updates }),
    });
  }, [navigate]);
  const updateFilters = useCallback((updater: (filters: LibraryFilterState) => LibraryFilterState) => {
    void navigate({
      to: '/library', replace: true, resetScroll: false,
      search: (previous) => { const current = validateLibrarySearch(previous); return { ...current, ...updater(current) }; },
    });
  }, [navigate]);
  const filters = useLibraryFilters(games, routeSearch, updateFilters);
  const gameSearch = useGameSearch();
  const [selectedLibraryGame, setSelectedLibraryGame] = useState<LibraryGame | null>(null);
  const [selectedSearchGame, setSelectedSearchGame] = useState<GameResult | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const removeConfirm = useConfirmAction<GameResult>();

  const storeOptions = useMemo(() => {
    const options = ['Todas', ...STORE_OPTIONS.map((option) => option.label)];
    games.forEach((game) => {
      if (!game.store) return;
      const label = getStoreLabel(game.store);
      if (!options.includes(label)) options.push(label);
    });
    return options;
  }, [games]);

  const isGameInLibrary = useCallback((game: GameResult | null) => !!findMatchingLibraryGame(games, game), [games]);
  const toggleGroup = (group: string) => setCollapsedGroups((current) => {
    const next = new Set(current);
    if (next.has(group)) next.delete(group); else next.add(group);
    return next;
  });

  const saveLibraryGame = async () => {
    try { await loadLibrary(); setSelectedLibraryGame(null); showToast('Jogo atualizado com sucesso!', 'success'); }
    catch { showToast('Erro ao salvar alterações.', 'error'); }
  };
  const addGame = async (game: GameResult) => {
    try {
      await gameSearch.addGameToLibrary(game);
      await loadLibrary();
      showToast('Jogo adicionado à biblioteca!', 'success');
    } catch { showToast('Erro ao adicionar jogo.', 'error'); }
  };
  const confirmRemove = async () => {
    if (!removeConfirm.target) return;
    try {
      const match = findMatchingLibraryGame(games, removeConfirm.target);
      if (!match) return;
      await removeGame(match.id);
      setSelectedSearchGame(null);
      showToast('Jogo removido da biblioteca.', 'info');
    } catch { showToast('Erro ao remover jogo.', 'error'); }
    finally { removeConfirm.close(); }
  };
  const removeSelectedLibraryGame = async () => {
    if (!selectedLibraryGame) return;
    try { await removeGame(selectedLibraryGame.id); setSelectedLibraryGame(null); showToast('Jogo removido da biblioteca.', 'info'); }
    catch { showToast('Erro ao remover jogo.', 'error'); }
  };
  const clearFilters = () => updateSearch({
    search: '', statusFilter: 'Todos', storeFilter: 'Todas', originFilter: 'all', sortBy: null,
    sortOrder: 'desc', yearField: '', yearValue: '', hoursOperator: '', hoursValue: '',
    hoursValueMax: '', groupMode: 'none',
  });

  const filterProps: LibraryFiltersProps = {
    search: filters.search, onSearchChange: filters.setSearch,
    statusFilter: filters.statusFilter, onStatusFilterChange: filters.setStatusFilter,
    storeFilter: filters.storeFilter, onStoreFilterChange: filters.setStoreFilter,
    originFilter: filters.originFilter, onOriginFilterChange: filters.setOriginFilter,
    sortBy: filters.sortBy, onSortByChange: filters.setSortBy,
    sortOrder: filters.sortOrder, onSortOrderChange: filters.setSortOrder,
    yearField: filters.yearField, onYearFieldChange: filters.setYearField,
    yearValue: filters.yearValue, onYearValueChange: filters.setYearValue,
    hoursOperator: filters.hoursOperator, onHoursOperatorChange: filters.setHoursOperator,
    hoursValue: filters.hoursValue, onHoursValueChange: filters.setHoursValue,
    hoursValueMax: filters.hoursValueMax, onHoursValueMaxChange: filters.setHoursValueMax,
    groupMode: routeSearch.groupMode, onGroupModeChange: (mode: GroupMode) => updateSearch({ groupMode: mode }),
    statusOptions: STATUS_OPTIONS, storeOptions, onClearAllFilters: clearFilters,
  };

  return {
    activeTab: routeSearch.tab, setActiveTab: (tab: LibraryTab) => updateSearch({ tab }, false),
    games, filteredGames: filters.filtered, filterProps, libraryError, loadLibrary,
    loading: authLoading || (libraryLoading && games.length === 0),
    loadingMore: libraryLoadingMore,
    collapsedGroups, toggleGroup,
    selectedLibraryGame, setSelectedLibraryGame, selectedSearchGame, setSelectedSearchGame,
    showManualModal, setShowManualModal, removeConfirm,
    gameSearch, isGameInLibrary, saveLibraryGame, addGame, confirmRemove, removeSelectedLibraryGame,
    manualGameCreated: async () => { await loadLibrary(); showToast('Jogo adicionado à biblioteca!', 'success'); },
  };
}
