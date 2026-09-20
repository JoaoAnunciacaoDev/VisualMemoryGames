import { RefreshCw } from 'lucide-react';
import Button from '@/components/Shared/Button/Button';
import type { ItchAccount } from '@/features/integrations/queries';
import { formatDateTime } from '@/utils/date';
import styles from '../SettingsModal.module.css';
import type { ProviderSectionProps } from './types';

interface Props extends ProviderSectionProps<ItchAccount> {
  onConnect: () => void;
}

export default function ItchIntegrationSection({ accounts, isFetching, onDisconnect, onSync, onConnect }: Props) {
  return (
    <div className={styles.integrationSection}>
      <h3>Itch.io</h3>
      <p className={styles.helpText}>Conecte sua conta Itch.io para sincronizar sua biblioteca. O redirecionamento utilizará o fluxo seguro do OAuth da itch.io.</p>
      <div className={styles.integrationAction}><Button onClick={onConnect} disabled={isFetching}>Conectar Itch.io via OAuth</Button></div>
      {accounts.length > 0 ? (
        <div className={styles.accountsList}>
          <div className={styles.listHeader}>
            <h4>Contas Conectadas ({accounts.length})</h4>
            <Button variant="ghost" className={styles.syncAllButton} disabled={isFetching} onClick={() => onSync()}><RefreshCw aria-hidden="true" size={16} /> Sincronizar Tudo</Button>
          </div>
          {accounts.map((account) => (
            <div key={account.id} className={account.avatar_url ? styles.accountCard : `${styles.accountCard} ${styles.accountCardNoAvatar}`}>
              <img src={account.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'} alt={account.username || ''} className={account.avatar_url ? styles.accountAvatar : styles.accountAvatarPlaceholder} />
              <div className={styles.accountInfo}>
                <strong>{account.username || 'Usuário Itch'}</strong>
                <span>ID: {account.itch_id}</span>
                {account.last_sync_at && <small>Sincronizado em: {formatDateTime(account.last_sync_at)}</small>}
              </div>
              <div className={styles.accountActions}>
                <Button variant="ghost" className={styles.syncAllButton} disabled={isFetching} onClick={() => onSync(account.id)}><RefreshCw aria-hidden="true" size={16} /></Button>
                <Button variant="ghost" className={styles.disconnectButton} onClick={() => onDisconnect(account.id)}>Desconectar</Button>
              </div>
            </div>
          ))}
        </div>
      ) : <div className={styles.noAccounts}>Nenhuma conta Itch.io vinculada ainda.</div>}
    </div>
  );
}
