import { useState, useEffect, useCallback, SyntheticEvent } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/utils/date';
import styles from './SettingsModal.module.css';

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

type Tab = 'profile' | 'password' | 'deactivate' | 'integrations';

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
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // States para Desconexão da Steam
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showDeleteGamesConfirm, setShowDeleteGamesConfirm] = useState(false);
  const [pendingDisconnectAccountId, setPendingDisconnectAccountId] = useState<string | null>(null);
  const [disconnectProvider, setDisconnectProvider] = useState<'steam' | 'itch' | null>(null);
  
  // States para Alteração de Dados
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [prevUsername, setPrevUsername] = useState(user?.username || '');

  if (user?.username !== prevUsername) {
    setPrevUsername(user?.username || '');
    setNewUsername(user?.username || '');
  }
  
  // States para Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States para Desativação
  const [deactivatePassword, setDeactivatePassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
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
  interface SteamAccount {
    id: string;
    steam_id: string;
    persona_name: string | null;
    avatar_url: string | null;
    last_sync_at: string | null;
  }
  const [steamAccounts, setSteamAccounts] = useState<SteamAccount[]>([]);
  const [steamUrl, setSteamUrl] = useState('');
  const [isFetchingSteam, setIsFetchingSteam] = useState(false);

  // States para Itch.io
  interface ItchAccount {
    id: string;
    itch_id: string;
    username: string;
    avatar_url: string | null;
    last_sync_at: string | null;
  }
  const [itchAccounts, setItchAccounts] = useState<ItchAccount[]>([]);
  const [isFetchingItch, setIsFetchingItch] = useState(false);

  const fetchSteamAccounts = useCallback(async () => {
    try {
      const res = await api.get('/users/me/steam/accounts');
      setSteamAccounts(res.data);
    } catch (err) {
      console.error('Erro ao buscar contas Steam:', err);
    }
  }, []);

  const fetchItchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/users/me/itch/accounts');
      setItchAccounts(res.data);
    } catch (err) {
      console.error('Erro ao buscar contas Itch.io:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'integrations') return;

    let active = true;
    api.get('/users/me/steam/accounts')
      .then((res) => {
        if (active) setSteamAccounts(res.data);
      })
      .catch((err) => {
        console.error('Erro ao buscar contas Steam:', err);
      });
      
    api.get('/users/me/itch/accounts')
      .then((res) => {
        if (active) setItchAccounts(res.data);
      })
      .catch((err) => {
        console.error('Erro ao buscar contas Itch.io:', err);
      });

    return () => {
      active = false;
    };
  }, [activeTab]);

  const handleConnectSteam = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!steamUrl.trim()) return;
    setIsFetchingSteam(true);
    setError('');
    try {
      await api.post('/users/me/steam/accounts', { profile_url: steamUrl.trim() });
      showToast('Conta Steam conectada e biblioteca importada!', 'success');
      setSteamUrl('');
      void fetchSteamAccounts();
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      setError(
        parseError(
          err,
          'Erro ao conectar conta Steam. Verifique se o perfil e os detalhes de jogo estão públicos.'
        )
      );
    } finally {
      setIsFetchingSteam(false);
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
      await api.delete(
        `/users/me/steam/accounts/${pendingDisconnectAccountId}?delete_games=${deleteGames}`
      );
      showToast('Conta Steam desconectada com sucesso.', 'success');
      void fetchSteamAccounts();
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao desconectar conta Steam.'));
    } finally {
      setPendingDisconnectAccountId(null);
    }
  };

  const handleSyncSteam = async () => {
    setIsFetchingSteam(true);
    setError('');
    try {
      const res = await api.post('/users/me/steam/sync');
      const { new_games_count } = res.data;
      showToast(
        `Sincronização concluída! ${new_games_count} novos jogos adicionados. Detalhes e gêneros estão sendo preenchidos em segundo plano.`,
        'success'
      );
      void fetchSteamAccounts();
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao sincronizar contas Steam.'));
    } finally {
      setIsFetchingSteam(false);
    }
  };

  const handleSyncSingleSteam = async (accountId: string) => {
    setIsFetchingSteam(true);
    setError('');
    try {
      const res = await api.post(`/users/me/steam/accounts/${accountId}/sync`);
      const { new_games_count } = res.data;
      showToast(
        `Sincronização concluída! ${new_games_count} novos jogos adicionados. Detalhes e gêneros estão sendo preenchidos em segundo plano.`,
        'success'
      );
      void fetchSteamAccounts();
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao sincronizar conta Steam.'));
    } finally {
      setIsFetchingSteam(false);
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
      await api.delete(
        `/users/me/itch/accounts/${pendingDisconnectAccountId}?delete_games=${deleteGames}`
      );
      showToast('Conta Itch.io desconectada com sucesso.', 'success');
      void fetchItchAccounts();
      window.dispatchEvent(new Event('itch-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao desconectar conta Itch.io.'));
    } finally {
      setPendingDisconnectAccountId(null);
    }
  };

  const handleSyncItch = async (accountId: string) => {
    setIsFetchingItch(true);
    setError('');
    try {
      const res = await api.post(`/users/me/itch/accounts/${accountId}/sync`);
      const { new_games_count } = res.data;
      showToast(`Sincronização concluída! ${new_games_count} novos jogos adicionados.`, 'success');
      void fetchItchAccounts();
      window.dispatchEvent(new Event('itch-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao sincronizar conta Itch.io.'));
    } finally {
      setIsFetchingItch(false);
    }
  };

  const handleSyncAllItch = async () => {
    setIsFetchingItch(true);
    setError('');
    try {
      const res = await api.post('/users/me/itch/sync');
      const { new_games_count } = res.data;
      showToast(`Sincronização concluída! ${new_games_count} novos jogos adicionados.`, 'success');
      void fetchItchAccounts();
      window.dispatchEvent(new Event('itch-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao sincronizar contas Itch.io.'));
    } finally {
      setIsFetchingItch(false);
    }
  };

  const handleUpdateUsername = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setIsSubmitting(true);
    setError('');

    try {
      await api.put('/users/me', { username: newUsername.trim() });
      showToast('Nome de usuário alterado com sucesso!', 'success');
      await reloadUser();
      window.dispatchEvent(new Event('user-updated'));
      setNewUsername('');
      onClose();
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao alterar nome de usuário.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast('Senha alterada com sucesso!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao alterar senha.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!deactivatePassword) return;
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/users/me/deactivate', {
        password: deactivatePassword,
      });
      showToast('Conta desativada. Seus dados serão mantidos por 15 dias.', 'info');
      setDeactivatePassword('');
      onClose();
      onLogout(); // Desloga o usuário
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao desativar conta.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal open onClose={() => !isSubmitting && onClose()} maxWidth="500px" showCloseButton={!isSubmitting} className="scrollbar-visualmemory">
        <div className={styles.settingsContainer}>
        <div className={styles.modalHeader}>
          <h3>Configurações de Conta</h3>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('profile'); setError(''); }}
            disabled={isSubmitting}
          >
            Nome de Usuário
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'password' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('password'); setError(''); }}
            disabled={isSubmitting}
          >
            Alterar Senha
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'deactivate' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('deactivate'); setError(''); }}
            disabled={isSubmitting}
          >
            Excluir Conta
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'integrations' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('integrations'); setError(''); }}
            disabled={isSubmitting}
          >
            Integrações
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && <p className={styles.error}>{error}</p>}

          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateUsername} className={styles.form}>
              <p className={styles.helpText}>Escolha um novo nome de usuário único para sua conta.</p>
              <label className={styles.label}>
                Novo Nome de Usuário
                <Input
                  placeholder="Ex: novo_usuario"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  disabled={isSubmitting}
                  maxLength={30}
                />
              </label>
              <Button type="submit" disabled={isSubmitting} fullWidth>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className={styles.form}>
              <p className={styles.helpText}>Para sua segurança, informe sua senha atual para definir a nova senha forte.</p>
              <label className={styles.label}>
                Senha Atual
                <Input
                  type="password"
                  placeholder="Sua senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </label>
              <label className={styles.label}>
                Nova Senha
                <Input
                  type="password"
                  placeholder="Nova senha forte"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </label>
              <label className={styles.label}>
                Confirmar Nova Senha
                <Input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </label>
              <Button type="submit" disabled={isSubmitting} fullWidth>
                {isSubmitting ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          )}

          {activeTab === 'deactivate' && (
            <form onSubmit={handleDeactivate} className={styles.form}>
              <div className={styles.alertBox}>
                <strong>Atenção:</strong>
                <p>
                  Ao solicitar a exclusão, sua conta e biblioteca ficarão indisponíveis e ocultas. 
                  Você terá um período de carência de <strong>15 dias</strong> para reativar sua conta simplesmente fazendo login novamente. 
                  Após os 15 dias, a conta e todos os dados associados serão apagados permanentemente.
                </p>
              </div>
              <label className={styles.label}>
                Para confirmar, insira sua senha:
                <Input
                  type="password"
                  placeholder="Sua senha"
                  value={deactivatePassword}
                  onChange={(e) => setDeactivatePassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </label>
              <Button type="submit" variant="ghost" className={styles.dangerButton} disabled={isSubmitting} fullWidth>
                {isSubmitting ? 'Processando...' : 'Solicitar Exclusão de Conta'}
              </Button>
            </form>
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
                        🔄 Sincronizar Tudo
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
                            🔄
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
                        🔄 Sincronizar Tudo
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
                            🔄
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
            </div>
          )}
        </div>
      </div>
    </Modal>

    {/* Primeiro modal de confirmação: Desconectar conta */}
    {showDisconnectConfirm && (
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        title={`Desconectar Conta ${disconnectProvider === 'steam' ? 'Steam' : 'Itch.io'}`}
        message={`Tem certeza que deseja desconectar esta conta ${disconnectProvider === 'steam' ? 'Steam' : 'Itch.io'}? Ela não será mais sincronizada.`}
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
          else if (disconnectProvider === 'itch') executeDisconnectItch(true);
          setShowDeleteGamesConfirm(false);
        }}
        onCancel={() => {
          if (disconnectProvider === 'steam') executeDisconnectSteam(false);
          else if (disconnectProvider === 'itch') executeDisconnectItch(false);
          setShowDeleteGamesConfirm(false);
        }}
      />
    )}
  </>
);
}
