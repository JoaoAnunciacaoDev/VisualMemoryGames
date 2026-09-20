import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { requireAdmin } from '@/app/routeGuards';
import { ADMIN_SEARCH_DEFAULTS, validateAdminSearch } from '@/app/search';
import Admin from '@/pages/Admin/Admin';

export const Route = createFileRoute('/admin')({
  beforeLoad: requireAdmin,
  validateSearch: validateAdminSearch,
  search: {
    middlewares: [stripSearchParams(ADMIN_SEARCH_DEFAULTS)],
  },
  component: Admin,
});
