import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import Recommendations from '@/pages/Recommendations/Recommendations';

export const Route = createFileRoute('/recommendations')({ beforeLoad: requireAuth, component: Recommendations });
