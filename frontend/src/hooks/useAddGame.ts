import api from '@/services/api';
import { GameResult } from '@/types/game';
import { ensureGameRecord } from '@/services/gameCatalog';


export async function addGameToLibrary(game: GameResult): Promise<void> {
  const gameId = await ensureGameRecord(game);
  await api.post('/user-games/', { game_id: gameId });
}