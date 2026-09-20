export type TierListGameSource = 'empty' | 'all' | 'status' | 'list';

export interface TierListCreateValues {
  title: string;
  gameSource: TierListGameSource;
  selectedStatus: string;
  selectedListId: string;
  isPublic: boolean;
}
