import { useState, useCallback, useEffect } from 'react';
import api from '@/services/api';
import { LibraryGame } from '@/types';
import { UpdateLibraryGame } from '@/types/updateGame';


export function useLibrary(userId?: string) {
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/user-games/me');
      setGames(response.data);
    } catch {
      setError('Erro ao carregar biblioteca.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    window.addEventListener('steam-synced', loadLibrary);
    return () => {
      window.removeEventListener('steam-synced', loadLibrary);
    };
  }, [loadLibrary]);

  const updateGame = async (
      id: string,
      data: Partial<UpdateLibraryGame>
  ) => {
    await api.put(`/user-games/${id}`, data);
    await loadLibrary();
  };

  const removeGame = async (id: string) => {
    await api.delete(`/user-games/${id}`);
    await loadLibrary();
  };

  return { games, loading, error, loadLibrary, updateGame, removeGame };
}