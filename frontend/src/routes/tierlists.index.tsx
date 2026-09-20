import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import TierList from '@/pages/TierList/TierList';

export const Route = createFileRoute('/tierlists/')({ beforeLoad: requireAuth, component: TierList });
