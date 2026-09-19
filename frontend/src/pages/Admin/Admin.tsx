import { useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ConfirmModal, Input, Loader, PageTitle } from '@/components/Shared';
import { validateAdminSearch } from '@/app/search';
import { adminDashboardQuery } from '@/features/admin/queries';
import AdminStats from './AdminStats';
import AdminUserTable from './AdminUserTable';
import { useAdminActions } from './useAdminActions';
import styles from './Admin.module.css';

export default function Admin() {
  const navigate = useNavigate();
  const { q: searchTerm } = validateAdminSearch(useSearch({ strict: false }) as Record<string, unknown>);
  const dashboardQuery = useQuery(adminDashboardQuery(useDeferredValue(searchTerm)));
  const actions = useAdminActions();

  return (
    <div className={styles.container}>
      <PageTitle level="h1">Painel Administrativo</PageTitle>
      {dashboardQuery.data?.stats && <AdminStats stats={dashboardQuery.data.stats} />}
      <div className={styles.controlsRow}>
        <div className={styles.searchBox}>
          <Input placeholder="Buscar por nome ou e-mail..." value={searchTerm} onChange={(event) => void navigate({ to: '/admin', replace: true, search: { q: event.target.value } })} />
        </div>
      </div>
      <div className={styles.tableContainer}>
        {dashboardQuery.isPending
          ? <Loader message="Carregando lista de usuários..." />
          : <AdminUserTable users={dashboardQuery.data?.users ?? []} onToggleAdmin={actions.toggleAdmin} onToggleActive={actions.toggleActive} onDelete={actions.setDeletingUser} />}
      </div>
      <ConfirmModal
        isOpen={!!actions.deletingUser}
        title="Confirmar Exclusão Permanente"
        message={`Tem certeza que deseja deletar permanentemente o usuário ${actions.deletingUser?.username ?? ''} e todos os seus dados? Esta ação não pode ser desfeita.`}
        confirmText={actions.isDeleting ? 'Excluindo...' : 'Excluir Permanentemente'}
        cancelText="Cancelar"
        onConfirm={actions.confirmDelete}
        onCancel={() => actions.setDeletingUser(null)}
        isDestructive
      />
    </div>
  );
}
