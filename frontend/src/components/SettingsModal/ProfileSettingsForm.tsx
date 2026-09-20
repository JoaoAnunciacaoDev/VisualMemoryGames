import type { FormEvent } from 'react';
import { Button, Input } from '@/components/Shared';
import styles from './SettingsModal.module.css';

interface ProfileSettingsFormProps {
  username: string;
  isPublic: boolean;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onVisibilityChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function ProfileSettingsForm({
  username,
  isPublic,
  isSubmitting,
  onUsernameChange,
  onVisibilityChange,
  onSubmit,
}: ProfileSettingsFormProps) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <p className={styles.helpText}>
        Escolha um novo nome de usuário único para sua conta.
      </p>
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
          Perfis públicos podem ser encontrados na aba Social e seus seguidores verão suas
          atividades.
        </p>
      </div>
      <Button type="submit" disabled={isSubmitting} fullWidth>
        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  );
}
