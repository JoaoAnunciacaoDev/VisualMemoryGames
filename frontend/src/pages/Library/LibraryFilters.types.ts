import type { GroupMode, HoursOperator, OriginFilter, SortBy, YearField } from './Library.types';

export interface LibraryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  storeFilter: string;
  onStoreFilterChange: (value: string) => void;
  originFilter: OriginFilter;
  onOriginFilterChange: (value: OriginFilter) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  yearField: YearField | '';
  onYearFieldChange: (value: YearField | '') => void;
  yearValue: number | '';
  onYearValueChange: (value: number | '') => void;
  hoursOperator: HoursOperator;
  onHoursOperatorChange: (value: HoursOperator) => void;
  hoursValue: number | '';
  onHoursValueChange: (value: number | '') => void;
  hoursValueMax: number | '';
  onHoursValueMaxChange: (value: number | '') => void;
  groupMode: GroupMode;
  onGroupModeChange: (mode: GroupMode) => void;
  statusOptions: string[];
  storeOptions: string[];
  onClearAllFilters: () => void;
}
