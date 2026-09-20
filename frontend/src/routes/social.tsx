import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import { validateSocialSearch } from '@/app/search';
import Social from '@/pages/Social/Social';

export const Route = createFileRoute('/social')({
  beforeLoad: requireAuth,
  validateSearch: validateSocialSearch,
  component: Social,
});
