import type { SystemStats } from '@/features/admin/queries';
import styles from './Admin.module.css';

export default function AdminStats({ stats }: { stats: SystemStats }) {
  const items = [
    ['Total de Usuários', stats.total_users], ['Usuários Ativos', stats.active_users],
    ['Usuários Desativados', stats.inactive_users], ['Administradores', stats.admin_users],
  ] as const;
  return <div className={styles.statsGrid}>{items.map(([label, value]) => <div className={styles.statCard} key={label}><span className={styles.statTitle}>{label}</span><span className={styles.statValue}>{value}</span></div>)}</div>;
}
