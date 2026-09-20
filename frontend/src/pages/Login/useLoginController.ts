import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { validateLibrarySearch } from '@/app/search';
import {
  confirmPasswordReset,
  confirmRegistration,
  initiatePasswordReset,
  initiateRegistration,
  loginUser,
} from '@/features/auth/mutations';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { parseAuthError } from './authErrors';

export function useLoginController() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { reloadUser } = useAuth();
  const loginMutation = useMutation({ mutationFn: loginUser });
  const registerInitiateMutation = useMutation({ mutationFn: initiateRegistration });
  const registerConfirmMutation = useMutation({ mutationFn: confirmRegistration });
  const passwordResetInitiateMutation = useMutation({ mutationFn: initiatePasswordReset });
  const passwordResetConfirmMutation = useMutation({ mutationFn: confirmPasswordReset });

  const runAuthStep = async (action: () => Promise<unknown>, successMessage: string) => {
    setError('');
    try {
      await action();
      showToast(successMessage, 'info');
    } catch (failure) {
      setError(parseAuthError(failure));
      throw failure;
    }
  };

  const handleLogin = async (username: string, password: string, rememberMe: boolean) => {
    setError('');
    try {
      await loginMutation.mutateAsync({ username, password, rememberMe });
      await reloadUser();
      navigate({ to: '/library', search: validateLibrarySearch({}) });
    } catch (failure) {
      setError(parseAuthError(failure));
    }
  };

  const handleRegisterInitiate = (username: string, email: string, password: string) =>
    runAuthStep(
      () => registerInitiateMutation.mutateAsync({ username, email, password }),
      'Código de verificação enviado! Verifique seu e-mail.',
    );

  const handleRegisterConfirm = async (
    username: string,
    email: string,
    password: string,
    code: string,
  ) => {
    setError('');
    try {
      await registerConfirmMutation.mutateAsync({ username, email, password, code });
      showToast('Conta criada com sucesso! Faça o login agora.', 'success');
    } catch (failure) {
      setError(parseAuthError(failure));
      throw failure;
    }
  };

  const handlePasswordResetInitiate = (email: string) =>
    runAuthStep(
      () => passwordResetInitiateMutation.mutateAsync(email),
      'Se o e-mail estiver cadastrado, um código foi enviado.',
    );

  const handlePasswordResetConfirm = async (
    email: string,
    code: string,
    newPassword: string,
  ) => {
    setError('');
    try {
      await passwordResetConfirmMutation.mutateAsync({ email, code, newPassword });
      showToast('Senha redefinida com sucesso! Faça login com a nova senha.', 'success');
    } catch (failure) {
      setError(parseAuthError(failure));
      throw failure;
    }
  };

  return {
    error,
    clearError: () => setError(''),
    handleLogin,
    handleRegisterInitiate,
    handleRegisterConfirm,
    handlePasswordResetInitiate,
    handlePasswordResetConfirm,
  };
}
