import type { FormEvent } from 'react';
import { Button, Input } from '@/components/Shared';
import styles from './SettingsModal.module.css';

interface DeactivateSettingsFormProps {
  password: string;
  isSubmitting: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function DeactivateSettingsForm({
  password,
  isSubmitting,
  onPasswordChange,
  onSubmit,
}: DeactivateSettingsFormProps) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.alertBox}>
        <strong>Atenção:</strong>
        <p>
          Ao solicitar a exclusão, sua conta e biblioteca ficarão indisponíveis e ocultas. Você
          terá um período de carência de <strong>15 dias</strong> para reativar sua conta
          simplesmente fazendo login novamente. Após os 15 dias, a conta e todos os dados
          associados serão apagados permanentemente.
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
      <Button
        type="submit"
        variant="ghost"
        className={styles.dangerButton}
        disabled={isSubmitting}
        fullWidth
      >
        {isSubmitting ? 'Processando...' : 'Solicitar Exclusão de Conta'}
      </Button>
    </form>
  );
}
