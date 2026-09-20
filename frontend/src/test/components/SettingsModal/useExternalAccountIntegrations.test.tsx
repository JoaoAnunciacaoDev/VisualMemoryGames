import type { FormEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExternalAccountIntegrations } from '@/components/SettingsModal/useExternalAccountIntegrations';
import type { IntegrationRunner } from '@/components/SettingsModal/integrationTypes';

const submitEvent = () =>
  ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

describe('useExternalAccountIntegrations', () => {
  const run = vi.fn<IntegrationRunner>();
  const setError = vi.fn();
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    run.mockResolvedValue({});
  });

  it('normaliza a URL e conecta uma conta Steam', async () => {
    const { result } = renderHook(() =>
      useExternalAccountIntegrations({ run, setError, showToast }),
    );

    act(() => result.current.setSteamUrl('  https://steamcommunity.com/id/player  '));
    await act(() => result.current.connectSteam(submitEvent()));

    expect(run).toHaveBeenCalledWith({
      provider: 'steam',
      type: 'connect',
      profileUrl: 'https://steamcommunity.com/id/player',
    });
    expect(result.current.steamUrl).toBe('');
    expect(showToast).toHaveBeenLastCalledWith(
      'Conta Steam conectada e biblioteca importada com sucesso!',
      'success',
    );
  });

  it('apresenta a contagem de jogos novos e atualizados na sincronização GOG', async () => {
    run.mockResolvedValue({ new_games_count: 2, updated_games_count: 1 });
    const { result } = renderHook(() =>
      useExternalAccountIntegrations({ run, setError, showToast }),
    );

    await act(() => result.current.sync('gog', 'account-1'));

    expect(run).toHaveBeenCalledWith({
      provider: 'gog',
      type: 'sync-one',
      accountId: 'account-1',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Sincronização GOG concluída! 2 novos jogos adicionados, 1 atualizados.',
      'success',
    );
  });

  it('repassa a escolha de remover jogos ao desconectar', async () => {
    const { result } = renderHook(() =>
      useExternalAccountIntegrations({ run, setError, showToast }),
    );

    await act(() => result.current.disconnectAccount('itch', 'account-2', true));

    expect(run).toHaveBeenCalledWith({
      provider: 'itch',
      type: 'disconnect',
      accountId: 'account-2',
      deleteGames: true,
    });
    expect(showToast).toHaveBeenCalledWith(
      'Conta Itch.io desconectada com sucesso.',
      'success',
    );
  });
});
