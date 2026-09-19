import {
  addTierListCategoryItem,
  createTierListCategory,
  deleteTierListCategory,
  deleteTierListCategoryItem,
  moveTierListCategoryItem,
  reorderTierListCategories,
  reorderTierListCategoryItems,
  updateTierListCategory,
  updateTierListPrivacy,
  updateTierListTitle,
} from '@/services/tierlistEditor';

export type TierListEditorAction =
  | { type: 'update-title'; tierListId: string; title: string }
  | { type: 'update-privacy'; tierListId: string; isPublic: boolean }
  | {
      type: 'create-category';
      tierListId: string;
      payload: { name: string; color: string; order_index: number };
    }
  | { type: 'delete-category'; tierListId: string; categoryId: string }
  | {
      type: 'update-category';
      tierListId: string;
      categoryId: string;
      payload: { name?: string; color?: string };
    }
  | { type: 'add-item'; tierListId: string; categoryId: string; gameId: string }
  | { type: 'delete-item'; tierListId: string; categoryId: string; itemId: string }
  | {
      type: 'move-item';
      tierListId: string;
      fromCategoryId: string;
      itemId: string;
      targetCategoryId: string;
    }
  | { type: 'reorder-items'; tierListId: string; categoryId: string; itemIds: string[] }
  | { type: 'reorder-categories'; tierListId: string; categoryIds: string[] };

export type TierListEditorActionResult =
  | { type: 'completed' }
  | { type: 'category-created'; category: { id: string; name: string; color: string } }
  | { type: 'item-created'; item: { id: string } };

export async function runTierListEditorAction(
  action: TierListEditorAction,
): Promise<TierListEditorActionResult> {
  switch (action.type) {
    case 'update-title':
      await updateTierListTitle(action.tierListId, action.title);
      break;
    case 'update-privacy':
      await updateTierListPrivacy(action.tierListId, action.isPublic);
      break;
    case 'create-category':
      return {
        type: 'category-created',
        category: await createTierListCategory(action.tierListId, action.payload),
      };
    case 'delete-category':
      await deleteTierListCategory(action.categoryId);
      break;
    case 'update-category':
      await updateTierListCategory(action.categoryId, action.payload);
      break;
    case 'add-item':
      return {
        type: 'item-created',
        item: await addTierListCategoryItem(action.categoryId, action.gameId),
      };
    case 'delete-item':
      await deleteTierListCategoryItem(action.categoryId, action.itemId);
      break;
    case 'move-item':
      await moveTierListCategoryItem(
        action.fromCategoryId,
        action.itemId,
        action.targetCategoryId,
      );
      break;
    case 'reorder-items':
      await reorderTierListCategoryItems(action.categoryId, action.itemIds);
      break;
    case 'reorder-categories':
      await reorderTierListCategories(action.tierListId, action.categoryIds);
      break;
  }

  return { type: 'completed' };
}
