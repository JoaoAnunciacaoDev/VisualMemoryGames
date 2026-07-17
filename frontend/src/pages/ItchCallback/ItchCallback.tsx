import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import api from '../../services/api';
import styles from './ItchCallback.module.css';

export default function ItchCallback() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const hasFetched = useRef(false);
  const status = 'Processando autenticação...';

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // A URL da itch.io com implicit flow retorna o token no hash (ex: #access_token=xyz)
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');

    if (!accessToken) {
      showToast('Falha na autenticação com Itch.io. Token não encontrado.', 'error');
      navigate('/profile');
      return;
    }

    const connectAccount = async () => {
      try {
        await api.post('/users/me/itch/accounts', { access_token: accessToken });
        showToast('Conta Itch.io conectada e biblioteca importada!', 'success');
        
        // Notifica outros componentes se estiverem abertos
        window.dispatchEvent(new Event('itch-synced'));
        
        navigate('/profile');
      } catch (err: unknown) {
        console.error(err);
        const errorObj = err as { response?: { data?: { detail?: string } } };
        const msg = errorObj.response?.data?.detail || 'Erro ao conectar conta Itch.io.';
        showToast(msg, 'error');
        navigate('/profile');
      }
    };

    connectAccount();
  }, [navigate, showToast]);

  return (
    <div className={styles.container}>
      <div className={styles.messageCard}>
        <h2>{status}</h2>
        <p>Por favor aguarde enquanto sincronizamos sua biblioteca...</p>
      </div>
    </div>
  );
}
