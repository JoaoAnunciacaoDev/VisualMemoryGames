import { z } from 'zod';
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

const positiveIntegerSchema = (fallback: number) =>
  z.unknown().optional().transform((value) => positiveInteger(value, fallback));

const stringSchema = z.unknown().optional().transform((value) => typeof value === 'string' ? value : '');

const socialSearchSchema = z.object({
  tab: z.unknown().optional().transform((value) => oneOf(value, ['feed', 'my-activities', 'search'] as const, 'feed')),
  month: positiveIntegerSchema(now.getMonth() + 1).transform((value) => Math.min(12, value)),
  year: positiveIntegerSchema(now.getFullYear()),
  feedPage: positiveIntegerSchema(1),
  myPage: positiveIntegerSchema(1),
  q: stringSchema,
});

export type SocialSearch = z.infer<typeof socialSearchSchema>;
export type SocialTab = SocialSearch['tab'];

export const validateSocialSearch = (search: Record<string, unknown>): SocialSearch =>
  socialSearchSchema.parse(search);

const adminSearchSchema = z.object({ q: stringSchema });

export type AdminSearch = z.infer<typeof adminSearchSchema>;

export const validateAdminSearch = (search: Record<string, unknown>): AdminSearch =>
  adminSearchSchema.parse(search);

const patchNotesSearchSchema = z.object({
  month: positiveIntegerSchema(now.getMonth() + 1).transform((value) => Math.min(12, value)),
  year: positiveIntegerSchema(now.getFullYear()),
});

export type PatchNotesSearch = z.infer<typeof patchNotesSearchSchema>;

export const validatePatchNotesSearch = (search: Record<string, unknown>): PatchNotesSearch =>
  patchNotesSearchSchema.parse(search);

const libraryTabs: LibraryTab[] = ['library', 'lists', 'search'];
const origins: OriginFilter[] = ['all', 'imported', 'manual'];
const sortFields: Exclude<SortBy, null>[] = [
  'rating', 'started_at', 'finished_at', 'platinum_at', 'acquired_at', 'title', 'hours_played',
];
const yearFields: YearField[] = ['acquired_at', 'started_at', 'finished_at', 'platinum_at'];
const hoursOperators: Exclude<HoursOperator, ''>[] = ['gt', 'lt', 'between'];
const groupModes: GroupMode[] = ['status', 'store', 'none'];

const librarySearchSchema = z.object({
  tab: z.unknown().optional().transform((value): LibraryTab => oneOf(value, libraryTabs, 'library')),
  search: stringSchema,
  statusFilter: z.unknown().optional().transform((value) => typeof value === 'string' ? value : 'Todos'),
  storeFilter: z.unknown().optional().transform((value) => typeof value === 'string' ? value : 'Todas'),
  originFilter: z.unknown().optional().transform((value): OriginFilter => oneOf(value, origins, 'all')),
  sortBy: z.unknown().optional().transform((value): SortBy => (
    value === null || value === '' || value === undefined ? null : oneOf(value, sortFields, 'title')
  )),
  sortOrder: z.unknown().optional().transform((value): 'asc' | 'desc' => value === 'asc' ? 'asc' : 'desc'),
  yearField: z.unknown().optional().transform((value): YearField | '' => (
    value === '' || value === undefined ? '' : oneOf(value, yearFields, 'acquired_at')
  )),
  yearValue: z.unknown().optional().transform(optionalNumber),
  hoursOperator: z.unknown().optional().transform((value): HoursOperator => (
    value === '' || value === undefined ? '' : oneOf(value, hoursOperators, 'gt')
  )),
  hoursValue: z.unknown().optional().transform(optionalNumber),
  hoursValueMax: z.unknown().optional().transform(optionalNumber),
  groupMode: z.unknown().optional().transform((value): GroupMode => oneOf(value, groupModes, 'status')),
});

export const validateLibrarySearch = (search: Record<string, unknown>): LibrarySearch =>
  librarySearchSchema.parse(search);
