import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import api from '../../services/api';
import Toast from '../../components/Toast/Toast';
import styles from './TierList.module.css';

interface TierListSummary {
  id: string;
  title: string;
  categories: { id: string; name: string; color: string; items: any[] }[];
}

export default function TierLists() {
  const navigate = useNavigate();
  const [tierLists, setTierLists] = useState<TierListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const loadTierLists = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const meResponse = await api.get('/users/me', { headers });
      const userId = meResponse.data.id;
      const response = await api.get(`/tierlists/user/${userId}`, { headers });
      setTierLists(response.data);
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    loadTierLists();
  }, [navigate]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/tierlists/', { title: newTitle.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/tierlists/${response.data.id}`);
    } catch {
      showToast('Erro ao criar tier list.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/tierlists/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadTierLists();
      showToast('Tier list deletada.', 'info');
    } catch {
      showToast('Erro ao deletar tier list.', 'error');
    }
  };

  if (loading) return <p>Carregando tier lists...</p>;

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Minhas Tier Lists</h2>

      <div className={styles.createRow}>
        <input
          type="text"
          placeholder="Nome da nova tier list..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className={styles.input}
        />
        <button
          className={styles.createButton}
          onClick={handleCreate}
          disabled={isCreating || !newTitle.trim()}
        >
          {isCreating ? 'Criando...' : '+ Criar'}
        </button>
      </div>

      {tierLists.length === 0 ? (
        <div className={styles.emptyState}>
          Você ainda não tem tier lists. Crie uma acima!
        </div>
      ) : (
        <div className={styles.grid}>
          {tierLists.map((tl) => (
            <div key={tl.id} className={styles.card}>
              <div
                className={styles.cardPreview}
                onClick={() => navigate(`/tierlists/${tl.id}`)}
              >
                {tl.categories.slice(0, 5).map((cat) => (
                  <div
                    key={cat.id}
                    className={styles.previewTier}
                    style={{ backgroundColor: cat.color }}
                  >
                    <span className={styles.previewLabel}>{cat.name}</span>
                    <span className={styles.previewCount}>{cat.items.length} jogos</span>
                  </div>
                ))}
              </div>
              <div className={styles.cardFooter}>
                <span
                  className={styles.cardTitle}
                  onClick={() => navigate(`/tierlists/${tl.id}`)}
                >
                  {tl.title}
                </span>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(tl.id)}
                  title="Deletar"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}