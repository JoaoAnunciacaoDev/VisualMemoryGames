import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys, deleteUser, toggleUserActive, toggleUserAdmin } from '@/features/admin/queries';
import { useToast } from '@/hooks/useToast';
import type { User } from '@/types';

export function useAdminActions() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
  const activeMutation = useMutation({ mutationFn: toggleUserActive, onSuccess: invalidate });
  const adminMutation = useMutation({ mutationFn: toggleUserAdmin, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteUser, onSuccess: invalidate });

  const toggleActive = (user: User) => activeMutation.mutate(user.id, {
    onSuccess: (data) => showToast(`Conta de ${user.username} foi ${data.is_deleted ? 'desativada' : 'ativada'} com sucesso!`, 'success'),
    onError: () => showToast('Erro ao alterar status da conta.', 'error'),
  });
  const toggleAdmin = (user: User) => adminMutation.mutate(user.id, {
    onSuccess: (data) => showToast(`Privilégios de admin de ${user.username} foram ${data.is_admin ? 'concedidos' : 'revogados'}!`, 'success'),
    onError: () => showToast('Erro ao alterar privilégios administrativos.', 'error'),
  });
  const confirmDelete = () => {
    if (!deletingUser) return;
    deleteMutation.mutate(deletingUser.id, {
      onSuccess: () => { showToast(`Usuário ${deletingUser.username} excluído permanentemente!`, 'success'); setDeletingUser(null); },
      onError: () => showToast('Erro ao excluir usuário permanentemente.', 'error'),
    });
  };

  return { deletingUser, setDeletingUser, toggleActive, toggleAdmin, confirmDelete, isDeleting: deleteMutation.isPending };
}
