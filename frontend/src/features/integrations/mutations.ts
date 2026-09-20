import api from '@/services/api';

export type IntegrationAction =
  | { provider: 'steam' | 'gog'; type: 'connect'; profileUrl: string }
  | { provider: 'steam' | 'gog' | 'itch'; type: 'disconnect'; accountId: string; deleteGames: boolean }
  | { provider: 'steam' | 'gog' | 'itch'; type: 'sync-all' }
  | { provider: 'steam' | 'gog' | 'itch'; type: 'sync-one'; accountId: string }
  | { provider: 'epic'; type: 'import'; titles: string[] }
  | { provider: 'epic'; type: 'enrich' | 'delete-games' };

export interface IntegrationMutationResult {
  new_games_count?: number;
  updated_games_count?: number;
  imported_count?: number;
  skipped_count?: number;
  games_to_enrich_count?: number;
  removed_count?: number;
}

export async function runIntegrationAction(action: IntegrationAction): Promise<IntegrationMutationResult> {
  if (action.type === 'connect') {
    await api.post(`/users/me/${action.provider}/accounts`, { profile_url: action.profileUrl });
    return {};
  }
  if (action.type === 'disconnect') {
    await api.delete(
      `/users/me/${action.provider}/accounts/${action.accountId}?delete_games=${action.deleteGames}`,
    );
    return {};
  }
  if (action.type === 'sync-one') {
    return (await api.post<IntegrationMutationResult>(
      `/users/me/${action.provider}/accounts/${action.accountId}/sync`,
    )).data;
  }
  if (action.type === 'sync-all') {
    return (await api.post<IntegrationMutationResult>(`/users/me/${action.provider}/sync`)).data;
  }
  if (action.type === 'import') {
    return (await api.post<IntegrationMutationResult>('/users/me/epic/import', {
      titles: action.titles,
    })).data;
  }
  if (action.type === 'enrich') {
    return (await api.post<IntegrationMutationResult>('/users/me/epic/enrich')).data;
  }
  return (await api.delete<IntegrationMutationResult>('/users/me/epic/games')).data;
}

export const connectItchAccount = (accessToken: string) =>
  api.post('/users/me/itch/accounts', { access_token: accessToken });
