export interface ProviderSectionProps<TAccount> {
  accounts: TAccount[];
  isFetching: boolean;
  onDisconnect: (accountId: string) => void;
  onSync: (accountId?: string) => void;
}
