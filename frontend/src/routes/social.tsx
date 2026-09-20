import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import { SOCIAL_SEARCH_DEFAULTS, validateSocialSearch } from '@/app/search';
import Social from '@/pages/Social/Social';

export const Route = createFileRoute('/social')({
  beforeLoad: requireAuth,
  validateSearch: validateSocialSearch,
  search: {
    middlewares: [stripSearchParams(SOCIAL_SEARCH_DEFAULTS)],
  },
  component: Social,
});
