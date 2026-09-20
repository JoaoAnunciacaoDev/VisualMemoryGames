import { useEffect, useState, type SyntheticEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePatchNote, markPatchNotesRead, patchNoteKeys, savePatchNote, type PatchNote } from '@/features/patch-notes/queries';
import { useToast } from '@/hooks/useToast';

export function usePatchNotesController() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editingPatch, setEditingPatch] = useState<PatchNote | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [deletingPatch, setDeletingPatch] = useState<PatchNote | null>(null);
  const { mutate: markRead } = useMutation({
    mutationFn: markPatchNotesRead,
    onSuccess: () => queryClient.setQueryData(patchNoteKeys.unread(), false),
  });
  const saveMutation = useMutation({ mutationFn: savePatchNote, onSuccess: () => queryClient.invalidateQueries({ queryKey: patchNoteKeys.all }) });
  const deleteMutation = useMutation({ mutationFn: deletePatchNote, onSuccess: () => queryClient.invalidateQueries({ queryKey: patchNoteKeys.all }) });

  useEffect(() => { markRead(); }, [markRead]);

  const openCreate = () => { setEditingPatch(null); setTitle(''); setContent(''); setError(''); setFormOpen(true); };
  const openEdit = (patch: PatchNote) => { setEditingPatch(patch); setTitle(patch.title); setContent(patch.content); setError(''); setFormOpen(true); };
  const closeForm = () => { if (!saveMutation.isPending) setFormOpen(false); };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return setError('Todos os campos são obrigatórios.');
    setError('');
    try {
      await saveMutation.mutateAsync({ id: editingPatch?.id, input: { title: title.trim(), content: content.trim() } });
      showToast(editingPatch ? 'Nota de atualização editada com sucesso!' : 'Nota de atualização publicada com sucesso!', 'success');
      setFormOpen(false);
    } catch (failure: unknown) {
      setError((failure as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Erro ao salvar nota de atualização.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingPatch) return;
    try {
      await deleteMutation.mutateAsync(deletingPatch.id);
      showToast('Nota de atualização excluída com sucesso.', 'success');
      setDeletingPatch(null);
    } catch { showToast('Erro ao excluir nota de atualização.', 'error'); }
  };

  return {
    editingPatch, formOpen, title, setTitle, content, setContent, error,
    deletingPatch, setDeletingPatch, submitting: saveMutation.isPending,
    openCreate, openEdit, closeForm, submit, confirmDelete,
  };
}
