import type { FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import type { SteamAccount } from '@/features/integrations/queries';
import { formatDateTime } from '@/utils/date';
import styles from '../SettingsModal.module.css';
import type { ProviderSectionProps } from './types';

interface Props extends ProviderSectionProps<SteamAccount> {
  profileUrl: string;
  onProfileUrlChange: (value: string) => void;
  onConnect: (event: FormEvent<HTMLFormElement>) => void;
}

export default function SteamIntegrationSection({ accounts, isFetching, onDisconnect, onSync, profileUrl, onProfileUrlChange, onConnect }: Props) {
  return (
    <div className={styles.integrationSection}>
      <h3>Steam</h3>
      <p className={styles.helpText}>
        Conecte uma ou mais contas Steam para importar e sincronizar seus jogos automaticamente.
        <strong> Nota:</strong> O perfil e os &quot;Detalhes do Jogo&quot; devem estar definidos como <strong>Públicos</strong> nas configurações da Steam.
      </p>
      <form onSubmit={onConnect} className={styles.integrationForm}>
        <div className={styles.inputRow}>
          <Input placeholder="URL do perfil Steam ou ID (ex: 7656119...)" value={profileUrl} onChange={(event) => onProfileUrlChange(event.target.value)} disabled={isFetching} required />
          <Button type="submit" disabled={isFetching || !profileUrl.trim()}>{isFetching ? 'Conectando...' : 'Conectar'}</Button>
        </div>
      </form>
      {accounts.length > 0 ? (
        <div className={styles.accountsList}>
          <div className={styles.listHeader}>
            <h4>Contas Conectadas ({accounts.length})</h4>
            <Button variant="ghost" className={styles.syncAllButton} disabled={isFetching} onClick={() => onSync()}><RefreshCw aria-hidden="true" size={16} /> Sincronizar Tudo</Button>
          </div>
          {accounts.map((account) => (
            <div key={account.id} className={account.avatar_url ? styles.accountCard : `${styles.accountCard} ${styles.accountCardNoAvatar}`}>
              <img src={account.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'} alt={account.persona_name || ''} className={account.avatar_url ? styles.accountAvatar : styles.accountAvatarPlaceholder} />
              <div className={styles.accountInfo}>
                <strong>{account.persona_name || 'Usuário Steam'}</strong>
                <span>ID: {account.steam_id}</span>
                {account.last_sync_at && <small>Sincronizado em: {formatDateTime(account.last_sync_at)}</small>}
              </div>
              <div className={styles.accountActions}>
                <Button variant="ghost" className={styles.syncAllButton} disabled={isFetching} onClick={() => onSync(account.id)}><RefreshCw aria-hidden="true" size={16} /></Button>
                <Button variant="ghost" className={styles.disconnectButton} onClick={() => onDisconnect(account.id)}>Desconectar</Button>
              </div>
            </div>
          ))}
        </div>
      ) : <div className={styles.noAccounts}>Nenhuma conta Steam vinculada ainda.</div>}
    </div>
  );
}
