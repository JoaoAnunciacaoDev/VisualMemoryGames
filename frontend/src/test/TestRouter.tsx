import type { ReactNode } from 'react';
import {
  RouterProvider,
  Outlet,
  createRoute,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { validateSocialSearch } from '@/app/search';

export function TestRouter({
  children,
  initialEntries = ['/'],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const rootRoute = createRootRoute({ component: Outlet });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => children,
  });
  const socialRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/social',
    validateSearch: validateSocialSearch,
    component: () => children,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, socialRoute]),
    history: createMemoryHistory({ initialEntries }),
  });

  return <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>;
}

export function TestQueryProvider({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
