import { createFileRoute } from '@tanstack/react-router';
import { requireAdmin } from '@/app/routeGuards';
import { validateAdminSearch } from '@/app/search';
import Admin from '@/pages/Admin/Admin';

export const Route = createFileRoute('/admin')({
  beforeLoad: requireAdmin,
  validateSearch: validateAdminSearch,
  component: Admin,
});
