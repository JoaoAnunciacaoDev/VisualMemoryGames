import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import { LIBRARY_SEARCH_DEFAULTS, validateLibrarySearch } from '@/app/search';
import Library from '@/pages/Library/Library';

export const Route = createFileRoute('/library')({
  beforeLoad: requireAuth,
  validateSearch: validateLibrarySearch,
  search: {
    middlewares: [stripSearchParams(LIBRARY_SEARCH_DEFAULTS)],
  },
  component: Library,
});
