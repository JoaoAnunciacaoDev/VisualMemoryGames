import Modal from '@/components/Shared/Modal/Modal';
import DeactivateSettingsForm from './DeactivateSettingsForm';
import PasswordSettingsForm from './PasswordSettingsForm';
import ProfileSettingsForm from './ProfileSettingsForm';
import SettingsIntegrations from './SettingsIntegrations';
import styles from './SettingsModal.module.css';
import SettingsTabs from './SettingsTabs';
import { useSettingsAccount } from './useSettingsAccount';

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

export default function SettingsModal({ onClose, onLogout }: Props) {
  const account = useSettingsAccount(onClose, onLogout);

  return (
    <Modal
      open
      onClose={() => !account.isSubmitting && onClose()}
      maxWidth="500px"
      showCloseButton={!account.isSubmitting}
      className="scrollbar-visualmemory"
    >
      <div className={styles.settingsContainer}>
        <div className={styles.modalHeader}>
          <h3>Configurações de Conta</h3>
        </div>

        <SettingsTabs
          activeTab={account.activeTab}
          disabled={account.isSubmitting}
          onChange={account.changeTab}
        />

        <div className={styles.modalBody}>
          {account.error && <p className={styles.error}>{account.error}</p>}

          {account.activeTab === 'profile' && (
            <ProfileSettingsForm
              username={account.profile.username}
              isPublic={account.profile.isPublic}
              isSubmitting={account.isSubmitting}
              onUsernameChange={account.profile.setUsername}
              onVisibilityChange={account.profile.setIsPublic}
              onSubmit={account.profile.submit}
            />
          )}

          {account.activeTab === 'password' && (
            <PasswordSettingsForm
              currentPassword={account.password.currentPassword}
              newPassword={account.password.newPassword}
              confirmPassword={account.password.confirmPassword}
              isSubmitting={account.isSubmitting}
              onCurrentPasswordChange={account.password.setCurrentPassword}
              onNewPasswordChange={account.password.setNewPassword}
              onConfirmPasswordChange={account.password.setConfirmPassword}
              onSubmit={account.password.submit}
            />
          )}

          {account.activeTab === 'deactivate' && (
            <DeactivateSettingsForm
              password={account.deactivation.password}
              isSubmitting={account.isSubmitting}
              onPasswordChange={account.deactivation.setPassword}
              onSubmit={account.deactivation.submit}
            />
          )}

          {account.activeTab === 'integrations' && (
            <SettingsIntegrations setError={account.setError} />
          )}
        </div>
      </div>
    </Modal>
  );
}
