import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

export const QUERY_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;

export const queryPersister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.sessionStorage,
  key: 'visualmemory-query-cache-v1',
  throttleTime: 500,
});
