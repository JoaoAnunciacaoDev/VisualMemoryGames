import api from '@/services/api';
import { fetchAllPages } from '@/services/pagination';
import type { GameResult } from '@/types';

interface GameRecordSummary {
  id: string;
  external_id: number | null;
  title: string;
}

export interface GameRecordInput {
  external_id: number | null;
  title: string;
  cover_url: string | null;
  release_year: number | null;
  platforms: string[];
  genres: string[];
}

const isConflictError = (error: unknown) => (
  typeof error === 'object' && error !== null
  && 'response' in error
  && (error as { response?: { status?: number } }).response?.status === 400
);

export async function ensureGameRecord(game: GameRecordInput): Promise<string> {
  try {
    const response = await api.post<{ id: string }>('/games/', game);
    return response.data.id;
  } catch (error) {
    if (!isConflictError(error)) throw error;
    const normalizedTitle = game.title.trim().toLowerCase();
    const records = await fetchAllPages<GameRecordSummary>('/games/');
    const existing = records.find((record) => (
      record.title.trim().toLowerCase() === normalizedTitle
      || (game.external_id !== null && record.external_id === game.external_id && record.title.trim().toLowerCase() === normalizedTitle)
    ));
    if (!existing) throw error;
    return existing.id;
  }
}

export async function addGameToLibrary(game: GameResult): Promise<void> {
  const gameId = await ensureGameRecord(game);
  await api.post('/user-games/', { game_id: gameId });
}

export async function addManualGameToLibrary(formData: FormData) {
  const gameResponse = await api.post<{ id: string }>('/games/manual', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  await api.post('/user-games/', { game_id: gameResponse.data.id });
  return gameResponse.data;
}
