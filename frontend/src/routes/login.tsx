import { createFileRoute } from '@tanstack/react-router';
import { redirectIfAuthenticated } from '@/app/routeGuards';
import Login from '@/pages/Login/Login';

export const Route = createFileRoute('/login')({
  beforeLoad: redirectIfAuthenticated,
  component: Login,
});
