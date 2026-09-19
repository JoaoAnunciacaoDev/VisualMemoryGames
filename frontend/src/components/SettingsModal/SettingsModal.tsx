import { useState, type SyntheticEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import Modal from '@/components/Shared/Modal/Modal';
import {
  changeAccountPassword,
  deactivateAccount,
  updateAccountProfile,
} from '@/features/account/mutations';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import styles from './SettingsModal.module.css';
import {
  DeactivateSettingsForm,
  PasswordSettingsForm,
  ProfileSettingsForm,
  SettingsTabs,
  type SettingsTab,
} from './SettingsAccountForms';
import SettingsIntegrations from './SettingsIntegrations';
import { parseSettingsError } from './settingsErrors';

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

export default function SettingsModal({ onClose, onLogout }: Props) {
  const { showToast } = useToast();
  const { user, reloadUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [isPublic, setIsPublic] = useState(user?.is_public ?? false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [error, setError] = useState('');

  const profileMutation = useMutation({ mutationFn: updateAccountProfile });
  const passwordMutation = useMutation({ mutationFn: changeAccountPassword });
  const deactivateMutation = useMutation({ mutationFn: deactivateAccount });
  const isSubmitting = profileMutation.isPending || passwordMutation.isPending || deactivateMutation.isPending;

  const handleUpdateProfile = async (event: SyntheticEvent) => {
    event.preventDefault();
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
    } catch (caughtError: unknown) {
      setError(parseSettingsError(caughtError, 'Erro ao atualizar perfil.'));
    }
  };

  const handleChangePassword = async (event: SyntheticEvent) => {
    event.preventDefault();
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
    } catch (caughtError: unknown) {
      setError(parseSettingsError(caughtError, 'Erro ao alterar senha.'));
    }
  };

  const handleDeactivate = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!deactivatePassword) return;
    setError('');

    try {
      await deactivateMutation.mutateAsync(deactivatePassword);
      showToast('Conta desativada. Seus dados serão mantidos por 15 dias.', 'info');
      setDeactivatePassword('');
      onClose();
      onLogout();
    } catch (caughtError: unknown) {
      setError(parseSettingsError(caughtError, 'Erro ao desativar conta.'));
    }
  };

  return (
    <Modal
      open
      onClose={() => !isSubmitting && onClose()}
      maxWidth="500px"
      showCloseButton={!isSubmitting}
      className="scrollbar-visualmemory"
    >
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

          {activeTab === 'integrations' && <SettingsIntegrations setError={setError} />}
        </div>
      </div>
    </Modal>
  );
}
