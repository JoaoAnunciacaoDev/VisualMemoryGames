import { createRouter } from '@tanstack/react-router';
import { queryClient } from '@/app/query-client';
import { routeTree } from '@/routeTree.gen';

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
