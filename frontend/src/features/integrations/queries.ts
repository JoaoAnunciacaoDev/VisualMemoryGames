import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';

export interface SteamAccount {
  id: string;
  steam_id: string;
  persona_name: string | null;
  avatar_url: string | null;
  last_sync_at: string | null;
}

export interface GogAccount {
  id: string;
  username: string;
  persona_name: string | null;
  avatar_url: string | null;
  last_sync_at: string | null;
}

export interface ItchAccount {
  id: string;
  itch_id: string;
  username: string;
  avatar_url: string | null;
  last_sync_at: string | null;
}

export const integrationKeys = {
  all: ['integrations'] as const,
  steam: () => [...integrationKeys.all, 'steam'] as const,
  gog: () => [...integrationKeys.all, 'gog'] as const,
  itch: () => [...integrationKeys.all, 'itch'] as const,
};

export const steamAccountsQuery = () => queryOptions({
  queryKey: integrationKeys.steam(),
  queryFn: async () => (await api.get<SteamAccount[]>('/users/me/steam/accounts')).data,
});

export const gogAccountsQuery = () => queryOptions({
  queryKey: integrationKeys.gog(),
  queryFn: async () => (await api.get<GogAccount[]>('/users/me/gog/accounts')).data,
});

export const itchAccountsQuery = () => queryOptions({
  queryKey: integrationKeys.itch(),
  queryFn: async () => (await api.get<ItchAccount[]>('/users/me/itch/accounts')).data,
});
