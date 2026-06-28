import { useState, useMemo } from 'react';
import { LibraryGame } from '@/types';

type SortBy = 'rating' | 'started_at' | 'finished_at' | null;
type YearField = 'started_at' | 'finished_at' | 'platinum_at';

export function useLibraryFilters(games: LibraryGame[]) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState<SortBy>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Novos filtros
  const [yearField, setYearField] = useState<YearField | ''>('');
  const [yearValue, setYearValue] = useState<number | ''>('');
  const [hoursOperator, setHoursOperator] = useState<'gt' | 'lt' | ''>('');
  const [hoursValue, setHoursValue] = useState<number | ''>('');

  const filtered = useMemo(() => {
    let result = games;

    // Filtro de status
    if (statusFilter !== 'Todos') {
      result = result.filter((g) => g.status === statusFilter);
    }

    // Pesquisa por título
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((g) => g.title.toLowerCase().includes(query));
    }

    // Filtro por ano
    if (yearField && yearValue !== '') {
      const year = Number(yearValue);
      result = result.filter((g) => {
        const dateStr = g[yearField];
        if (!dateStr) return false;
        const gameYear = new Date(dateStr).getFullYear();
        return gameYear === year;
      });
    }

    // Filtro por horas jogadas
    if (hoursOperator && hoursValue !== '') {
      const hours = Number(hoursValue);
      result = result.filter((g) => {
        const played = g.hours_played ?? 0;
        if (hoursOperator === 'gt') return played > hours;
        if (hoursOperator === 'lt') return played < hours;
        return true;
      });
    }

    // Ordenação
    result = [...result].sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === 'rating') {
        const aVal = a.rating ?? -1;
        const bVal = b.rating ?? -1;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aDate = a[sortBy] ? new Date(a[sortBy] as string).getTime() : 0;
      const bDate = b[sortBy] ? new Date(b[sortBy] as string).getTime() : 0;
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    });

    return result;
  }, [games, search, statusFilter, sortBy, sortOrder, yearField, yearValue, hoursOperator, hoursValue]);

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
    // novos
    yearField,
    setYearField,
    yearValue,
    setYearValue,
    hoursOperator,
    setHoursOperator,
    hoursValue,
    setHoursValue,
  };
}