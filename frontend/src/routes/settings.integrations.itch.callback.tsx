import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import ItchCallback from '@/pages/ItchCallback/ItchCallback';

export const Route = createFileRoute('/settings/integrations/itch/callback')({
  beforeLoad: requireAuth,
  component: ItchCallback,
});
