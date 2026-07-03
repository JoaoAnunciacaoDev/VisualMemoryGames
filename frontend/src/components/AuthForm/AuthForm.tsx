import { useState, SyntheticEvent } from 'react';
import Card from '@/components/Shared/Card/Card';
import FormLayout from '@/components/Shared/FormLayout/FormLayout';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import PageTitle from '@/components/Shared/PageTitle/PageTitle';
import styles from './AuthForm.module.css';

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegisterInitiate: (username: string, email: string, password: string) => Promise<void>;
  onRegisterConfirm: (username: string, email: string, password: string, code: string) => Promise<void>;
  onPasswordResetInitiate: (email: string) => Promise<void>;
  onPasswordResetConfirm: (email: string, code: string, new_password: string) => Promise<void>;
  error: string;
  clearError: () => void;
}

type Step = 'login' | 'register' | 'verify' | 'reset_password_initiate' | 'reset_password_confirm';

export default function AuthForm({
  onLogin,
  onRegisterInitiate,
  onRegisterConfirm,
  onPasswordResetInitiate,
  onPasswordResetConfirm,
  error,
  clearError,
}: Props) {
  const [step, setStep] = useState<Step>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    try {
      if (step === 'login') {
        await onLogin(username, password);
      } else if (step === 'register') {
        await onRegisterInitiate(username, email, password);
        setStep('verify');
      } else if (step === 'verify') {
        await onRegisterConfirm(username, email, password, code);
        setCode('');
        setStep('login');
      } else if (step === 'reset_password_initiate') {
        await onPasswordResetInitiate(email);
        setStep('reset_password_confirm');
      } else if (step === 'reset_password_confirm') {
        await onPasswordResetConfirm(email, code, password);
        setPassword('');
        setCode('');
        setStep('login');
      }
    } catch {
      // O erro é tratado no componente pai e exibido via prop 'error'
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = () => {
    clearError();
    if (step === 'login') {
      setStep('register');
    } else if (step === 'register') {
      setStep('login');
    } else if (step === 'verify') {
      setStep('register');
      setCode('');
    } else if (step === 'reset_password_initiate') {
      setStep('login');
    } else if (step === 'reset_password_confirm') {
      setStep('reset_password_initiate');
      setCode('');
    }
  };

  const getTitle = () => {
    if (step === 'login') return 'Entrar no VisualMemory';
    if (step === 'register') return 'Criar nova conta';
    if (step === 'verify') return 'Verificação de E-mail';
    if (step === 'reset_password_initiate') return 'Recuperar Senha';
    return 'Redefinir Senha';
  };

  const getToggleText = () => {
    if (step === 'login') return 'Não tem conta? Registre-se';
    if (step === 'register') return 'Já tem conta? Faça login';
    if (step === 'verify') return 'Voltar para dados de cadastro';
    if (step === 'reset_password_initiate') return 'Voltar para o login';
    return 'Voltar para envio de e-mail';
  };

  return (
    <Card className={styles.authCard}>
      <PageTitle level="h1">{getTitle()}</PageTitle>

      {error && <p className={styles.error}>{error}</p>}

      <FormLayout onSubmit={handleSubmit}>
        {/* Etapas de Login e Registro */}
        {(step === 'login' || step === 'register') && (
          <>
            <Input
              placeholder={step === 'login' ? 'Username ou E-mail' : 'Username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isSubmitting}
              maxLength={step === 'register' ? 30 : undefined}
            />
            {step === 'register' && (
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            )}
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
            {step === 'login' && (
              <button
                type="button"
                className={styles.forgotPasswordButton}
                onClick={() => {
                  clearError();
                  setStep('reset_password_initiate');
                }}
                disabled={isSubmitting}
              >
                Esqueci minha senha
              </button>
            )}
          </>
        )}

        {/* Etapa de verificação do cadastro */}
        {step === 'verify' && (
          <>
            <p className={styles.infoText}>
              Enviamos um código de verificação para o e-mail: <br />
              <strong>{email}</strong>. <br />
              Insira o código de 6 dígitos para confirmar sua conta.
            </p>
            <Input
              placeholder="Código de 6 dígitos"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              required
              disabled={isSubmitting}
            />
          </>
        )}

        {/* Etapa 1 da recuperação de senha (Inserir e-mail) */}
        {step === 'reset_password_initiate' && (
          <>
            <p className={styles.infoText}>
              Informe o e-mail cadastrado na sua conta para enviarmos o código de redefinição de senha.
            </p>
            <Input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </>
        )}

        {/* Etapa 2 da recuperação de senha (Inserir código e nova senha) */}
        {step === 'reset_password_confirm' && (
          <>
            <p className={styles.infoText}>
              Enviamos um código de redefinição de senha para o e-mail: <br />
              <strong>{email}</strong>. <br />
              Insira o código de 6 dígitos e defina sua nova senha abaixo.
            </p>
            <Input
              placeholder="Código de 6 dígitos"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              required
              disabled={isSubmitting}
            />
            <Input
              type="password"
              placeholder="Nova Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </>
        )}

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting
            ? 'Carregando...'
            : step === 'login'
            ? 'Entrar'
            : step === 'register'
            ? 'Enviar Código'
            : step === 'verify'
            ? 'Confirmar Código'
            : step === 'reset_password_initiate'
            ? 'Enviar Código'
            : 'Redefinir Senha'}
        </Button>
      </FormLayout>

      <Button
        variant="ghost"
        fullWidth
        className={styles.toggleButton}
        onClick={handleToggleMode}
        disabled={isSubmitting}
      >
        {getToggleText()}
      </Button>
    </Card>
  );
}