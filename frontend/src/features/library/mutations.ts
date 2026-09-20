import api from '@/services/api';
import type { UpdateLibraryGame } from '@/types/updateGame';

export const updateLibraryGame = ({ id, data }: { id: string; data: Partial<UpdateLibraryGame> }) =>
  api.put(`/user-games/${id}`, data);

export const removeLibraryGame = (id: string) => api.delete(`/user-games/${id}`);

export interface SaveLibraryGameEditsInput {
  userGameId: string;
  manualGameId?: string;
  manualGameData?: FormData;
  coverFile?: File | null;
  data: Partial<UpdateLibraryGame>;
}

export async function saveLibraryGameEdits({
  userGameId,
  manualGameId,
  manualGameData,
  coverFile,
  data,
}: SaveLibraryGameEditsInput): Promise<Partial<UpdateLibraryGame>> {
  if (manualGameId && manualGameData) {
    await api.put(`/games/manual/${manualGameId}`, manualGameData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  let customCoverUrl = data.custom_cover_url;
  if (coverFile) {
    const coverData = new FormData();
    coverData.append('cover_file', coverFile);
    const response = await api.put<{ custom_cover_url: string }>(
      `/user-games/${userGameId}/cover`,
      coverData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    customCoverUrl = response.data.custom_cover_url;
  }

  const finalData = { ...data, custom_cover_url: customCoverUrl || null };
  await api.put(`/user-games/${userGameId}`, finalData);
  return finalData;
}
