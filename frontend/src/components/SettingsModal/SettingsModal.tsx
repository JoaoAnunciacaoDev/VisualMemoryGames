import { useState, useEffect, useCallback, SyntheticEvent } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import styles from './SettingsModal.module.css';

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

type Tab = 'profile' | 'password' | 'deactivate' | 'steam';

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

  const fetchSteamAccounts = useCallback(async () => {
    try {
      const res = await api.get('/users/me/steam/accounts');
      setSteamAccounts(res.data);
    } catch (err) {
      console.error('Erro ao buscar contas Steam:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'steam') return;

    let active = true;
    api.get('/users/me/steam/accounts')
      .then((res) => {
        if (active) setSteamAccounts(res.data);
      })
      .catch((err) => {
        console.error('Erro ao buscar contas Steam:', err);
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
      <Modal open onClose={() => !isSubmitting && onClose()} maxWidth="500px" showCloseButton={!isSubmitting}>
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
            className={`${styles.tabButton} ${activeTab === 'steam' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('steam'); setError(''); }}
            disabled={isSubmitting}
          >
            Contas Steam
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

          {activeTab === 'steam' && (
            <div className={styles.steamTabContent}>
              <p className={styles.helpText}>
                Conecte uma ou mais contas Steam para importar e sincronizar seus jogos automaticamente. 
                <strong> Nota:</strong> O perfil e os "Detalhes do Jogo" devem estar definidos como <strong>Públicos</strong> nas configurações da Steam.
              </p>

              <form onSubmit={handleConnectSteam} className={styles.steamForm}>
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
                <div className={styles.steamAccountsList}>
                  <div className={styles.steamListHeader}>
                    <h4>Contas Conectadas ({steamAccounts.length})</h4>
                    <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingSteam} onClick={handleSyncSteam}>
                      🔄 Sincronizar Tudo
                    </Button>
                  </div>
                  
                  {steamAccounts.map((acc) => (
                    <div key={acc.id} className={acc.avatar_url ? styles.steamAccountCard : `${styles.steamAccountCard} ${styles.steamAccountCardNoAvatar}`}>
                      <img src={acc.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'} alt={acc.persona_name || ''} className={acc.avatar_url ? styles.steamAvatar : styles.steamAvatarPlaceholder} />
                      <div className={styles.steamAccountInfo}>
                        <strong>{acc.persona_name || 'Usuário Steam'}</strong>
                        <span>ID: {acc.steam_id}</span>
                        {acc.last_sync_at && (
                          <small>Sincronizado em: {new Date(acc.last_sync_at).toLocaleString()}</small>
                        )}
                      </div>
                      <Button variant="ghost" className={styles.disconnectButton} onClick={() => handleDisconnectSteam(acc.id)}>
                        Desconectar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noAccounts}>Nenhuma conta Steam vinculada ainda.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>

    {/* Primeiro modal de confirmação: Desconectar conta */}
    {showDisconnectConfirm && (
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        title="Desconectar Conta Steam"
        message="Tem certeza que deseja desconectar esta conta Steam? Ela não será mais sincronizada."
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={() => {
          setShowDisconnectConfirm(false);
          setShowDeleteGamesConfirm(true);
        }}
        onCancel={() => {
          setShowDisconnectConfirm(false);
          setPendingDisconnectAccountId(null);
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
          setShowDeleteGamesConfirm(false);
          void executeDisconnectSteam(true);
        }}
        onCancel={() => {
          setShowDeleteGamesConfirm(false);
          void executeDisconnectSteam(false);
        }}
      />
    )}
  </>
);
}
