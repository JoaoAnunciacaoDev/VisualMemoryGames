export interface CustomListGame {
  id: string;
  title: string;
  cover_url: string | null;
  external_id?: number | null;
}

export interface CustomList {
  id: string;
  name: string;
  games: CustomListGame[];
  is_system?: boolean;
  list_type?: string | null;
}

export interface TierListCategorySummaryItem {
  id: string;
}

export interface TierListCategorySummary {
  id: string;
  name: string;
  color: string;
  items: TierListCategorySummaryItem[];
}

export interface TierListSummary {
  id: string;
  title: string;
  categories: TierListCategorySummary[];
}