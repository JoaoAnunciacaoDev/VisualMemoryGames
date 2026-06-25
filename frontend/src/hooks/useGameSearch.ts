import { useState } from 'react';
import api from '@/services/api';
import { GameResult } from '@/types/game';

export function useGameSearch() {
  const [searchResults, setSearchResults] = useState<GameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchGames = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await api.get(`/games/search?q=${query}`);
      setSearchResults(response.data.results || response.data);
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => setSearchResults([]);

  return { searchResults, isSearching, searchGames, clearResults };
}