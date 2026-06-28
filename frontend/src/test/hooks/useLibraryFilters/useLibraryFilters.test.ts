import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLibraryFilters } from '@/hooks/useLibraryFilters';
import type { LibraryGame } from '@/types';

const mockGames: LibraryGame[] = [
  {
    id: '1', game_id: 'g1', external_id: 101, title: 'Zelda Breath of the Wild',
    cover_url: null, custom_cover_url: null, status: 'Zerado', rating: 10,
    favorite: true, hours_played: 120, store: null, acquired_at: null,
    started_at: '2023-01-15', finished_at: '2023-06-20', platinum_at: null,
    notes: null, release_year: 2017, is_manual: false, platforms: [], genres: [],
  },
  {
    id: '2', game_id: 'g2', external_id: 102, title: 'Hollow Knight',
    cover_url: null, custom_cover_url: null, status: 'Platinado', rating: 9.5,
    favorite: false, hours_played: 80, store: null, acquired_at: null,
    started_at: '2024-02-01', finished_at: '2024-05-10', platinum_at: '2024-05-15',
    notes: null, release_year: 2018, is_manual: false, platforms: [], genres: [],
  },
  {
    id: '3', game_id: 'g3', external_id: 103, title: 'Elden Ring',
    cover_url: null, custom_cover_url: null, status: 'Jogando', rating: null,
    favorite: false, hours_played: 50, store: null, acquired_at: null,
    started_at: '2024-06-01', finished_at: null, platinum_at: null,
    notes: null, release_year: 2022, is_manual: false, platforms: [], genres: [],
  },
  {
    id: '4', game_id: 'g4', external_id: 104, title: 'Super Mario Odyssey',
    cover_url: null, custom_cover_url: null, status: 'Quero Jogar', rating: null,
    favorite: false, hours_played: 0, store: null, acquired_at: null,
    started_at: null, finished_at: null, platinum_at: null,
    notes: null, release_year: 2017, is_manual: false, platforms: [], genres: [],
  },
  {
    id: '5', game_id: 'g5', external_id: 105, title: 'Celeste',
    cover_url: null, custom_cover_url: null, status: 'Zerado', rating: 9,
    favorite: true, hours_played: 15, store: null, acquired_at: null,
    started_at: '2024-08-01', finished_at: '2024-08-10', platinum_at: null,
    notes: null, release_year: 2018, is_manual: false, platforms: [], genres: [],
  },
];

describe('useLibraryFilters', () => {
  it('deve retornar todos os jogos por padrão', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    expect(result.current.filtered).toHaveLength(5);
  });

  it('deve filtrar por status', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setStatusFilter('Zerado'));
    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every(g => g.status === 'Zerado')).toBe(true);
  });

  it('deve retornar todos quando statusFilter é "Todos"', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setStatusFilter('Todos'));
    expect(result.current.filtered).toHaveLength(5);
  });

  it('deve pesquisar por título (case insensitive)', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setSearch('zelda'));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].title).toBe('Zelda Breath of the Wild');
  });

  it('deve ordenar por rating desc (padrão)', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setSortBy('rating'));
    const ratings = result.current.filtered.map(g => g.rating ?? -1);
    expect(ratings).toEqual([10, 9.5, 9, -1, -1]);
  });

  it('deve ordenar por rating asc', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setSortBy('rating'));
    act(() => result.current.setSortOrder('asc'));
    const ratings = result.current.filtered.map(g => g.rating ?? -1);
    expect(ratings).toEqual([-1, -1, 9, 9.5, 10]);
  });

  it('deve ordenar por started_at desc', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setSortBy('started_at'));
    const dates = result.current.filtered.map(g => g.started_at);
    expect(dates[0]).toBe('2024-08-01');
    expect(dates[4]).toBeNull();
  });

  it('deve filtrar por ano de conclusão (finished_at)', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setYearField('finished_at'));
    act(() => result.current.setYearValue(2024));
    expect(result.current.filtered).toHaveLength(2);
  });

  it('deve filtrar por horas jogadas > 50', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setHoursOperator('gt'));
    act(() => result.current.setHoursValue(50));
    expect(result.current.filtered).toHaveLength(2);
  });

  it('deve filtrar por horas jogadas < 50', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setHoursOperator('lt'));
    act(() => result.current.setHoursValue(50));
    expect(result.current.filtered).toHaveLength(2);
  });

  it('deve combinar filtros: status + ano', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setStatusFilter('Zerado'));
    act(() => result.current.setYearField('finished_at'));
    act(() => result.current.setYearValue(2024));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].title).toBe('Celeste');
  });

  it('deve limpar filtro de ano quando o campo é desmarcado', () => {
    const { result } = renderHook(() => useLibraryFilters(mockGames));
    act(() => result.current.setYearField('finished_at'));
    act(() => result.current.setYearValue(2024));
    act(() => result.current.setYearField(''));
    expect(result.current.filtered).toHaveLength(5);
  });
});