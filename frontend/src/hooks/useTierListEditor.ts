import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { runTierListEditorAction } from '@/features/tierlists/mutations';
import { tierListKeys } from '@/features/tierlists/queries';
import { useToast } from '@/hooks/useToast';
import type { TierListEditorData } from '@/services/tierlistEditor';
import { useTierCategoryActions } from './tierListEditor/useTierCategoryActions';
import { useTierGameActions } from './tierListEditor/useTierGameActions';
import { useTierListEditorState } from './tierListEditor/useTierListEditorState';
import { useTierListMetadataActions } from './tierListEditor/useTierListMetadataActions';

export { POOL_ID } from './tierListEditor/types';
export type { GameItem, Tier } from './tierListEditor/types';

interface UseTierListEditorOptions {
  onReload?: () => Promise<void> | void;
}

export function useTierListEditor(
  tierListId: string | undefined,
  initialData: TierListEditorData | null,
  options?: UseTierListEditorOptions,
) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const editor = useTierListEditorState(initialData);
  const onReload = options?.onReload;
  const reload = useCallback(async () => {
    await onReload?.();
  }, [onReload]);

  const { mutateAsync } = useMutation({
    mutationFn: runTierListEditorAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tierListKeys.mine() }),
  });
  const mutateEditor = useCallback(
    (action: Parameters<typeof runTierListEditorAction>[0]) => mutateAsync(action),
    [mutateAsync],
  );

  const metadataActions = useTierListMetadataActions({
    tierListId,
    mutateEditor,
    setTitle: editor.setTitle,
    setIsPublic: editor.setIsPublic,
    showToast,
  });
  const categoryActions = useTierCategoryActions({
    tierListId,
    tierCount: editor.tiers.length,
    mutateEditor,
    setTiers: editor.setTiers,
    setGames: editor.setGames,
    showToast,
  });
  const gameActions = useTierGameActions({
    tierListId,
    poolCategoryId: editor.poolCategoryId,
    games: editor.games,
    mutateEditor,
    setGames: editor.setGames,
    reload,
    showToast,
  });

  return {
    ...editor,
    ownerId: initialData?.ownerId ?? '',
    ownerUsername: initialData?.ownerUsername ?? '',
    existingGameIds: new Set(
      Object.values(editor.games)
        .flat()
        .map((game) => game.id),
    ),
    reload,
    ...metadataActions,
    ...categoryActions,
    ...gameActions,
  };
}
