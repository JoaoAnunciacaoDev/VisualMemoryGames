import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import Profile from '@/pages/Profile/Profile';

export const Route = createFileRoute('/profile/')({ beforeLoad: requireAuth, component: Profile });
