import AuthForm from '@/components/AuthForm/AuthForm';
import { useLoginController } from './useLoginController';

export default function Login() {
  const controller = useLoginController();

  return (
    <AuthForm
      onLogin={controller.handleLogin}
      onRegisterInitiate={controller.handleRegisterInitiate}
      onRegisterConfirm={controller.handleRegisterConfirm}
      onPasswordResetInitiate={controller.handlePasswordResetInitiate}
      onPasswordResetConfirm={controller.handlePasswordResetConfirm}
      error={controller.error}
      clearError={controller.clearError}
    />
  );
}
