import type {
  GroupMode,
  HoursOperator,
  LibrarySearch,
  LibraryTab,
  OriginFilter,
  SortBy,
  YearField,
} from '@/pages/Library/Library.types';

const now = new Date();

const positiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const oneOf = <T extends string>(value: unknown, values: readonly T[], fallback: T): T =>
  typeof value === 'string' && values.includes(value as T) ? value as T : fallback;

const optionalNumber = (value: unknown): number | '' => {
  if (value === '' || value === undefined || value === null) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : '';
};

export type SocialTab = 'feed' | 'my-activities' | 'search';

export interface SocialSearch {
  tab: SocialTab;
  month: number;
  year: number;
  feedPage: number;
  myPage: number;
  q: string;
}

export const validateSocialSearch = (search: Record<string, unknown>): SocialSearch => ({
  tab: search.tab === 'my-activities' || search.tab === 'search' ? search.tab : 'feed',
  month: Math.min(12, positiveInteger(search.month, now.getMonth() + 1)),
  year: positiveInteger(search.year, now.getFullYear()),
  feedPage: positiveInteger(search.feedPage, 1),
  myPage: positiveInteger(search.myPage, 1),
  q: typeof search.q === 'string' ? search.q : '',
});

export interface AdminSearch {
  q: string;
}

export const validateAdminSearch = (search: Record<string, unknown>): AdminSearch => ({
  q: typeof search.q === 'string' ? search.q : '',
});

export interface PatchNotesSearch {
  month: number;
  year: number;
}

export const validatePatchNotesSearch = (search: Record<string, unknown>): PatchNotesSearch => ({
  month: Math.min(12, positiveInteger(search.month, now.getMonth() + 1)),
  year: positiveInteger(search.year, now.getFullYear()),
});

const libraryTabs: LibraryTab[] = ['library', 'lists', 'search'];
const origins: OriginFilter[] = ['all', 'imported', 'manual'];
const sortFields: Exclude<SortBy, null>[] = [
  'rating', 'started_at', 'finished_at', 'platinum_at', 'acquired_at', 'title', 'hours_played',
];
const yearFields: YearField[] = ['acquired_at', 'started_at', 'finished_at', 'platinum_at'];
const hoursOperators: Exclude<HoursOperator, ''>[] = ['gt', 'lt', 'between'];
const groupModes: GroupMode[] = ['status', 'store', 'none'];

export const validateLibrarySearch = (search: Record<string, unknown>): LibrarySearch => ({
  tab: oneOf(search.tab, libraryTabs, 'library'),
  search: typeof search.search === 'string' ? search.search : '',
  statusFilter: typeof search.statusFilter === 'string' ? search.statusFilter : 'Todos',
  storeFilter: typeof search.storeFilter === 'string' ? search.storeFilter : 'Todas',
  originFilter: oneOf(search.originFilter, origins, 'all'),
  sortBy: search.sortBy === null || search.sortBy === '' || search.sortBy === undefined
    ? null
    : oneOf(search.sortBy, sortFields, 'title'),
  sortOrder: search.sortOrder === 'asc' ? 'asc' : 'desc',
  yearField: search.yearField === '' || search.yearField === undefined
    ? ''
    : oneOf(search.yearField, yearFields, 'acquired_at'),
  yearValue: optionalNumber(search.yearValue),
  hoursOperator: search.hoursOperator === '' || search.hoursOperator === undefined
    ? ''
    : oneOf(search.hoursOperator, hoursOperators, 'gt'),
  hoursValue: optionalNumber(search.hoursValue),
  hoursValueMax: optionalNumber(search.hoursValueMax),
  groupMode: oneOf(search.groupMode, groupModes, 'status'),
});
