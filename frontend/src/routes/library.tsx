import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import { validateLibrarySearch } from '@/app/search';
import Library from '@/pages/Library/Library';

export const Route = createFileRoute('/library')({
  beforeLoad: requireAuth,
  validateSearch: validateLibrarySearch,
  component: Library,
});
