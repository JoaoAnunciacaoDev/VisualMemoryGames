import { useCallback } from 'react';
import type { ToastType } from '@/hooks/useToast';
import {
  POOL_ID,
  type SetGames,
  type SetTiers,
  type TierListEditorRunner,
} from './types';

interface Options {
  tierListId: string | undefined;
  tierCount: number;
  mutateEditor: TierListEditorRunner;
  setTiers: SetTiers;
  setGames: SetGames;
  showToast: (message: string, type?: ToastType) => void;
}

export function useTierCategoryActions({
  tierListId,
  tierCount,
  mutateEditor,
  setTiers,
  setGames,
  showToast,
}: Options) {
  const addTier = useCallback(
    async (label: string, color: string) => {
      if (!tierListId) return;
      try {
        const result = await mutateEditor({
          type: 'create-category',
          tierListId,
          payload: { name: label, color, order_index: tierCount },
        });
        if (result.type !== 'category-created') return;
        const category = result.category;
        setTiers((current) => [
          ...current,
          { id: category.id, label: category.name, color: category.color },
        ]);
        setGames((current) => ({ ...current, [category.id]: [] }));
      } catch {
        showToast('Erro ao criar tier.', 'error');
      }
    },
    [mutateEditor, setGames, setTiers, showToast, tierCount, tierListId],
  );

  const removeTier = useCallback(
    async (tierId: string) => {
      if (!tierListId) return;
      try {
        await mutateEditor({ type: 'delete-category', tierListId, categoryId: tierId });
        setGames((current) => {
          const updated = { ...current };
          if (updated[tierId]) {
            updated[POOL_ID] = [
              ...(updated[POOL_ID] ?? []),
              ...updated[tierId].map((game) => ({ ...game, itemId: undefined })),
            ];
            delete updated[tierId];
          }
          return updated;
        });
        setTiers((current) => current.filter((tier) => tier.id !== tierId));
      } catch {
        showToast('Erro ao deletar tier.', 'error');
      }
    },
    [mutateEditor, setGames, setTiers, showToast, tierListId],
  );

  const updateTierLabel = useCallback(
    async (tierId: string, label: string) => {
      if (!tierListId) return;
      try {
        await mutateEditor({
          type: 'update-category',
          tierListId,
          categoryId: tierId,
          payload: { name: label },
        });
        setTiers((current) =>
          current.map((tier) => (tier.id === tierId ? { ...tier, label } : tier)),
        );
      } catch {
        showToast('Erro ao renomear tier.', 'error');
      }
    },
    [mutateEditor, setTiers, showToast, tierListId],
  );

  const updateTierColor = useCallback(
    async (tierId: string, color: string) => {
      if (!tierListId) return;
      try {
        await mutateEditor({
          type: 'update-category',
          tierListId,
          categoryId: tierId,
          payload: { color },
        });
        setTiers((current) =>
          current.map((tier) => (tier.id === tierId ? { ...tier, color } : tier)),
        );
      } catch {
        showToast('Erro ao mudar cor.', 'error');
      }
    },
    [mutateEditor, setTiers, showToast, tierListId],
  );

  return { addTier, removeTier, updateTierLabel, updateTierColor };
}
