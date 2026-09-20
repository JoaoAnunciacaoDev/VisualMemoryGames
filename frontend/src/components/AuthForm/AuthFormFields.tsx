import { Input } from '@/components/Shared';
import type { useAuthForm } from './useAuthForm';
import styles from './AuthForm.module.css';

type Controller = ReturnType<typeof useAuthForm>;

function CodeResend({ controller }: { controller: Controller }) {
  return (
    <button type="button" className={styles.resendButton} onClick={controller.resendCode} disabled={controller.resendCooldown > 0 || controller.isSubmitting}>
      {controller.resendCooldown > 0 ? `Reenviar código em ${controller.resendCooldown}s` : 'Reenviar código'}
    </button>
  );
}

export default function AuthFormFields({ controller, clearError }: { controller: Controller; clearError: () => void }) {
  if (controller.step === 'login' || controller.step === 'register') {
    return (
      <>
        <Input placeholder={controller.step === 'login' ? 'Username ou E-mail' : 'Username'} value={controller.username} onChange={(event) => controller.setUsername(event.target.value)} required disabled={controller.isSubmitting} maxLength={controller.step === 'register' ? 30 : undefined} />
        {controller.step === 'register' && <Input type="email" placeholder="E-mail" value={controller.email} onChange={(event) => controller.setEmail(event.target.value)} required disabled={controller.isSubmitting} />}
        <Input type="password" placeholder="Senha" value={controller.password} onChange={(event) => controller.setPassword(event.target.value)} required disabled={controller.isSubmitting} />
        {controller.step === 'login' && (
          <div className={styles.loginOptions}>
            <label className={styles.rememberMeLabel}><input type="checkbox" checked={controller.rememberMe} onChange={(event) => controller.setRememberMe(event.target.checked)} disabled={controller.isSubmitting} className={styles.rememberMeCheckbox} />Mantenha-me conectado</label>
            <button type="button" className={styles.forgotPasswordButton} onClick={() => { clearError(); controller.setStep('reset_password_initiate'); }} disabled={controller.isSubmitting}>Esqueci minha senha</button>
          </div>
        )}
      </>
    );
  }
  if (controller.step === 'reset_password_initiate') return <><p className={styles.infoText}>Informe o e-mail cadastrado na sua conta para enviarmos o código de redefinição de senha.</p><Input type="email" placeholder="Seu e-mail" value={controller.email} onChange={(event) => controller.setEmail(event.target.value)} required disabled={controller.isSubmitting} /></>;
  const resetting = controller.step === 'reset_password_confirm';
  return (
    <>
      <p className={styles.infoText}>Enviamos um código {resetting ? 'de redefinição de senha ' : 'de verificação '}para o e-mail:<br /><strong>{controller.email}</strong>.<br />Insira o código de 6 dígitos{resetting ? ' e defina sua nova senha abaixo.' : ' para confirmar sua conta.'}</p>
      <Input placeholder="Código de 6 dígitos" value={controller.code} onChange={(event) => controller.setCode(event.target.value.replace(/\D/g, ''))} maxLength={6} required disabled={controller.isSubmitting} />
      {resetting && <Input type="password" placeholder="Nova Senha" value={controller.password} onChange={(event) => controller.setPassword(event.target.value)} required disabled={controller.isSubmitting} />}
      <CodeResend controller={controller} />
    </>
  );
}
