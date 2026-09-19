import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { queryClient } from '@/app/query-client';
import { currentUserQuery } from '@/features/auth/queries';
import { RootLayout } from '@/app/RootLayout';
import {
  Admin,
  Home,
  ItchCallback,
  Library,
  Login,
  NotFound,
  PatchNotes,
  Profile,
  Recommendations,
  Social,
  TierList,
  TierListEditor,
} from '@/app/RouteComponents';

interface RouterContext {
  queryClient: QueryClient;
}

const requireAuth = async ({ context }: { context: RouterContext }) => {
  try {
    return await context.queryClient.ensureQueryData(currentUserQuery());
  } catch {
    throw redirect({ to: '/login' });
  }
};

const requireAdmin = async ({ context }: { context: RouterContext }) => {
  const user = await requireAuth({ context });
  if (!user.is_admin) throw redirect({ to: '/library' });
  return user;
};

const redirectIfAuthenticated = async ({ context }: { context: RouterContext }) => {
  let authenticated = false;
  try {
    await context.queryClient.ensureQueryData(currentUserQuery());
    authenticated = true;
  } catch {
    // Guests may access the login route.
  }
  if (authenticated) throw redirect({ to: '/library' });
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

const routes = [
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    beforeLoad: redirectIfAuthenticated,
    component: Login,
  }),
  createRoute({ getParentRoute: () => rootRoute, path: '/library', beforeLoad: requireAuth, component: Library }),
  createRoute({ getParentRoute: () => rootRoute, path: '/tierlists', beforeLoad: requireAuth, component: TierList }),
  createRoute({ getParentRoute: () => rootRoute, path: '/tierlists/$id', beforeLoad: requireAuth, component: TierListEditor }),
  createRoute({ getParentRoute: () => rootRoute, path: '/recommendations', beforeLoad: requireAuth, component: Recommendations }),
  createRoute({ getParentRoute: () => rootRoute, path: '/social', beforeLoad: requireAuth, component: Social }),
  createRoute({ getParentRoute: () => rootRoute, path: '/profile', beforeLoad: requireAuth, component: Profile }),
  createRoute({ getParentRoute: () => rootRoute, path: '/profile/$userId', component: Profile }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/settings/integrations/itch/callback',
    beforeLoad: requireAuth,
    component: ItchCallback,
  }),
  createRoute({ getParentRoute: () => rootRoute, path: '/admin', beforeLoad: requireAdmin, component: Admin }),
  createRoute({ getParentRoute: () => rootRoute, path: '/patch-notes', beforeLoad: requireAuth, component: PatchNotes }),
];

const routeTree = rootRoute.addChildren(routes);

export const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

declare module '@tanstack/history' {
  interface HistoryState {
    initialPool?: Array<{ id: string; title: string; coverUrl: string | null }>;
  }
}
