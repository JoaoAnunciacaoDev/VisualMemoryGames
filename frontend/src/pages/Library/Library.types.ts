export type LibraryTab = 'library' | 'lists' | 'search';

export type SortBy = 'rating' | 'started_at' | 'finished_at' | 'platinum_at' | 'acquired_at' | 'title' | 'hours_played' | null;

export type YearField = 'acquired_at' | 'started_at' | 'finished_at' | 'platinum_at';

export type HoursOperator = 'gt' | 'lt' | 'between' | '';

export type OriginFilter = 'all' | 'imported' | 'manual';

export type GroupMode = 'status' | 'store' | 'none';