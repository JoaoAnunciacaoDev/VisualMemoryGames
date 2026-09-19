import { useState, SyntheticEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/utils/date';
import styles from './SettingsModal.module.css';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  FolderOpen,
  Gamepad2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  changeAccountPassword,
  deactivateAccount,
  updateAccountProfile,
} from '@/features/account/mutations';
import {
  DeactivateSettingsForm,
  PasswordSettingsForm,
  ProfileSettingsForm,
  SettingsTabs,
  type SettingsTab,
} from './SettingsAccountForms';
import { parseSettingsError } from './settingsErrors';
import { useSettingsIntegrations } from './useSettingsIntegrations';

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

export default function SettingsModal({ onClose, onLogout }: Props) {
  const { showToast } = useToast();
  const { user, reloadUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // States para Desconexão da Steam
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showDeleteGamesConfirm, setShowDeleteGamesConfirm] = useState(false);
  const [pendingDisconnectAccountId, setPendingDisconnectAccountId] = useState<string | null>(null);
  const [disconnectProvider, setDisconnectProvider] = useState<'steam' | 'itch' | 'gog' | null>(null);
  
  // States para Alteração de Dados
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [prevUsername, setPrevUsername] = useState(user?.username || '');
  const [isPublic, setIsPublic] = useState(user?.is_public ?? false);
  const [prevIsPublic, setPrevIsPublic] = useState(user?.is_public ?? false);

  if (user?.username !== prevUsername || user?.is_public !== prevIsPublic) {
    setPrevUsername(user?.username || '');
    setNewUsername(user?.username || '');
    setPrevIsPublic(user?.is_public ?? false);
    setIsPublic(user?.is_public ?? false);
  }
  
  // States para Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States para Desativação
  const [deactivatePassword, setDeactivatePassword] = useState('');

  const [error, setError] = useState('');
  const [showEpicDeleteConfirm, setShowEpicDeleteConfirm] = useState(false);
  const profileMutation = useMutation({ mutationFn: updateAccountProfile });
  const passwordMutation = useMutation({ mutationFn: changeAccountPassword });
  const deactivateMutation = useMutation({ mutationFn: deactivateAccount });
  const isSubmitting = profileMutation.isPending || passwordMutation.isPending || deactivateMutation.isPending;

  const {
    steamAccounts, gogAccounts, itchAccounts, epicGamesCount,
    steamUrl, setSteamUrl, gogUrl, setGogUrl,
    isFetchingSteam, isFetchingGog, isFetchingItch, isFetchingEpic, isImportingEpic,
    isEpicInstructionsOpen, setIsEpicInstructionsOpen, isCopiedScript,
    epicPastedText, parsedEpicTitles, isEpicDragging, setIsEpicDragging,
    connectSteam: handleConnectSteam,
    connectGog: handleConnectGog,
    connectItch: handleConnectItch,
    disconnectAccount,
    sync,
    copyEpicScript: handleCopyEpicScript,
    setEpicContent: handleEpicTextareaChange,
    uploadEpicFile: handleEpicFileUpload,
    importEpic: handleImportEpic,
    enrichEpic: handleEnrichEpic,
    deleteEpicGames: handleDeleteEpicGames,
  } = useSettingsIntegrations({ enabled: activeTab === 'integrations', setError });

  const handleDisconnectSteam = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setDisconnectProvider('steam');
    setShowDisconnectConfirm(true);
  };

  const handleSyncSteam = () => void sync('steam');
  const handleSyncSingleSteam = (accountId: string) => void sync('steam', accountId);

  const handleDisconnectGog = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setDisconnectProvider('gog');
    setShowDisconnectConfirm(true);
  };

  const handleSyncGog = () => void sync('gog');
  const handleSyncSingleGog = (accountId: string) => void sync('gog', accountId);

  const handleDisconnectItch = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setDisconnectProvider('itch');
    setShowDisconnectConfirm(true);
  };

  const handleSyncItch = (accountId: string) => void sync('itch', accountId);
  const handleSyncAllItch = () => void sync('itch');

  const executeDisconnect = async (deleteGames: boolean) => {
    if (!disconnectProvider || !pendingDisconnectAccountId) return;
    try {
      await disconnectAccount(disconnectProvider, pendingDisconnectAccountId, deleteGames);
    } finally {
      setPendingDisconnectAccountId(null);
      setDisconnectProvider(null);
    }
  };

  const handleUpdateProfile = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setError('');

    try {
      await profileMutation.mutateAsync({
        username: newUsername.trim() !== user?.username ? newUsername.trim() : undefined,
        isPublic: isPublic !== user?.is_public ? isPublic : undefined,
      });
      showToast('Perfil atualizado com sucesso!', 'success');
      await reloadUser();
      onClose();
    } catch (err: unknown) {
      setError(parseSettingsError(err, 'Erro ao atualizar perfil.'));
    }
  };

  const handleChangePassword = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setError('');

    try {
      await passwordMutation.mutateAsync({ currentPassword, newPassword });
      showToast('Senha alterada com sucesso!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: unknown) {
      setError(parseSettingsError(err, 'Erro ao alterar senha.'));
    }
  };

  const handleDeactivate = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!deactivatePassword) return;
    setError('');

    try {
      await deactivateMutation.mutateAsync(deactivatePassword);
      showToast('Conta desativada. Seus dados serão mantidos por 15 dias.', 'info');
      setDeactivatePassword('');
      onClose();
      onLogout(); // Desloga o usuário
    } catch (err: unknown) {
      setError(parseSettingsError(err, 'Erro ao desativar conta.'));
    }
  };

  return (
    <>
      <Modal open onClose={() => !isSubmitting && onClose()} maxWidth="500px" showCloseButton={!isSubmitting} className="scrollbar-visualmemory">
        <div className={styles.settingsContainer}>
        <div className={styles.modalHeader}>
          <h3>Configurações de Conta</h3>
        </div>

        <SettingsTabs
          activeTab={activeTab}
          disabled={isSubmitting}
          onChange={(tab) => {
            setActiveTab(tab);
            setError('');
          }}
        />

        <div className={styles.modalBody}>
          {error && <p className={styles.error}>{error}</p>}

          {activeTab === 'profile' && (
            <ProfileSettingsForm
              username={newUsername}
              isPublic={isPublic}
              isSubmitting={isSubmitting}
              onUsernameChange={setNewUsername}
              onVisibilityChange={setIsPublic}
              onSubmit={handleUpdateProfile}
            />
          )}

          {activeTab === 'password' && (
            <PasswordSettingsForm
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              isSubmitting={isSubmitting}
              onCurrentPasswordChange={setCurrentPassword}
              onNewPasswordChange={setNewPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onSubmit={handleChangePassword}
            />
          )}

          {activeTab === 'deactivate' && (
            <DeactivateSettingsForm
              password={deactivatePassword}
              isSubmitting={isSubmitting}
              onPasswordChange={setDeactivatePassword}
              onSubmit={handleDeactivate}
            />
          )}

          {activeTab === 'integrations' && (
            <div className={styles.integrationsTabContent}>
              <div className={styles.integrationSection}>
                <h3>Steam</h3>
                <p className={styles.helpText}>
                  Conecte uma ou mais contas Steam para importar e sincronizar seus jogos automaticamente. 
                  <strong> Nota:</strong> O perfil e os "Detalhes do Jogo" devem estar definidos como <strong>Públicos</strong> nas configurações da Steam.
                </p>

                <form onSubmit={handleConnectSteam} className={styles.integrationForm}>
                  <div className={styles.inputRow}>
                    <Input
                      placeholder="URL do perfil Steam ou ID (ex: 7656119...)"
                      value={steamUrl}
                      onChange={(e) => setSteamUrl(e.target.value)}
                      disabled={isFetchingSteam}
                      required
                    />
                    <Button type="submit" disabled={isFetchingSteam || !steamUrl.trim()}>
                      {isFetchingSteam ? 'Conectando...' : 'Conectar'}
                    </Button>
                  </div>
                </form>

                {steamAccounts.length > 0 ? (
                  <div className={styles.accountsList}>
                    <div className={styles.listHeader}>
                      <h4>Contas Conectadas ({steamAccounts.length})</h4>
                      <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingSteam} onClick={handleSyncSteam}>
                        <RefreshCw aria-hidden="true" size={16} /> Sincronizar Tudo
                      </Button>
                    </div>
                    
                    {steamAccounts.map((acc) => (
                      <div key={acc.id} className={acc.avatar_url ? styles.accountCard : `${styles.accountCard} ${styles.accountCardNoAvatar}`}>
                        <img src={acc.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'} alt={acc.persona_name || ''} className={acc.avatar_url ? styles.accountAvatar : styles.accountAvatarPlaceholder} />
                        <div className={styles.accountInfo}>
                          <strong>{acc.persona_name || 'Usuário Steam'}</strong>
                          <span>ID: {acc.steam_id}</span>
                          {acc.last_sync_at && (
                            <small>Sincronizado em: {formatDateTime(acc.last_sync_at)}</small>
                          )}
                        </div>
                        <div className={styles.accountActions}>
                          <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingSteam} onClick={() => handleSyncSingleSteam(acc.id)}>
                            <RefreshCw aria-hidden="true" size={16} />
                          </Button>
                          <Button variant="ghost" className={styles.disconnectButton} onClick={() => handleDisconnectSteam(acc.id)}>
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noAccounts}>Nenhuma conta Steam vinculada ainda.</div>
                )}
              </div>

              <hr className={styles.integrationDivider} />

              <div className={styles.integrationSection}>
                <h3>GOG (Good Old Games)</h3>
                <p className={styles.helpText}>
                  Conecte sua conta GOG para importar sua biblioteca, tempo jogado e conquistas.
                  <strong> Nota:</strong> O perfil e os jogos devem estar configurados como <strong>Públicos</strong> nas opções de privacidade do GOG.
                </p>

                <form onSubmit={handleConnectGog} className={styles.integrationForm}>
                  <div className={styles.inputRow}>
                    <Input
                      placeholder="URL do perfil GOG ou nome de usuário (ex: usuario)"
                      value={gogUrl}
                      onChange={(e) => setGogUrl(e.target.value)}
                      disabled={isFetchingGog}
                      required
                    />
                    <Button type="submit" disabled={isFetchingGog || !gogUrl.trim()}>
                      {isFetchingGog ? 'Conectando...' : 'Conectar'}
                    </Button>
                  </div>
                </form>

                {gogAccounts.length > 0 ? (
                  <div className={styles.accountsList}>
                    <div className={styles.listHeader}>
                      <h4>Contas Conectadas ({gogAccounts.length})</h4>
                      <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingGog} onClick={handleSyncGog}>
                        <RefreshCw aria-hidden="true" size={16} /> Sincronizar Tudo
                      </Button>
                    </div>
                    
                    {gogAccounts.map((acc) => (
                      <div key={acc.id} className={acc.avatar_url ? styles.accountCard : `${styles.accountCard} ${styles.accountCardNoAvatar}`}>
                        <img src={acc.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'} alt={acc.persona_name || acc.username} className={acc.avatar_url ? styles.accountAvatar : styles.accountAvatarPlaceholder} />
                        <div className={styles.accountInfo}>
                          <strong>{acc.persona_name || acc.username}</strong>
                          <span>@{acc.username}</span>
                          {acc.last_sync_at && (
                            <small>Sincronizado em: {formatDateTime(acc.last_sync_at)}</small>
                          )}
                        </div>
                        <div className={styles.accountActions}>
                          <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingGog} onClick={() => handleSyncSingleGog(acc.id)}>
                            <RefreshCw aria-hidden="true" size={16} />
                          </Button>
                          <Button variant="ghost" className={styles.disconnectButton} onClick={() => handleDisconnectGog(acc.id)}>
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noAccounts}>Nenhuma conta GOG vinculada ainda.</div>
                )}
              </div>

              <hr className={styles.integrationDivider} />

              <div className={styles.integrationSection}>
                <h3>Itch.io</h3>
                <p className={styles.helpText}>
                  Conecte sua conta Itch.io para sincronizar sua biblioteca. O redirecionamento utilizará o fluxo seguro do OAuth da itch.io.
                </p>

                <div className={styles.integrationAction}>
                  <Button onClick={handleConnectItch} disabled={isFetchingItch}>
                    Conectar Itch.io via OAuth
                  </Button>
                </div>

                {itchAccounts.length > 0 ? (
                  <div className={styles.accountsList}>
                    <div className={styles.listHeader}>
                      <h4>Contas Conectadas ({itchAccounts.length})</h4>
                      <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingItch} onClick={handleSyncAllItch}>
                        <RefreshCw aria-hidden="true" size={16} /> Sincronizar Tudo
                      </Button>
                    </div>
                    
                    {itchAccounts.map((acc) => (
                      <div key={acc.id} className={acc.avatar_url ? styles.accountCard : `${styles.accountCard} ${styles.accountCardNoAvatar}`}>
                        <img src={acc.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'} alt={acc.username || ''} className={acc.avatar_url ? styles.accountAvatar : styles.accountAvatarPlaceholder} />
                        <div className={styles.accountInfo}>
                          <strong>{acc.username || 'Usuário Itch'}</strong>
                          <span>ID: {acc.itch_id}</span>
                          {acc.last_sync_at && (
                            <small>Sincronizado em: {formatDateTime(acc.last_sync_at)}</small>
                          )}
                        </div>
                        <div className={styles.accountActions}>
                          <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingItch} onClick={() => handleSyncItch(acc.id)}>
                            <RefreshCw aria-hidden="true" size={16} />
                          </Button>
                          <Button variant="ghost" className={styles.disconnectButton} onClick={() => handleDisconnectItch(acc.id)}>
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noAccounts}>Nenhuma conta Itch.io vinculada ainda.</div>
                )}
              </div>

              <hr className={styles.integrationDivider} />

              <div className={styles.integrationSection}>
                <div className={styles.epicHeader}>
                  <h3>Epic Games Store</h3>
                  {epicGamesCount !== null && (
                    <span className={styles.epicBadge}>
                      {epicGamesCount} {epicGamesCount === 1 ? 'jogo na biblioteca' : 'jogos na biblioteca'}
                    </span>
                  )}
                </div>
                <p className={styles.helpText}>
                  Importe sua biblioteca da Epic Games Store a partir de um arquivo TXT/CSV ou colando a lista de títulos.
                </p>

                {epicGamesCount !== null && epicGamesCount > 0 && (
                  <div className={styles.epicManagementActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      className={styles.syncAllButton}
                      disabled={isFetchingEpic}
                      onClick={handleEnrichEpic}
                    >
                      <RefreshCw aria-hidden="true" size={16} /> Atualizar Metadados (Capas e Gêneros)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className={styles.disconnectButton}
                      disabled={isFetchingEpic}
                      onClick={() => setShowEpicDeleteConfirm(true)}
                    >
                      <Trash2 aria-hidden="true" size={16} /> Remover Jogos da Epic
                    </Button>
                  </div>
                )}

                <button
                  type="button"
                  className={styles.epicInstructionsToggle}
                  onClick={() => setIsEpicInstructionsOpen((prev) => !prev)}
                >
                  {isEpicInstructionsOpen ? <><ChevronDown aria-hidden="true" size={16} /> Ocultar instruções de exportação</> : <><ChevronRight aria-hidden="true" size={16} /> Como exportar minha biblioteca da Epic?</>}
                </button>

                {isEpicInstructionsOpen && (
                  <div className={styles.epicInstructionsBox}>
                    <ol className={styles.epicStepList}>
                      <li>
                        Acesse sua{' '}
                        <a
                          href="https://accounts.epicgames.com/account/transactions/purchases?productName=egs"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Página de Transações da Epic Games ↗
                        </a>{' '}
                        no navegador.
                      </li>
                      <li>Abra as Ferramentas do Desenvolvedor pressionando <strong>F12</strong> e clique na aba <strong>Console</strong>.</li>
                      <li>Clique no botão abaixo para copiar o script de exportação:</li>
                    </ol>

                    <div className={styles.epicScriptAction}>
                      <Button
                        type="button"
                        variant="secondary"
                        className={styles.copyScriptBtn}
                        onClick={handleCopyEpicScript}
                      >
                        {isCopiedScript ? <><Check aria-hidden="true" size={16} /> Script Copiado!</> : <><Clipboard aria-hidden="true" size={16} /> Copiar Script de Exportação</>}
                      </Button>
                    </div>

                    <ol className={styles.epicStepList} start={4} style={{ marginTop: 'var(--gap-sm)' }}>
                      <li>Cole o script no console e pressione <strong>Enter</strong>.</li>
                      <li>O download do arquivo <code>EpicGamesLibrary.txt</code> começará automaticamente.</li>
                      <li>Arraste o arquivo baixado para a área de importação abaixo ou cole seu conteúdo!</li>
                    </ol>
                  </div>
                )}

                {/* Área de Drag & Drop */}
                <div
                  className={`${styles.dropZone} ${isEpicDragging ? styles.dropZoneActive : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsEpicDragging(true);
                  }}
                  onDragLeave={() => setIsEpicDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsEpicDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleEpicFileUpload(file);
                  }}
                  onClick={() => {
                    const input = document.getElementById('epic-file-input') as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <input
                    id="epic-file-input"
                    type="file"
                    accept=".txt,.csv"
                    className={styles.fileInputHidden}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleEpicFileUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <span className={styles.dropZoneIcon}><FolderOpen aria-hidden="true" /></span>
                  <p className={styles.dropZoneText}>
                    <strong>Clique para selecionar</strong> ou arraste seu <code>EpicGamesLibrary.txt</code> / <code>.csv</code>
                  </p>
                  <p className={styles.dropZoneSubtext}>Suporta arquivos .txt e .csv gerados pelo script</p>
                </div>

                <div className={styles.epicTextareaDivider}>OU COLE A LISTA DE JOGOS</div>

                <textarea
                  className={styles.epicTextarea}
                  placeholder="Cole os nomes dos jogos aqui (um por linha)...&#10;Exemplo:&#10;Control&#10;Death Stranding&#10;GTA V"
                  value={epicPastedText}
                  onChange={(e) => handleEpicTextareaChange(e.target.value)}
                  disabled={isImportingEpic}
                />

                {parsedEpicTitles.length > 0 && (
                  <div className={styles.epicPreviewContainer}>
                    <div className={styles.epicPreviewInfo}>
                      <p className={styles.epicPreviewTitle}>
                        <Gamepad2 aria-hidden="true" size={18} /> {parsedEpicTitles.length} {parsedEpicTitles.length === 1 ? 'jogo pronto para importação' : 'jogos prontos para importação'}
                      </p>
                      <p className={styles.epicPreviewSubtitle}>
                        Serão adicionados à sua biblioteca com o status &quot;Na biblioteca&quot; e loja Epic Games.
                      </p>
                    </div>
                    <div className={styles.epicPreviewActions}>
                      <Button
                        type="button"
                        onClick={handleImportEpic}
                        disabled={isImportingEpic}
                      >
                        {isImportingEpic ? 'Importando...' : 'Importar Jogos'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>

    {/* Primeiro modal de confirmação: Desconectar conta */}
    {showDisconnectConfirm && (
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        title={`Desconectar Conta ${disconnectProvider === 'steam' ? 'Steam' : disconnectProvider === 'gog' ? 'GOG' : 'Itch.io'}`}
        message={`Tem certeza que deseja desconectar esta conta ${disconnectProvider === 'steam' ? 'Steam' : disconnectProvider === 'gog' ? 'GOG' : 'Itch.io'}? Ela não será mais sincronizada.`}
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={() => {
          setShowDisconnectConfirm(false);
          setShowDeleteGamesConfirm(true);
        }}
        onCancel={() => {
          setShowDisconnectConfirm(false);
          setPendingDisconnectAccountId(null);
          setDisconnectProvider(null);
        }}
      />
    )}

    {/* Segundo modal de confirmação: O que fazer com os jogos */}
    {showDeleteGamesConfirm && (
      <ConfirmModal
        isOpen={showDeleteGamesConfirm}
        title="Remover Jogos Importados?"
        message="Deseja também REMOVER todos os jogos importados desta conta da sua biblioteca? Você pode optar por manter os jogos na biblioteca ou removê-los."
        confirmText="Remover jogos"
        cancelText="Manter jogos na biblioteca"
        isDestructive
        onConfirm={() => {
          void executeDisconnect(true);
          setShowDeleteGamesConfirm(false);
        }}
        onCancel={() => {
          void executeDisconnect(false);
          setShowDeleteGamesConfirm(false);
        }}
      />
    )}

    {/* Modal de confirmação: Remover todos os jogos da Epic Games */}
    {showEpicDeleteConfirm && (
      <ConfirmModal
        isOpen={showEpicDeleteConfirm}
        title="Remover Jogos da Epic Games?"
        message="Tem certeza que deseja remover todos os jogos importados da Epic Games da sua biblioteca? Esta ação não pode ser desfeita."
        confirmText="Sim, remover jogos"
        cancelText="Cancelar"
        isDestructive
        onConfirm={() => {
          setShowEpicDeleteConfirm(false);
          void handleDeleteEpicGames();
        }}
        onCancel={() => setShowEpicDeleteConfirm(false)}
      />
    )}
  </>
);
}
