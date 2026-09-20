import { useEffect, useState, type SyntheticEvent } from 'react';

export interface AuthFormProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  onRegisterInitiate: (username: string, email: string, password: string) => Promise<void>;
  onRegisterConfirm: (username: string, email: string, password: string, code: string) => Promise<void>;
  onPasswordResetInitiate: (email: string) => Promise<void>;
  onPasswordResetConfirm: (email: string, code: string, newPassword: string) => Promise<void>;
  error: string;
  clearError: () => void;
}

export type AuthStep = 'login' | 'register' | 'verify' | 'reset_password_initiate' | 'reset_password_confirm';

const STEP_CONTENT: Record<AuthStep, { title: string; toggle: string; submit: string }> = {
  login: { title: 'Entrar no VisualMemory', toggle: 'Não tem conta? Registre-se', submit: 'Entrar' },
  register: { title: 'Criar nova conta', toggle: 'Já tem conta? Faça login', submit: 'Enviar Código' },
  verify: { title: 'Verificação de E-mail', toggle: 'Voltar para dados de cadastro', submit: 'Confirmar Código' },
  reset_password_initiate: { title: 'Recuperar Senha', toggle: 'Voltar para o login', submit: 'Enviar Código' },
  reset_password_confirm: { title: 'Redefinir Senha', toggle: 'Voltar para envio de e-mail', submit: 'Redefinir Senha' },
};

export function useAuthForm(actions: AuthFormProps) {
  const [step, setStep] = useState<AuthStep>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const run = async (action: () => Promise<void>) => {
    actions.clearError();
    setIsSubmitting(true);
    try { await action(); } catch { /* Error state is owned by the parent. */ }
    finally { setIsSubmitting(false); }
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    await run(async () => {
      if (step === 'login') await actions.onLogin(username, password, rememberMe);
      else if (step === 'register') { await actions.onRegisterInitiate(username, email, password); setStep('verify'); }
      else if (step === 'verify') { await actions.onRegisterConfirm(username, email, password, code); setCode(''); setStep('login'); }
      else if (step === 'reset_password_initiate') { await actions.onPasswordResetInitiate(email); setStep('reset_password_confirm'); }
      else { await actions.onPasswordResetConfirm(email, code, password); setPassword(''); setCode(''); setStep('login'); }
    });
  };

  const resendCode = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    await run(async () => {
      if (step === 'verify') await actions.onRegisterInitiate(username, email, password);
      else if (step === 'reset_password_confirm') await actions.onPasswordResetInitiate(email);
      setResendCooldown(60);
    });
  };

  const toggleMode = () => {
    actions.clearError();
    setCode('');
    setStep((current) => {
      if (current === 'login') return 'register';
      if (current === 'register' || current === 'verify') return current === 'register' ? 'login' : 'register';
      return current === 'reset_password_initiate' ? 'login' : 'reset_password_initiate';
    });
  };

  return {
    step, setStep, username, setUsername, email, setEmail, password, setPassword,
    code, setCode, rememberMe, setRememberMe, isSubmitting, resendCooldown,
    content: STEP_CONTENT[step], submit, resendCode, toggleMode,
  };
}
