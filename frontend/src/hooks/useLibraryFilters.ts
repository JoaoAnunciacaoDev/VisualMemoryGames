import { useState, useMemo, useCallback } from 'react';
import { LibraryGame } from '@/types';
import { isStoreMatch } from '@/types/enums';
import type { SortBy, YearField, HoursOperator, OriginFilter } from '@/pages/Library/Library.types';

export function useLibraryFilters(games: LibraryGame[]) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [storeFilter, setStoreFilter] = useState('Todas');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');

  const [sortBy, setSortBy] = useState<SortBy>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [yearField, setYearField] = useState<YearField | ''>('');
  const [yearValue, setYearValue] = useState<number | ''>('');

  const [hoursOperator, setHoursOperator] = useState<HoursOperator>('');
  const [hoursValue, setHoursValue] = useState<number | ''>('');
  const [hoursValueMax, setHoursValueMax] = useState<number | ''>('');

  const filtered = useMemo(() => {
    let result = games;

    // Filtro de status
    if (statusFilter !== 'Todos') {
      result = result.filter((g) => g.status === statusFilter);
    }

    // Filtro de loja
    if (storeFilter !== 'Todas') {
      result = result.filter((g) => isStoreMatch(g.store, storeFilter));
    }

    // Filtro de origem (Importado vs Manual)
    if (originFilter === 'imported') {
      result = result.filter((g) => !g.is_manual);
    } else if (originFilter === 'manual') {
      result = result.filter((g) => g.is_manual);
    }

    // Pesquisa por título (com normalização de acentos/diacríticos)
    if (search.trim()) {
      const normalize = (str: string) =>
        str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
      const query = normalize(search);
      result = result.filter((g) => normalize(g.title).includes(query));
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
    if (hoursOperator) {
      if (hoursOperator === 'between') {
        const minVal = hoursValue !== '' ? Number(hoursValue) : 0;
        const maxVal = hoursValueMax !== '' ? Number(hoursValueMax) : Infinity;
        result = result.filter((g) => {
          const played = g.hours_played ?? 0;
          return played >= minVal && played <= maxVal;
        });
      } else if (hoursValue !== '') {
        const hours = Number(hoursValue);
        result = result.filter((g) => {
          const played = g.hours_played ?? 0;
          if (hoursOperator === 'gt') return played > hours;
          if (hoursOperator === 'lt') return played < hours;
          return true;
        });
      }
    }

    // Ordenação
    result = [...result].sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === 'rating') {
        const aVal = a.rating ?? -1;
        const bVal = b.rating ?? -1;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (sortBy === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      if (sortBy === 'hours_played') {
        const aVal = a.hours_played ?? 0;
        const bVal = b.hours_played ?? 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aDate = a[sortBy] ? new Date(a[sortBy] as string).getTime() : 0;
      const bDate = b[sortBy] ? new Date(b[sortBy] as string).getTime() : 0;
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    });

    return result;
  }, [
    games,
    search,
    statusFilter,
    storeFilter,
    originFilter,
    sortBy,
    sortOrder,
    yearField,
    yearValue,
    hoursOperator,
    hoursValue,
    hoursValueMax,
  ]);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('Todos');
    setStoreFilter('Todas');
    setOriginFilter('all');
    setSortBy(null);
    setSortOrder('desc');
    setYearField('');
    setYearValue('');
    setHoursOperator('');
    setHoursValue('');
    setHoursValueMax('');
  }, []);

  return {
    filtered,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    storeFilter,
    setStoreFilter,
    originFilter,
    setOriginFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    yearField,
    setYearField,
    yearValue,
    setYearValue,
    hoursOperator,
    setHoursOperator,
    hoursValue,
    setHoursValue,
    hoursValueMax,
    setHoursValueMax,
    clearAllFilters,
  };
}