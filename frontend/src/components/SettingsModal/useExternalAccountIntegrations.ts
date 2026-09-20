import { useState, type FormEvent } from 'react';
import { parseSettingsError } from './settingsErrors';
import type {
  IntegrationProvider,
  IntegrationRunner,
  SettingsErrorSetter,
  ToastPresenter,
} from './integrationTypes';

const providerLabels: Record<IntegrationProvider, string> = {
  steam: 'Steam',
  gog: 'GOG',
  itch: 'Itch.io',
};

interface Options {
  run: IntegrationRunner;
  setError: SettingsErrorSetter;
  showToast: ToastPresenter;
}

export function useExternalAccountIntegrations({ run, setError, showToast }: Options) {
  const [steamUrl, setSteamUrl] = useState('');
  const [gogUrl, setGogUrl] = useState('');

  const connectSteam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!steamUrl.trim()) return;
    setError('');
    showToast('Conectando à Steam e importando biblioteca...', 'info');

    try {
      await run({ provider: 'steam', type: 'connect', profileUrl: steamUrl.trim() });
      showToast('Conta Steam conectada e biblioteca importada com sucesso!', 'success');
      setSteamUrl('');
    } catch (error) {
      const message = parseSettingsError(
        error,
        'Erro ao conectar conta Steam. Verifique se o perfil e os detalhes de jogo estão públicos.',
      );
      setError(message);
      showToast(message, 'error');
    }
  };

  const connectGog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gogUrl.trim()) return;
    setError('');
    showToast('Conectando à GOG e importando biblioteca...', 'info');

    try {
      await run({ provider: 'gog', type: 'connect', profileUrl: gogUrl.trim() });
      showToast('Conta GOG conectada e biblioteca importada com sucesso!', 'success');
      setGogUrl('');
    } catch (error) {
      const message = parseSettingsError(
        error,
        'Erro ao conectar conta GOG. Verifique se o perfil e os jogos estão configurados como públicos no GOG.',
      );
      setError(message);
      showToast(message, 'error');
    }
  };

  const disconnectAccount = async (
    provider: IntegrationProvider,
    accountId: string,
    deleteGames: boolean,
  ) => {
    setError('');
    try {
      await run({ provider, type: 'disconnect', accountId, deleteGames });
      showToast(`Conta ${providerLabels[provider]} desconectada com sucesso.`, 'success');
    } catch (error) {
      setError(parseSettingsError(error, 'Erro ao desconectar conta.'));
    }
  };

  const sync = async (provider: IntegrationProvider, accountId?: string) => {
    setError('');
    try {
      const result = await run(
        accountId
          ? { provider, type: 'sync-one', accountId }
          : { provider, type: 'sync-all' },
      );
      const updatedGames =
        provider === 'gog' ? `, ${result.updated_games_count ?? 0} atualizados` : '';
      showToast(
        `Sincronização${provider === 'gog' ? ' GOG' : ''} concluída! ${result.new_games_count ?? 0} novos jogos adicionados${updatedGames}.`,
        'success',
      );
    } catch (error) {
      setError(parseSettingsError(error, 'Erro ao sincronizar conta.'));
    }
  };

  const connectItch = () => {
    const clientId = import.meta.env.VITE_ITCH_CLIENT_ID;
    if (!clientId) {
      setError('A integração com Itch.io não está configurada neste ambiente.');
      return;
    }
    const redirectUri = `${window.location.origin}/settings/integrations/itch/callback`;
    window.location.href =
      `https://itch.io/user/oauth?client_id=${clientId}` +
      `&scope=profile:me%20profile:owned%20profile:games&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  return {
    steamUrl,
    setSteamUrl,
    gogUrl,
    setGogUrl,
    connectSteam,
    connectGog,
    connectItch,
    disconnectAccount,
    sync,
  };
}
