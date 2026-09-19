import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageTitle, Button, Input, Loader } from '@/components/Shared';
import { useToast } from '@/hooks/useToast';
import { User } from '@/types';
import styles from './Admin.module.css';
import { formatDateTime, formatDate } from '@/utils/date';
import {
  adminDashboardQuery,
  adminKeys,
  deleteUser,
  toggleUserActive,
  toggleUserAdmin,
} from '@/features/admin/queries';

export default function Admin() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const dashboardQuery = useQuery(adminDashboardQuery(search));
  const users = dashboardQuery.data?.users ?? [];
  const stats = dashboardQuery.data?.stats ?? null;

  // Debounce do termo de busca para reduzir carga do servidor
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modal de confirmação para exclusão permanente
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');

  const invalidateDashboard = () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
  const toggleActiveMutation = useMutation({ mutationFn: toggleUserActive, onSuccess: invalidateDashboard });
  const toggleAdminMutation = useMutation({ mutationFn: toggleUserAdmin, onSuccess: invalidateDashboard });
  const deleteMutation = useMutation({ mutationFn: deleteUser, onSuccess: invalidateDashboard });

  // 3. Ações rápidas
  const handleToggleActive = (user: User) => {
    toggleActiveMutation.mutate(user.id, {
      onSuccess: (data) => {
        showToast(
          `Conta de ${user.username} foi ${data.is_deleted ? 'desativada' : 'ativada'} com sucesso!`,
          'success'
        );
      },
      onError: () => showToast('Erro ao alterar status da conta.', 'error'),
    });
  };

  const handleToggleAdmin = (user: User) => {
    toggleAdminMutation.mutate(user.id, {
      onSuccess: (data) => {
        showToast(
          `Privilégios de admin de ${user.username} foram ${data.is_admin ? 'concedidos' : 'revogados'}!`,
          'success'
        );
      },
      onError: () => showToast('Erro ao alterar privilégios administrativos.', 'error'),
    });
  };

  const handleDeleteClick = (user: User) => {
    setDeleteConfirmId(user.id);
    setDeleteConfirmUsername(user.username);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;

    deleteMutation.mutate(deleteConfirmId, {
      onSuccess: () => {
        showToast(`Usuário ${deleteConfirmUsername} excluído permanentemente!`, 'success');
        setDeleteConfirmId(null);
      },
      onError: () => showToast('Erro ao excluir usuário permanentemente.', 'error'),
    });
  };

  return (
    <div className={styles.container}>
      <PageTitle level="h1">Painel Administrativo</PageTitle>

      {/* Estatísticas Rápidas */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statTitle}>Total de Usuários</span>
            <span className={styles.statValue}>{stats.total_users}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statTitle}>Usuários Ativos</span>
            <span className={styles.statValue}>{stats.active_users}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statTitle}>Usuários Desativados</span>
            <span className={styles.statValue}>{stats.inactive_users}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statTitle}>Administradores</span>
            <span className={styles.statValue}>{stats.admin_users}</span>
          </div>
        </div>
      )}

      {/* Barra de Busca */}
      <div className={styles.controlsRow}>
        <div className={styles.searchBox}>
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className={styles.tableContainer}>
        {dashboardQuery.isPending ? (
          <Loader message="Carregando lista de usuários..." />
        ) : users.length === 0 ? (
          <p className={styles.emptyText}>Nenhum usuário correspondente encontrado.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Usuário</th>
                  <th className={styles.th}>Cargo</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Jogos</th>
                  <th className={styles.th}>Último Acesso</th>
                  <th className={styles.th}>Data de Cadastro</th>
                  <th className={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.usernameCell}>
                        <span className={styles.username}>{u.username}</span>
                        <span className={styles.email}>{u.email}</span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${u.is_admin ? styles.adminBadge : styles.userBadge}`}>
                        {u.is_admin ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${!u.is_deleted ? styles.activeBadge : styles.inactiveBadge}`}>
                        {!u.is_deleted ? 'Ativo' : 'Desativado'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.gamesCount}>{u.games_count ?? 0}</span>
                    </td>
                    <td className={styles.td}>
                      {u.last_active_at ? formatDateTime(u.last_active_at) : 'Nunca'}
                    </td>
                    <td className={styles.td}>
                      {formatDate(u.created_at)}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${u.is_admin ? styles.actionButtonActive : ''}`}
                          onClick={() => handleToggleAdmin(u)}
                        >
                          {u.is_admin ? 'Revogar Admin' : 'Tornar Admin'}
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${u.is_deleted ? styles.actionButtonActive : styles.actionButtonInactive}`}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.is_deleted ? 'Ativar Conta' : 'Desativar'}
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDeleteClick(u)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Simples de Confirmação de Exclusão */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f87171' }}>
              Confirmar Exclusão Permanente
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Tem certeza que deseja deletar permanentemente o usuário <strong>{deleteConfirmUsername}</strong> e todos os seus dados? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
