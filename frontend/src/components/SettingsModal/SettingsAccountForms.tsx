import type { FormEvent } from 'react';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import styles from './SettingsModal.module.css';

export type SettingsTab = 'profile' | 'password' | 'deactivate' | 'integrations';

export function SettingsTabs({
  activeTab,
  disabled,
  onChange,
}: {
  activeTab: SettingsTab;
  disabled: boolean;
  onChange: (tab: SettingsTab) => void;
}) {
  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'profile', label: 'Nome de Usuário' },
    { id: 'password', label: 'Alterar Senha' },
    { id: 'deactivate', label: 'Excluir Conta' },
    { id: 'integrations', label: 'Integrações' },
  ];

  return (
    <div className={styles.tabs} role="tablist" aria-label="Configurações de conta">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
          onClick={() => onChange(tab.id)}
          disabled={disabled}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ProfileSettingsForm({
  username,
  isPublic,
  isSubmitting,
  onUsernameChange,
  onVisibilityChange,
  onSubmit,
}: {
  username: string;
  isPublic: boolean;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onVisibilityChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <p className={styles.helpText}>Escolha um novo nome de usuário único para sua conta.</p>
      <label className={styles.label}>
        Novo Nome de Usuário
        <Input
          placeholder="Ex: novo_usuario"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          required
          disabled={isSubmitting}
          maxLength={30}
        />
      </label>

      <div className={styles.visibilityToggle}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => onVisibilityChange(event.target.checked)}
            disabled={isSubmitting}
          />
          <span>Tornar meu perfil público</span>
        </label>
        <p className={styles.helpTextSmall}>
          Perfis públicos podem ser encontrados na aba Social e seus seguidores verão suas atividades.
        </p>
      </div>

      <Button type="submit" disabled={isSubmitting} fullWidth>
        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  );
}

export function PasswordSettingsForm({
  currentPassword,
  newPassword,
  confirmPassword,
  isSubmitting,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isSubmitting: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <p className={styles.helpText}>Para sua segurança, informe sua senha atual para definir a nova senha forte.</p>
      <label className={styles.label}>
        Senha Atual
        <Input
          type="password"
          placeholder="Sua senha atual"
          value={currentPassword}
          onChange={(event) => onCurrentPasswordChange(event.target.value)}
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
          onChange={(event) => onNewPasswordChange(event.target.value)}
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
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </label>
      <Button type="submit" disabled={isSubmitting} fullWidth>
        {isSubmitting ? 'Alterando...' : 'Alterar Senha'}
      </Button>
    </form>
  );
}

export function DeactivateSettingsForm({
  password,
  isSubmitting,
  onPasswordChange,
  onSubmit,
}: {
  password: string;
  isSubmitting: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
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
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </label>
      <Button type="submit" variant="ghost" className={styles.dangerButton} disabled={isSubmitting} fullWidth>
        {isSubmitting ? 'Processando...' : 'Solicitar Exclusão de Conta'}
      </Button>
    </form>
  );
}
