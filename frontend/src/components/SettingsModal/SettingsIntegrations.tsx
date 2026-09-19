import { useState } from 'react';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import styles from './SettingsModal.module.css';
import EpicIntegrationSection from './integrations/EpicIntegrationSection';
import GogIntegrationSection from './integrations/GogIntegrationSection';
import ItchIntegrationSection from './integrations/ItchIntegrationSection';
import SteamIntegrationSection from './integrations/SteamIntegrationSection';
import { type IntegrationProvider, useSettingsIntegrations } from './useSettingsIntegrations';

interface Props {
  setError: (message: string) => void;
}

interface PendingDisconnect {
  provider: IntegrationProvider;
  accountId: string;
}

const providerLabels: Record<IntegrationProvider, string> = {
  steam: 'Steam',
  gog: 'GOG',
  itch: 'Itch.io',
};

export default function SettingsIntegrations({ setError }: Props) {
  const integration = useSettingsIntegrations({ enabled: true, setError });
  const [pendingDisconnect, setPendingDisconnect] = useState<PendingDisconnect | null>(null);
  const [showDeleteGamesConfirm, setShowDeleteGamesConfirm] = useState(false);
  const [showEpicDeleteConfirm, setShowEpicDeleteConfirm] = useState(false);

  const requestDisconnect = (provider: IntegrationProvider, accountId: string) => {
    setPendingDisconnect({ provider, accountId });
  };

  const executeDisconnect = async (deleteGames: boolean) => {
    if (!pendingDisconnect) return;
    try {
      await integration.disconnectAccount(
        pendingDisconnect.provider,
        pendingDisconnect.accountId,
        deleteGames,
      );
    } finally {
      setPendingDisconnect(null);
    }
  };

  const providerLabel = pendingDisconnect
    ? providerLabels[pendingDisconnect.provider]
    : '';

  return (
    <>
      <div className={styles.integrationsTabContent}>
        <SteamIntegrationSection
          accounts={integration.steamAccounts}
          profileUrl={integration.steamUrl}
          isFetching={integration.isFetchingSteam}
          onProfileUrlChange={integration.setSteamUrl}
          onConnect={integration.connectSteam}
          onDisconnect={(accountId) => requestDisconnect('steam', accountId)}
          onSync={(accountId) => void integration.sync('steam', accountId)}
        />
        <hr className={styles.integrationDivider} />

        <GogIntegrationSection
          accounts={integration.gogAccounts}
          profileUrl={integration.gogUrl}
          isFetching={integration.isFetchingGog}
          onProfileUrlChange={integration.setGogUrl}
          onConnect={integration.connectGog}
          onDisconnect={(accountId) => requestDisconnect('gog', accountId)}
          onSync={(accountId) => void integration.sync('gog', accountId)}
        />
        <hr className={styles.integrationDivider} />

        <ItchIntegrationSection
          accounts={integration.itchAccounts}
          isFetching={integration.isFetchingItch}
          onConnect={integration.connectItch}
          onDisconnect={(accountId) => requestDisconnect('itch', accountId)}
          onSync={(accountId) => void integration.sync('itch', accountId)}
        />
        <hr className={styles.integrationDivider} />

        <EpicIntegrationSection
          gamesCount={integration.epicGamesCount}
          isFetching={integration.isFetchingEpic}
          isImporting={integration.isImportingEpic}
          instructionsOpen={integration.isEpicInstructionsOpen}
          isCopiedScript={integration.isCopiedScript}
          pastedText={integration.epicPastedText}
          parsedTitles={integration.parsedEpicTitles}
          isDragging={integration.isEpicDragging}
          onInstructionsOpenChange={integration.setIsEpicInstructionsOpen}
          onDraggingChange={integration.setIsEpicDragging}
          onCopyScript={() => void integration.copyEpicScript()}
          onUploadFile={integration.uploadEpicFile}
          onContentChange={integration.setEpicContent}
          onImport={() => void integration.importEpic()}
          onEnrich={() => void integration.enrichEpic()}
          onRequestDelete={() => setShowEpicDeleteConfirm(true)}
        />
      </div>

      <ConfirmModal
        isOpen={pendingDisconnect !== null && !showDeleteGamesConfirm}
        title={`Desconectar Conta ${providerLabel}`}
        message={`Tem certeza que deseja desconectar esta conta ${providerLabel}? Ela não será mais sincronizada.`}
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={() => setShowDeleteGamesConfirm(true)}
        onCancel={() => setPendingDisconnect(null)}
      />
      <ConfirmModal
        isOpen={showDeleteGamesConfirm}
        title="Remover Jogos Importados?"
        message="Deseja também REMOVER todos os jogos importados desta conta da sua biblioteca? Você pode optar por manter os jogos na biblioteca ou removê-los."
        confirmText="Remover jogos"
        cancelText="Manter jogos na biblioteca"
        isDestructive
        onConfirm={() => {
          setShowDeleteGamesConfirm(false);
          void executeDisconnect(true);
        }}
        onCancel={() => {
          setShowDeleteGamesConfirm(false);
          void executeDisconnect(false);
        }}
      />
      <ConfirmModal
        isOpen={showEpicDeleteConfirm}
        title="Remover Jogos da Epic Games?"
        message="Tem certeza que deseja remover todos os jogos importados da Epic Games da sua biblioteca? Esta ação não pode ser desfeita."
        confirmText="Sim, remover jogos"
        cancelText="Cancelar"
        isDestructive
        onConfirm={() => {
          setShowEpicDeleteConfirm(false);
          void integration.deleteEpicGames();
        }}
        onCancel={() => setShowEpicDeleteConfirm(false)}
      />
    </>
  );
}
