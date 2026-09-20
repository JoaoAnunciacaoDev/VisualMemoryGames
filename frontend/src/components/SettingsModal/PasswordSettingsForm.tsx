import type { FormEvent } from 'react';
import { Button, Input } from '@/components/Shared';
import styles from './SettingsModal.module.css';

interface PasswordSettingsFormProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isSubmitting: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function PasswordSettingsForm({
  currentPassword,
  newPassword,
  confirmPassword,
  isSubmitting,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: PasswordSettingsFormProps) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <p className={styles.helpText}>
        Para sua segurança, informe sua senha atual para definir a nova senha forte.
      </p>
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
