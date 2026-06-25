import { useState, useMemo } from 'react';
import { LibraryGame } from '../types/game';

type SortBy = 'rating' | 'started_at' | 'finished_at' | null;

export function useLibraryFilters(games: LibraryGame[]) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState<SortBy>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => games
    .filter((g) => statusFilter === 'Todos' || g.status === statusFilter)
    .filter((g) => g.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === 'rating') {
        const aVal = a.rating ?? -1;
        const bVal = b.rating ?? -1;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aDate = a[sortBy] ? new Date(a[sortBy] as string).getTime() : 0;
      const bDate = b[sortBy] ? new Date(b[sortBy] as string).getTime() : 0;
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    }), [games, search, statusFilter, sortBy, sortOrder]);

  return {
    filtered,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  };
}