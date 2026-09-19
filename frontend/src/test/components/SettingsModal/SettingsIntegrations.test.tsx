import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsIntegrations from '@/components/SettingsModal/SettingsIntegrations';

const integrationMocks = vi.hoisted(() => ({
  disconnectAccount: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/SettingsModal/useSettingsIntegrations', () => ({
  useSettingsIntegrations: () => ({
    steamAccounts: [],
    gogAccounts: [],
    itchAccounts: [],
    epicGamesCount: 0,
    steamUrl: '',
    setSteamUrl: vi.fn(),
    gogUrl: '',
    setGogUrl: vi.fn(),
    isFetchingSteam: false,
    isFetchingGog: false,
    isFetchingItch: false,
    isFetchingEpic: false,
    isImportingEpic: false,
    isEpicInstructionsOpen: false,
    setIsEpicInstructionsOpen: vi.fn(),
    isCopiedScript: false,
    epicPastedText: '',
    parsedEpicTitles: [],
    isEpicDragging: false,
    setIsEpicDragging: vi.fn(),
    connectSteam: vi.fn(),
    connectGog: vi.fn(),
    connectItch: vi.fn(),
    disconnectAccount: integrationMocks.disconnectAccount,
    sync: vi.fn(),
    copyEpicScript: vi.fn(),
    setEpicContent: vi.fn(),
    uploadEpicFile: vi.fn(),
    importEpic: vi.fn(),
    enrichEpic: vi.fn(),
    deleteEpicGames: vi.fn(),
  }),
}));

vi.mock('@/components/SettingsModal/integrations/SteamIntegrationSection', () => ({
  default: ({ onDisconnect }: { onDisconnect: (accountId: string) => void }) => (
    <button type="button" onClick={() => onDisconnect('steam-account-1')}>Desconectar Steam</button>
  ),
}));

vi.mock('@/components/SettingsModal/integrations/GogIntegrationSection', () => ({ default: () => null }));
vi.mock('@/components/SettingsModal/integrations/ItchIntegrationSection', () => ({ default: () => null }));
vi.mock('@/components/SettingsModal/integrations/EpicIntegrationSection', () => ({ default: () => null }));

describe('SettingsIntegrations', () => {
  beforeEach(() => {
    integrationMocks.disconnectAccount.mockClear();
  });

  async function openDeleteGamesConfirmation() {
    await userEvent.click(screen.getByRole('button', { name: 'Desconectar Steam' }));
    expect(screen.getByText('Desconectar Conta Steam')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(screen.getByText('Remover Jogos Importados?')).toBeInTheDocument();
  }

  it('desconecta a conta removendo os jogos importados', async () => {
    render(<SettingsIntegrations setError={vi.fn()} />);
    await openDeleteGamesConfirmation();
    await userEvent.click(screen.getByRole('button', { name: 'Remover jogos' }));

    await waitFor(() => {
      expect(integrationMocks.disconnectAccount).toHaveBeenCalledWith('steam', 'steam-account-1', true);
    });
  });

  it('desconecta a conta mantendo os jogos na biblioteca', async () => {
    render(<SettingsIntegrations setError={vi.fn()} />);
    await openDeleteGamesConfirmation();
    await userEvent.click(screen.getByRole('button', { name: 'Manter jogos na biblioteca' }));

    await waitFor(() => {
      expect(integrationMocks.disconnectAccount).toHaveBeenCalledWith('steam', 'steam-account-1', false);
    });
  });
});
