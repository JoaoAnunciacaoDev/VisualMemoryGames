export type LibraryTab = 'library' | 'lists' | 'search';

export type SortBy = 'rating' | 'started_at' | 'finished_at' | 'platinum_at' | 'acquired_at' | 'title' | 'hours_played' | null;

export type YearField = 'acquired_at' | 'started_at' | 'finished_at' | 'platinum_at';

export type HoursOperator = 'gt' | 'lt' | 'between' | '';

export type OriginFilter = 'all' | 'imported' | 'manual';

export type GroupMode = 'status' | 'store' | 'none';

export interface LibraryFilterState {
  search: string;
  statusFilter: string;
  storeFilter: string;
  originFilter: OriginFilter;
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
  yearField: YearField | '';
  yearValue: number | '';
  hoursOperator: HoursOperator;
  hoursValue: number | '';
  hoursValueMax: number | '';
}

export interface LibrarySearch extends LibraryFilterState {
  tab: LibraryTab;
  groupMode: GroupMode;
}
