import { useState, type SyntheticEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  changeAccountPassword,
  deactivateAccount,
  updateAccountProfile,
} from '@/features/account/mutations';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { parseSettingsError } from './settingsErrors';
import type { SettingsTab } from './settingsTypes';

export function useSettingsAccount(onClose: () => void, onLogout: () => void) {
  const { showToast } = useToast();
  const { user, reloadUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [isPublic, setIsPublic] = useState(user?.is_public ?? false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [error, setError] = useState('');
  const profileMutation = useMutation({ mutationFn: updateAccountProfile });
  const passwordMutation = useMutation({ mutationFn: changeAccountPassword });
  const deactivateMutation = useMutation({ mutationFn: deactivateAccount });
  const isSubmitting =
    profileMutation.isPending || passwordMutation.isPending || deactivateMutation.isPending;

  const changeTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setError('');
  };

  const updateProfile = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!newUsername.trim()) return;
    setError('');
    try {
      await profileMutation.mutateAsync({
        username: newUsername.trim() !== user?.username ? newUsername.trim() : undefined,
        isPublic: isPublic !== user?.is_public ? isPublic : undefined,
      });
      showToast('Perfil atualizado com sucesso!', 'success');
      await reloadUser();
      onClose();
    } catch (failure: unknown) {
      setError(parseSettingsError(failure, 'Erro ao atualizar perfil.'));
    }
  };

  const changePassword = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setError('');
    try {
      await passwordMutation.mutateAsync({ currentPassword, newPassword });
      showToast('Senha alterada com sucesso!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (failure: unknown) {
      setError(parseSettingsError(failure, 'Erro ao alterar senha.'));
    }
  };

  const deactivate = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!deactivatePassword) return;
    setError('');
    try {
      await deactivateMutation.mutateAsync(deactivatePassword);
      showToast('Conta desativada. Seus dados serão mantidos por 15 dias.', 'info');
      setDeactivatePassword('');
      onClose();
      onLogout();
    } catch (failure: unknown) {
      setError(parseSettingsError(failure, 'Erro ao desativar conta.'));
    }
  };

  return {
    activeTab,
    changeTab,
    error,
    setError,
    isSubmitting,
    profile: {
      username: newUsername,
      setUsername: setNewUsername,
      isPublic,
      setIsPublic,
      submit: updateProfile,
    },
    password: {
      currentPassword,
      setCurrentPassword,
      newPassword,
      setNewPassword,
      confirmPassword,
      setConfirmPassword,
      submit: changePassword,
    },
    deactivation: {
      password: deactivatePassword,
      setPassword: setDeactivatePassword,
      submit: deactivate,
    },
  };
}
