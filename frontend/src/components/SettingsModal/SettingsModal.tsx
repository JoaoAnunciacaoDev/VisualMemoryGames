import { useState, SyntheticEvent } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import styles from './SettingsModal.module.css';

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

interface BackendErrorResponse {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

type Tab = 'profile' | 'password' | 'deactivate';

export default function SettingsModal({ onClose, onLogout }: Props) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  
  // States para Alteração de Dados
  const [newUsername, setNewUsername] = useState('');
  
  // States para Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States para Desativação
  const [deactivatePassword, setDeactivatePassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleUpdateUsername = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setIsSubmitting(true);
    setError('');

    try {
      await api.put('/users/me', { username: newUsername.trim() });
      showToast('Nome de usuário alterado com sucesso!', 'success');
      window.dispatchEvent(new Event('user-updated'));
      setNewUsername('');
      onClose();
    } catch (err: unknown) {
      setError((err as BackendErrorResponse).response?.data?.detail || 'Erro ao alterar nome de usuário.');
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
      setError((err as BackendErrorResponse).response?.data?.detail || 'Erro ao alterar senha.');
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
      setError((err as BackendErrorResponse).response?.data?.detail || 'Erro ao desativar conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        </div>
      </div>
    </Modal>
  );
}
