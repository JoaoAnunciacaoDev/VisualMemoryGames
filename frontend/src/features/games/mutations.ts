import api from '@/services/api';

export async function addManualGameToLibrary(formData: FormData) {
  const gameResponse = await api.post<{ id: string }>('/games/manual', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  await api.post('/user-games/', { game_id: gameResponse.data.id });
  return gameResponse.data;
}
