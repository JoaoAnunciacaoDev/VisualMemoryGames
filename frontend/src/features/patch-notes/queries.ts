import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import { fetchAllPages } from '@/services/pagination';

export interface PatchNoteAuthor {
  id: string;
  username: string;
}

export interface PatchNote {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: PatchNoteAuthor;
}

export interface PatchNoteInput {
  title: string;
  content: string;
}

export const patchNoteKeys = {
  all: ['patch-notes'] as const,
  list: (month: number, year: number) => [...patchNoteKeys.all, 'list', month, year] as const,
  unread: () => [...patchNoteKeys.all, 'unread'] as const,
};

export const patchNotesQuery = (month: number, year: number) =>
  queryOptions({
    queryKey: patchNoteKeys.list(month, year),
    queryFn: async () => {
      return fetchAllPages<PatchNote>('/patch-notes', { params: { month, year } });
    },
  });

export const unreadPatchNotesQuery = () =>
  queryOptions({
    queryKey: patchNoteKeys.unread(),
    queryFn: async () => {
      const response = await api.get<{ unread: boolean }>('/patch-notes/unread');
      return response.data.unread;
    },
  });

export async function markPatchNotesRead() {
  await api.post('/patch-notes/read');
}

export async function savePatchNote({ id, input }: { id?: string; input: PatchNoteInput }) {
  if (id) {
    await api.put(`/patch-notes/${id}`, input);
    return;
  }
  await api.post('/patch-notes', input);
}

export async function deletePatchNote(id: string) {
  await api.delete(`/patch-notes/${id}`);
}
