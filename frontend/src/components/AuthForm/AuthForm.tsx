import { Button, Card, FormLayout, PageTitle } from '@/components/Shared';
import AuthFormFields from './AuthFormFields';
import { useAuthForm, type AuthFormProps } from './useAuthForm';
import styles from './AuthForm.module.css';

export default function AuthForm(props: AuthFormProps) {
  const controller = useAuthForm(props);
  return (
    <Card className={styles.authCard}>
      <PageTitle level="h1">{controller.content.title}</PageTitle>
      {props.error && <p className={styles.error}>{props.error}</p>}
      <FormLayout onSubmit={controller.submit}>
        <AuthFormFields controller={controller} clearError={props.clearError} />
        <Button type="submit" fullWidth disabled={controller.isSubmitting}>
          {controller.isSubmitting ? 'Carregando...' : controller.content.submit}
        </Button>
      </FormLayout>
      <Button variant="ghost" fullWidth className={styles.toggleButton} onClick={controller.toggleMode} disabled={controller.isSubmitting}>
        {controller.content.toggle}
      </Button>
    </Card>
  );
}
