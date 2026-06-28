import api from '@/services/api';
interface GameRecordSummary {
  id: string;
  external_id: number;
}

export interface GameRecordInput {
  external_id: number;
  title: string;
  cover_url: string | null;
  release_year: number | null;
  platforms: string[];
  genres: string[];
}

function isApiConflictError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'response' in error &&
    typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
    (error as { response?: { status?: number } }).response?.status === 400;
}

export async function ensureGameRecord(game: GameRecordInput): Promise<string> {
  try {
    const response = await api.post('/games/', {
      external_id: game.external_id,
      title: game.title,
      cover_url: game.cover_url,
      release_year: game.release_year,
      platforms: game.platforms,
      genres: game.genres,
    });

    return response.data.id as string;
  } catch (error: unknown) {
    if (!isApiConflictError(error)) {
      throw error;
    }

    const gamesResponse = await api.get<GameRecordSummary[]>('/games/');
    const existing = gamesResponse.data.find(
      (record) => record.external_id === game.external_id
    );

    if (!existing) {
      throw error;
    }

    return existing.id;
  }
}