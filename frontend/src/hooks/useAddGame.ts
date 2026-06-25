import api from '@/services/api';
import { getAuthHeaders } from '@/services/auth';
import { GameResult } from '@/types/game';


export async function addGameToLibrary(game: GameResult): Promise<void> {
  const headers = getAuthHeaders();

  try {
    const gameResponse = await api.post('/games/', {
      external_id: game.external_id,
      title: game.title,
      cover_url: game.cover_url,
      release_year: game.release_year,
      platforms: game.platforms,
      genres: game.genres,
    }, { headers });

    await api.post('/user-games/', { game_id: gameResponse.data.id }, { headers });
  } catch (err: any) {
    if (err.response?.status === 400) {
      const gamesResponse = await api.get('/games/', { headers });
      const existing = gamesResponse.data.find(
        (g: any) => g.external_id === game.external_id
      );
      if (existing) {
        await api.post('/user-games/', { game_id: existing.id }, { headers });
      }
    } else {
      throw err;
    }
  }
}