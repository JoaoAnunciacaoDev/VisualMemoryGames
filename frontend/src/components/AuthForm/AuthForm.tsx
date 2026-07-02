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
  error: string;
  clearError: () => void;
}

type Step = 'login' | 'register' | 'verify';

export default function AuthForm({
  onLogin,
  onRegisterInitiate,
  onRegisterConfirm,
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
    }
  };

  const getTitle = () => {
    if (step === 'login') return 'Entrar no GameLog';
    if (step === 'register') return 'Criar nova conta';
    return 'Verificação de E-mail';
  };

  const getToggleText = () => {
    if (step === 'login') return 'Não tem conta? Registre-se';
    if (step === 'register') return 'Já tem conta? Faça login';
    return 'Voltar para dados de cadastro';
  };

  return (
    <Card className={styles.authCard}>
      <PageTitle level="h1">{getTitle()}</PageTitle>

      {error && <p className={styles.error}>{error}</p>}

      <FormLayout onSubmit={handleSubmit}>
        {step !== 'verify' && (
          <>
            <Input
              placeholder={step === 'login' ? 'Username ou E-mail' : 'Username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isSubmitting}
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
          </>
        )}

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

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Carregando...' : step === 'login' ? 'Entrar' : step === 'register' ? 'Enviar Código' : 'Confirmar Código'}
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