import { useCallback } from 'react';
import type { ToastType } from '@/hooks/useToast';
import type { TierListEditorRunner } from './types';

interface Options {
  tierListId: string | undefined;
  mutateEditor: TierListEditorRunner;
  setTitle: (title: string) => void;
  setIsPublic: (isPublic: boolean) => void;
  showToast: (message: string, type?: ToastType) => void;
}

export function useTierListMetadataActions({
  tierListId,
  mutateEditor,
  setTitle,
  setIsPublic,
  showToast,
}: Options) {
  const saveTitle = useCallback(
    async (title: string) => {
      if (!tierListId) return;
      try {
        await mutateEditor({ type: 'update-title', tierListId, title });
        setTitle(title);
      } catch {
        showToast('Erro ao salvar título.', 'error');
      }
    },
    [mutateEditor, setTitle, showToast, tierListId],
  );

  const saveIsPublic = useCallback(
    async (isPublic: boolean) => {
      if (!tierListId) return;
      try {
        await mutateEditor({ type: 'update-privacy', tierListId, isPublic });
        setIsPublic(isPublic);
        showToast(
          isPublic ? 'Tier list agora é pública!' : 'Tier list agora é privada!',
          'success',
        );
      } catch {
        showToast('Erro ao salvar privacidade.', 'error');
      }
    },
    [mutateEditor, setIsPublic, showToast, tierListId],
  );

  return { saveTitle, saveIsPublic };
}
