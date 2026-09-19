import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import styles from './ItchCallback.module.css';
import { connectItchAccount } from '@/features/integrations/mutations';
import { integrationKeys } from '@/features/integrations/queries';
import { libraryKeys } from '@/features/library/queries';

export default function ItchCallback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const hasFetched = useRef(false);
  const status = 'Processando autenticação...';
  const { mutateAsync: connectItch } = useMutation({
    mutationFn: connectItchAccount,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: integrationKeys.itch() }),
      queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
    ]),
  });

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // A URL da itch.io com implicit flow retorna o token no hash (ex: #access_token=xyz)
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');

    if (!accessToken) {
      showToast('Falha na autenticação com Itch.io. Token não encontrado.', 'error');
      navigate({ to: '/profile' });
      return;
    }

    const connectAccount = async () => {
      try {
        await connectItch(accessToken);
        showToast('Conta Itch.io conectada e biblioteca importada!', 'success');
        navigate({ to: '/profile' });
      } catch (err: unknown) {
        console.error(err);
        const errorObj = err as { response?: { data?: { detail?: string } } };
        const msg = errorObj.response?.data?.detail || 'Erro ao conectar conta Itch.io.';
        showToast(msg, 'error');
        navigate({ to: '/profile' });
      }
    };

    connectAccount();
  }, [connectItch, navigate, showToast]);

  return (
    <div className={styles.container}>
      <div className={styles.messageCard}>
        <h2>{status}</h2>
        <p>Por favor aguarde enquanto sincronizamos sua biblioteca...</p>
      </div>
    </div>
  );
}
