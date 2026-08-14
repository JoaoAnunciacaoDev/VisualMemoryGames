import { useState } from 'react';
import api from '@/services/api';
import type { GameResult } from '@/types';

export function useGameSearch() {
  const [searchResults, setSearchResults] = useState<GameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  const searchGames = async (query: string) => {
    if (!query.trim() || query.trim().length < 3) return;
    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    setPage(1);
    setCurrentQuery(query.trim());
    try {
      const response = await api.get('/games/search', { params: { q: query.trim(), page: 1 } });
      const data = response.data.results || response.data;
      const items: GameResult[] = Array.isArray(data) ? data : [];
      setSearchResults(items);
      setHasMore(items.length >= 15);
    } catch (err: unknown) {
      setSearchResults([]);
      setHasMore(false);
      const backendErr = err as { response?: { data?: { detail?: string } } };
      const detail = backendErr.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Não foi possível comunicar com o serviço de busca de jogos. Tente novamente mais tarde.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const loadMore = async () => {
    if (!currentQuery || isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setIsLoadingMore(true);
    setError(null);
    try {
      const response = await api.get('/games/search', { params: { q: currentQuery, page: nextPage } });
      const data = response.data.results || response.data;
      const items: GameResult[] = Array.isArray(data) ? data : [];
      
      setSearchResults((prev) => {
        const existingIds = new Set(prev.map((g) => g.external_id));
        const newItems = items.filter((g) => !existingIds.has(g.external_id));
        return [...prev, ...newItems];
      });
      setPage(nextPage);
      setHasMore(items.length >= 15);
    } catch (err: unknown) {
      const backendErr = err as { response?: { data?: { detail?: string } } };
      const detail = backendErr.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Não foi possível carregar mais jogos. Tente novamente.'
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
    setHasSearched(false);
    setError(null);
    setPage(1);
    setHasMore(false);
    setCurrentQuery('');
  };

  const addGameToLibrary = async (game: GameResult): Promise<void> => {
    setIsAdding(true);
    try {
      // Tenta criar o jogo no catálogo
      let gameId: string;
      try {
        const gameResponse = await api.post('/games/', {
          external_id: game.external_id,
          title: game.title,
          cover_url: game.cover_url,
          release_year: game.release_year,
          platforms: game.platforms,
          genres: game.genres,
        });
        gameId = gameResponse.data.id;
      } catch (err) {
        const error = err as { response?: { status: number } };
        if (error.response?.status === 400) {
          // Já existe, procura o ID
          const gamesResponse = await api.get('/games/');
          const existing = gamesResponse.data.find(
            (g: { external_id: number; id: string }) => g.external_id === game.external_id
          );
          if (!existing) throw err;
          gameId = existing.id;
        } else {
          throw err;
        }
      }

      // Adiciona à biblioteca
      await api.post('/user-games/', { game_id: gameId });
    } finally {
      setIsAdding(false);
    }
  };

  return {
    searchResults,
    isSearching,
    isLoadingMore,
    hasSearched,
    hasMore,
    isAdding,
    error,
    searchGames,
    loadMore,
    clearResults,
    addGameToLibrary,
  };
}