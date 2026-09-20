import { useCallback } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useMutation } from '@tanstack/react-query';
import { runTierListEditorAction } from '@/features/tierlists/mutations';
import type { SetTiers, Tier } from './types';

interface Options {
  tierListId: string;
  tiers: Tier[];
  setTiers: SetTiers;
  reload: () => Promise<void>;
}

export function useTierReorder({ tierListId, tiers, setTiers, reload }: Options) {
  const { mutateAsync } = useMutation({ mutationFn: runTierListEditorAction });

  return useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = tiers.findIndex((tier) => tier.id === active.id);
      const newIndex = tiers.findIndex((tier) => tier.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(tiers, oldIndex, newIndex);
      setTiers(reordered);
      try {
        await mutateAsync({
          type: 'reorder-categories',
          tierListId,
          categoryIds: reordered.map((tier) => tier.id),
        });
      } catch {
        await reload();
      }
    },
    [mutateAsync, reload, setTiers, tierListId, tiers],
  );
}
