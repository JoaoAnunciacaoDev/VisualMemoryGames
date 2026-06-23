import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';

import api from '../../services/api';
import LibraryCard from '../../components/LibraryCard/LibraryCard';
import GameEditModal from '../../components/GameEditModal/GameEditModal';
import CustomListsTab from '../../components/CustomListTab/CustomListTab';
import Toast from '../../components/Toast/Toast';

import styles from './Library.module.css';

interface LibraryGame {
  id: string;
  game_id: string;
  external_id: number;
  title: string;
  cover_url: string | null;
  release_year: number | null;
  rating: number | null;
  status: string;
  played_year: number | null;
  notes: string | null;
}

const STATUS_OPTIONS = [
  'Todos',
  'Quero Jogar',
  'Jogando',
  'Zerado',
  'Platinado',
  'Abandonado',
  'Em Espera',
];

type Tab = 'library' | 'lists';

export default function Library() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<LibraryGame | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState<'rating' | 'played_year' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadLibrary = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const meResponse = await api.get('/users/me', { headers });
      const id = meResponse.data.id;
      setUserId(id);

      const libraryResponse = await api.get(`/user-games/user/${id}`, { headers });
      setGames(libraryResponse.data);
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    loadLibrary();
  }, [navigate]);

  const handleSave = async (data: {
    status: string;
    rating: number | null;
    played_year: number | null;
    notes: string | null;
  }) => {
    try {
      const token = localStorage.getItem('token');
      await api.put(`/user-games/${selectedGame!.id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadLibrary();
      setSelectedGame(null);
      showToast('Jogo atualizado com sucesso!', 'success');
    } catch {
      showToast('Erro ao salvar alterações.', 'error');
    }
  };

  const filteredGames = games
    .filter((g) => statusFilter === 'Todos' || g.status === statusFilter)
    .filter((g) => g.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortBy) return 0;
      const aVal = a[sortBy] ?? -1;
      const bVal = b[sortBy] ?? -1;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  if (loading) return <p>Carregando biblioteca...</p>;

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Minha Biblioteca</h2>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'library' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('library')}
        >
          Jogos
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'lists' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('lists')}
        >
          Minhas Listas
        </button>
      </div>

      {activeTab === 'library' ? (
        <>
          <div className={styles.controls}>
            <input
              type="text"
              placeholder="Pesquisar na biblioteca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.select}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={sortBy ?? ''}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'played_year' | null || null)}
              className={styles.select}
            >
              <option value="">Ordenar por...</option>
              <option value="rating">Nota</option>
              <option value="played_year">Ano jogado</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className={styles.select}
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </div>

          {filteredGames.length === 0 ? (
            <div className={styles.emptyState}>
              {games.length === 0
                ? 'Sua biblioteca está vazia. Adicione jogos pelo Dashboard!'
                : 'Nenhum jogo encontrado com os filtros aplicados.'}
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredGames.map((game) => (
                <LibraryCard
                  key={game.id}
                  title={game.title}
                  coverUrl={game.cover_url}
                  status={game.status}
                  rating={game.rating}
                  playedYear={game.played_year}
                  onClick={() => setSelectedGame(game)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <CustomListsTab userId={userId} libraryGames={games} />
      )}

      {selectedGame && (
        <GameEditModal
          userGameId={selectedGame.id}
          title={selectedGame.title}
          coverUrl={selectedGame.cover_url}
          initialStatus={selectedGame.status}
          initialRating={selectedGame.rating}
          initialPlayedYear={selectedGame.played_year}
          initialNotes={selectedGame.notes}
          onSave={handleSave}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}