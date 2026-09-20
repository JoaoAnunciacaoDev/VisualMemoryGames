import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from '@/app/query-client';
import { QUERY_CACHE_MAX_AGE, queryPersister } from '@/app/query-persistence';
import { router } from '@/app/router';

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: QUERY_CACHE_MAX_AGE,
        buster: 'library-pages-v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => (
            query.state.status === 'success'
            && (
              (query.queryKey[0] === 'library' && query.queryKey[2] === 'pages')
              || (query.queryKey[0] === 'social' && query.queryKey[1] === 'weekly-releases')
            )
          ),
        },
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  );
}

export default App;
