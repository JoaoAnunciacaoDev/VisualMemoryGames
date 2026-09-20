import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import TierListEditor from '@/pages/TierListEditor/TierListEditor';

export const Route = createFileRoute('/tierlists/$id')({ beforeLoad: requireAuth, component: TierListEditor });
