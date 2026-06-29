import { useState } from 'react';
import api from '@/services/api';
import type { GameResult } from '@/types';

export function useGameSearch() {
  const [searchResults, setSearchResults] = useState<GameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const searchGames = async (query: string) => {
    if (!query.trim() || query.trim().length < 3) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await api.get(`/games/search?q=${query}`);
      const data = response.data.results || response.data;
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
    setHasSearched(false);
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

  return { searchResults, isSearching, hasSearched, isAdding, searchGames, clearResults, addGameToLibrary };
}