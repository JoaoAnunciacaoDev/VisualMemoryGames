import { createRootRouteWithContext } from '@tanstack/react-router';
import { RootLayout } from '@/app/RootLayout';
import { RouteErrorFallback } from '@/app/RouteErrorFallback';
import type { RouterContext } from '@/app/routerContext';
import NotFound from '@/pages/NotFound/NotFound';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteErrorFallback,
  notFoundComponent: NotFound,
});
