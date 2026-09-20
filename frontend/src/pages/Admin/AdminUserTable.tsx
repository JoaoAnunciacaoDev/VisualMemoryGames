import type { User } from '@/types';
import { formatDate, formatDateTime } from '@/utils/date';
import styles from './Admin.module.css';

export default function AdminUserTable({ users, onToggleAdmin, onToggleActive, onDelete }: { users: User[]; onToggleAdmin: (user: User) => void; onToggleActive: (user: User) => void; onDelete: (user: User) => void }) {
  if (users.length === 0) return <p className={styles.emptyText}>Nenhum usuário correspondente encontrado.</p>;
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead><tr>{['Usuário', 'Cargo', 'Status', 'Jogos', 'Último Acesso', 'Data de Cadastro', 'Ações'].map((heading) => <th key={heading} className={styles.th}>{heading}</th>)}</tr></thead>
        <tbody>{users.map((user) => (
          <tr key={user.id} className={styles.tr}>
            <td className={styles.td}><div className={styles.usernameCell}><span className={styles.username}>{user.username}</span><span className={styles.email}>{user.email}</span></div></td>
            <td className={styles.td}><span className={`${styles.badge} ${user.is_admin ? styles.adminBadge : styles.userBadge}`}>{user.is_admin ? 'Admin' : 'Usuário'}</span></td>
            <td className={styles.td}><span className={`${styles.badge} ${!user.is_deleted ? styles.activeBadge : styles.inactiveBadge}`}>{!user.is_deleted ? 'Ativo' : 'Desativado'}</span></td>
            <td className={styles.td}><span className={styles.gamesCount}>{user.games_count ?? 0}</span></td>
            <td className={styles.td}>{user.last_active_at ? formatDateTime(user.last_active_at) : 'Nunca'}</td>
            <td className={styles.td}>{formatDate(user.created_at)}</td>
            <td className={styles.td}><div className={styles.actions}>
              <button type="button" className={`${styles.actionButton} ${user.is_admin ? styles.actionButtonActive : ''}`} onClick={() => onToggleAdmin(user)}>{user.is_admin ? 'Revogar Admin' : 'Tornar Admin'}</button>
              <button type="button" className={`${styles.actionButton} ${user.is_deleted ? styles.actionButtonActive : styles.actionButtonInactive}`} onClick={() => onToggleActive(user)}>{user.is_deleted ? 'Ativar Conta' : 'Desativar'}</button>
              <button type="button" className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => onDelete(user)}>Excluir</button>
            </div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
