import { useState, SyntheticEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  gogAccountsQuery,
  itchAccountsQuery,
  steamAccountsQuery,
} from '@/features/integrations/queries';
import { myLibraryQuery } from '@/features/library/queries';
import { libraryKeys } from '@/features/library/queries';
import { runIntegrationAction } from '@/features/integrations/mutations';
import { integrationKeys } from '@/features/integrations/queries';
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

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

interface PydanticErrorDetail {
  msg?: string;
  loc?: Array<string | number>;
}

interface AxiosErrorDetail {
  response?: {
    data?: {
      detail?: string | PydanticErrorDetail[];
    };
  };
}

export default function SettingsModal({ onClose, onLogout }: Props) {
  const { showToast } = useToast();
  const { user, reloadUser } = useAuth();
  const queryClient = useQueryClient();
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

  const parseError = (err: unknown, fallback = 'Ocorreu um erro no servidor.'): string => {
    const errorObj = err as AxiosErrorDetail;
    const detail = errorObj.response?.data?.detail;
    
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: PydanticErrorDetail) => {
        const msg = d.msg || '';
        const loc = d.loc || [];
        const isPassword = loc.includes('password') || loc.includes('new_password') || loc.includes('current_password');
        const isUsername = loc.includes('username');
        const isEmail = loc.includes('email');

        if (msg.includes('should have at least')) {
          const match = msg.match(/\d+/);
          const num = match ? match[0] : '';
          if (isPassword) return `A senha deve ter pelo menos ${num} caracteres.`;
          if (isUsername) return `O nome de usuário deve ter pelo menos ${num} caracteres.`;
          return `O campo deve ter pelo menos ${num} caracteres.`;
        }

        if (msg.includes('should have at most')) {
          const match = msg.match(/\d+/);
          const num = match ? match[0] : '';
          if (isUsername) return `O nome de usuário deve ter no máximo ${num} caracteres.`;
          if (isPassword) return `A senha deve ter no máximo ${num} caracteres.`;
          return `O campo deve ter no máximo ${num} caracteres.`;
        }
        
        if (msg.includes('value is not a valid email')) {
          return 'E-mail inválido.';
        }

        if (msg.includes('Field required')) {
          if (isPassword) return 'A senha é obrigatória.';
          if (isUsername) return 'O nome de usuário é obrigatório.';
          if (isEmail) return 'O e-mail é obrigatório.';
          return 'Campo obrigatório.';
        }

        return msg.replace(/^Value error,\s*/i, '');
      }).join('\n');
    }
    return fallback;
  };

  // States para Steam
  const [steamUrl, setSteamUrl] = useState('');

  // States para GOG
  const [gogUrl, setGogUrl] = useState('');

  // States para Itch.io

  // States para Epic Games Store
  const [isEpicInstructionsOpen, setIsEpicInstructionsOpen] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [epicPastedText, setEpicPastedText] = useState('');
  const [parsedEpicTitles, setParsedEpicTitles] = useState<string[]>([]);
  const [isEpicDragging, setIsEpicDragging] = useState(false);
  const [showEpicDeleteConfirm, setShowEpicDeleteConfirm] = useState(false);

  const integrationsEnabled = activeTab === 'integrations';
  const steamQuery = useQuery({ ...steamAccountsQuery(), enabled: integrationsEnabled });
  const gogQuery = useQuery({ ...gogAccountsQuery(), enabled: integrationsEnabled });
  const itchQuery = useQuery({ ...itchAccountsQuery(), enabled: integrationsEnabled });
  const libraryQuery = useQuery({ ...myLibraryQuery(), enabled: integrationsEnabled });

  const steamAccounts = steamQuery.data ?? [];
  const gogAccounts = gogQuery.data ?? [];
  const itchAccounts = itchQuery.data ?? [];
  const epicGamesCount = libraryQuery.data
    ? libraryQuery.data.filter((game) => game.store === 'EPIC').length
    : null;

  const integrationMutation = useMutation({
    mutationFn: runIntegrationAction,
    onSuccess: (_result, action) => {
      if (action.provider !== 'epic') {
        queryClient.invalidateQueries({ queryKey: integrationKeys[action.provider]() });
      }
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
    },
  });
  const profileMutation = useMutation({ mutationFn: updateAccountProfile });
  const passwordMutation = useMutation({ mutationFn: changeAccountPassword });
  const deactivateMutation = useMutation({ mutationFn: deactivateAccount });

  const isFetchingSteam = integrationMutation.isPending && integrationMutation.variables?.provider === 'steam';
  const isFetchingGog = integrationMutation.isPending && integrationMutation.variables?.provider === 'gog';
  const isFetchingItch = integrationMutation.isPending && integrationMutation.variables?.provider === 'itch';
  const isFetchingEpic = integrationMutation.isPending && integrationMutation.variables?.provider === 'epic';
  const isImportingEpic = isFetchingEpic && integrationMutation.variables?.type === 'import';
  const isSubmitting = profileMutation.isPending || passwordMutation.isPending || deactivateMutation.isPending;

  const handleConnectSteam = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!steamUrl.trim()) return;
    setError('');
    showToast('Conectando à Steam e importando biblioteca...', 'info');
    try {
      await integrationMutation.mutateAsync({
        provider: 'steam', type: 'connect', profileUrl: steamUrl.trim(),
      });
      showToast('Conta Steam conectada e biblioteca importada com sucesso!', 'success');
      setSteamUrl('');
    } catch (err: unknown) {
      const msg = parseError(
        err,
        'Erro ao conectar conta Steam. Verifique se o perfil e os detalhes de jogo estão públicos.'
      );
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleDisconnectSteam = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setDisconnectProvider('steam');
    setShowDisconnectConfirm(true);
  };

  const executeDisconnectSteam = async (deleteGames: boolean) => {
    if (!pendingDisconnectAccountId) return;
    setError('');
    try {
      await integrationMutation.mutateAsync({
        provider: 'steam', type: 'disconnect', accountId: pendingDisconnectAccountId, deleteGames,
      });
      showToast('Conta Steam desconectada com sucesso.', 'success');
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao desconectar conta Steam.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setPendingDisconnectAccountId(null);
    }
  };

  const handleSyncSteam = async () => {
    setError('');
    showToast('Sincronizando jogos da Steam...', 'info');
    try {
      const { new_games_count = 0 } = await integrationMutation.mutateAsync({
        provider: 'steam', type: 'sync-all',
      });
      showToast(
        `Sincronização concluída! ${new_games_count} novos jogos adicionados. Detalhes e gêneros estão sendo preenchidos em segundo plano.`,
        'success'
      );
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao sincronizar contas Steam.');
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleSyncSingleSteam = async (accountId: string) => {
    setError('');
    showToast('Sincronizando conta Steam...', 'info');
    try {
      const { new_games_count = 0 } = await integrationMutation.mutateAsync({
        provider: 'steam', type: 'sync-one', accountId,
      });
      showToast(
        `Sincronização concluída! ${new_games_count} novos jogos adicionados. Detalhes e gêneros estão sendo preenchidos em segundo plano.`,
        'success'
      );
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao sincronizar conta Steam.');
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleConnectGog = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!gogUrl.trim()) return;
    setError('');
    showToast('Conectando à GOG e importando biblioteca...', 'info');
    try {
      await integrationMutation.mutateAsync({
        provider: 'gog', type: 'connect', profileUrl: gogUrl.trim(),
      });
      showToast('Conta GOG conectada e biblioteca importada com sucesso!', 'success');
      setGogUrl('');
    } catch (err: unknown) {
      const msg = parseError(
        err,
        'Erro ao conectar conta GOG. Verifique se o perfil e os jogos estão configurados como públicos no GOG.'
      );
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleDisconnectGog = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setDisconnectProvider('gog');
    setShowDisconnectConfirm(true);
  };

  const executeDisconnectGog = async (deleteGames: boolean) => {
    if (!pendingDisconnectAccountId) return;
    setError('');
    try {
      await integrationMutation.mutateAsync({
        provider: 'gog', type: 'disconnect', accountId: pendingDisconnectAccountId, deleteGames,
      });
      showToast('Conta GOG desconectada com sucesso.', 'success');
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao desconectar conta GOG.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setPendingDisconnectAccountId(null);
    }
  };

  const handleSyncGog = async () => {
    setError('');
    showToast('Sincronizando biblioteca GOG...', 'info');
    try {
      const { new_games_count = 0, updated_games_count = 0 } = await integrationMutation.mutateAsync({
        provider: 'gog', type: 'sync-all',
      });
      showToast(
        `Sincronização GOG concluída! ${new_games_count} novos jogos adicionados, ${updated_games_count} atualizados.`,
        'success'
      );
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao sincronizar contas GOG.');
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleSyncSingleGog = async (accountId: string) => {
    setError('');
    showToast('Sincronizando conta GOG...', 'info');
    try {
      const { new_games_count = 0, updated_games_count = 0 } = await integrationMutation.mutateAsync({
        provider: 'gog', type: 'sync-one', accountId,
      });
      showToast(
        `Sincronização GOG concluída! ${new_games_count} novos jogos adicionados, ${updated_games_count} atualizados.`,
        'success'
      );
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao sincronizar conta GOG.');
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleConnectItch = () => {
    const clientId = import.meta.env.VITE_ITCH_CLIENT_ID;
    if (!clientId) {
      setError('A integração com Itch.io não está configurada neste ambiente.');
      return;
    }
    const redirectUri = `${window.location.origin}/settings/integrations/itch/callback`;
    const authUrl = `https://itch.io/user/oauth?client_id=${clientId}&scope=profile:me%20profile:owned%20profile:games&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  const handleDisconnectItch = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setDisconnectProvider('itch');
    setShowDisconnectConfirm(true);
  };

  const executeDisconnectItch = async (deleteGames: boolean) => {
    if (!pendingDisconnectAccountId) return;
    setError('');
    try {
      await integrationMutation.mutateAsync({
        provider: 'itch', type: 'disconnect', accountId: pendingDisconnectAccountId, deleteGames,
      });
      showToast('Conta Itch.io desconectada com sucesso.', 'success');
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao desconectar conta Itch.io.'));
    } finally {
      setPendingDisconnectAccountId(null);
    }
  };

  const handleSyncItch = async (accountId: string) => {
    setError('');
    try {
      const { new_games_count = 0 } = await integrationMutation.mutateAsync({
        provider: 'itch', type: 'sync-one', accountId,
      });
      showToast(`Sincronização concluída! ${new_games_count} novos jogos adicionados.`, 'success');
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao sincronizar conta Itch.io.'));
    }
  };

  const handleSyncAllItch = async () => {
    setError('');
    try {
      const { new_games_count = 0 } = await integrationMutation.mutateAsync({
        provider: 'itch', type: 'sync-all',
      });
      showToast(`Sincronização concluída! ${new_games_count} novos jogos adicionados.`, 'success');
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao sincronizar contas Itch.io.'));
    }
  };

  const EPIC_EXPORT_SCRIPT = `(async () => {
    const BASE = "https://accounts.epicgames.com/account/v2/payment/ajaxGetOrderHistory?count=100&sortDir=DESC&sortBy=DATE&locale=en-US";
    let allGames = [];
    let nextPageToken = "";
    let page = 1;
    console.log("Iniciando exportação da biblioteca da Epic...");
    while (true) {
        const url = nextPageToken ? \`\${BASE}&nextPageToken=\${encodeURIComponent(nextPageToken)}\` : BASE;
        console.log(\`Buscando página \${page}...\`);
        const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
        });
        if (!response.ok) throw new Error(\`Erro HTTP \${response.status}: \${response.statusText}\`);
        const data = await response.json();
        if (!data.orders) break;
        for (const order of data.orders) {
            if (!order.items) continue;
            for (const item of order.items) {
                if (item.description) allGames.push(item.description);
            }
        }
        nextPageToken = data.nextPageToken;
        if (!nextPageToken) break;
        page++;
    }
    const uniqueGames = [...new Set(allGames)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    const txt = uniqueGames.join("\\n");
    const txtBlob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const txtLink = document.createElement("a");
    txtLink.href = URL.createObjectURL(txtBlob);
    txtLink.download = "EpicGamesLibrary.txt";
    txtLink.click();
    console.log(\`Exportação concluída! \${uniqueGames.length} jogos baixados.\`);
})();`;

  const parseEpicContent = (rawText: string): string[] => {
    const lines = rawText.split(/\r?\n/);
    const titles: string[] = [];
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (line.toLowerCase() === 'game' || line.toLowerCase() === '"game"') continue;
      if (line.startsWith('"') && line.endsWith('"') && line.length > 1) {
        line = line.slice(1, -1).replace(/""/g, '"').trim();
      }
      if (line) {
        titles.push(line);
      }
    }
    return [...new Set(titles)];
  };

  const handleCopyEpicScript = async () => {
    try {
      await navigator.clipboard.writeText(EPIC_EXPORT_SCRIPT);
      setIsCopiedScript(true);
      showToast('Script copiado para a área de transferência!', 'success');
      setTimeout(() => setIsCopiedScript(false), 3000);
    } catch {
      showToast('Erro ao copiar script.', 'error');
    }
  };

  const handleEpicFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const titles = parseEpicContent(text);
        setParsedEpicTitles(titles);
        setEpicPastedText(titles.join('\n'));
        if (titles.length === 0) {
          showToast('Nenhum jogo identificado no arquivo.', 'error');
        } else {
          showToast(`${titles.length} jogos identificados do arquivo!`, 'info');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleEpicTextareaChange = (text: string) => {
    setEpicPastedText(text);
    const titles = parseEpicContent(text);
    setParsedEpicTitles(titles);
  };

  const handleImportEpic = async () => {
    if (parsedEpicTitles.length === 0) return;
    setError('');
    showToast(`Importando ${parsedEpicTitles.length} jogos da Epic Games...`, 'info');
    try {
      const { imported_count = 0, skipped_count = 0 } = await integrationMutation.mutateAsync({
        provider: 'epic', type: 'import', titles: parsedEpicTitles,
      });
      showToast(
        `Importação concluída! ${imported_count} novos jogos adicionados${skipped_count > 0 ? ` (${skipped_count} já existiam na biblioteca)` : ''}.`,
        'success'
      );
      setEpicPastedText('');
      setParsedEpicTitles([]);
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao importar jogos da Epic Games.'));
    }
  };

  const handleEnrichEpic = async () => {
    setError('');
    showToast('Atualizando metadados dos jogos da Epic Games...', 'info');
    try {
      const { games_to_enrich_count = 0 } = await integrationMutation.mutateAsync({
        provider: 'epic', type: 'enrich',
      });
      showToast(
        `Atualização iniciada! ${games_to_enrich_count} jogos estão tendo capas e gêneros buscados em segundo plano.`,
        'success'
      );
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao atualizar metadados dos jogos da Epic Games.'));
    }
  };

  const handleDeleteEpicGames = async () => {
    setError('');
    try {
      const { removed_count = 0 } = await integrationMutation.mutateAsync({
        provider: 'epic', type: 'delete-games',
      });
      showToast(`${removed_count} jogos da Epic Games foram removidos da biblioteca.`, 'success');
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao remover jogos da Epic Games.'));
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
      setError(parseError(err, 'Erro ao atualizar perfil.'));
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
      setError(parseError(err, 'Erro ao alterar senha.'));
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
      setError(parseError(err, 'Erro ao desativar conta.'));
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
          if (disconnectProvider === 'steam') executeDisconnectSteam(true);
          else if (disconnectProvider === 'gog') executeDisconnectGog(true);
          else if (disconnectProvider === 'itch') executeDisconnectItch(true);
          setShowDeleteGamesConfirm(false);
        }}
        onCancel={() => {
          if (disconnectProvider === 'steam') executeDisconnectSteam(false);
          else if (disconnectProvider === 'gog') executeDisconnectGog(false);
          else if (disconnectProvider === 'itch') executeDisconnectItch(false);
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
