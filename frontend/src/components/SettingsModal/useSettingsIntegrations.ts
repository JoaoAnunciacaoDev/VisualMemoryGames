import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { runIntegrationAction } from '@/features/integrations/mutations';
import {
  gogAccountsQuery,
  integrationKeys,
  itchAccountsQuery,
  steamAccountsQuery,
} from '@/features/integrations/queries';
import { libraryKeys, myLibraryQuery } from '@/features/library/queries';
import { useToast } from '@/hooks/useToast';
import { useEpicIntegration } from './useEpicIntegration';
import { useExternalAccountIntegrations } from './useExternalAccountIntegrations';

export type { IntegrationProvider } from './integrationTypes';

interface Options {
  enabled: boolean;
  setError: (message: string) => void;
}

export function useSettingsIntegrations({ enabled, setError }: Options) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const steamQuery = useQuery({ ...steamAccountsQuery(), enabled });
  const gogQuery = useQuery({ ...gogAccountsQuery(), enabled });
  const itchQuery = useQuery({ ...itchAccountsQuery(), enabled });
  const libraryQuery = useQuery({ ...myLibraryQuery(), enabled });

  const integrationMutation = useMutation({
    mutationFn: runIntegrationAction,
    onSuccess: (_result, action) => {
      if (action.provider !== 'epic') {
        queryClient.invalidateQueries({
          queryKey: integrationKeys[action.provider](),
        });
      }
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
    },
  });

  const run = integrationMutation.mutateAsync;
  const accounts = useExternalAccountIntegrations({ run, setError, showToast });
  const epic = useEpicIntegration({ run, setError, showToast });
  const pendingProvider = integrationMutation.variables?.provider;

  return {
    steamAccounts: steamQuery.data ?? [],
    gogAccounts: gogQuery.data ?? [],
    itchAccounts: itchQuery.data ?? [],
    epicGamesCount: libraryQuery.data
      ? libraryQuery.data.filter((game) => game.store === 'EPIC').length
      : null,
    ...accounts,
    isFetchingSteam: integrationMutation.isPending && pendingProvider === 'steam',
    isFetchingGog: integrationMutation.isPending && pendingProvider === 'gog',
    isFetchingItch: integrationMutation.isPending && pendingProvider === 'itch',
    isFetchingEpic: integrationMutation.isPending && pendingProvider === 'epic',
    isImportingEpic:
      integrationMutation.isPending &&
      pendingProvider === 'epic' &&
      integrationMutation.variables?.type === 'import',
    ...epic,
  };
}
