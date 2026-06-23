import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';

import api from '../../services/api';
import LibraryCard from '../../components/LibraryCard/LibraryCard';
import GameEditModal from '../../components/GameEditModal/GameEditModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
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

export default function Library() {
  const navigate = useNavigate();
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<LibraryGame | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortOption, setSortOption] = useState<string>('');

  const [gameToRemove, setGameToRemove] = useState<string | null>(null);

  const loadLibrary = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const meResponse = await api.get('/users/me', { headers });
      const userId = meResponse.data.id;

      const libraryResponse = await api.get(`/user-games/user/${userId}`, { headers });
      setGames(libraryResponse.data);
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
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

  const handleRemoveClick = (userGameId: string) => {
    setGameToRemove(userGameId);
  };

  const confirmRemove = async () => {
    if (!gameToRemove) return;

    try {
      const token = localStorage.getItem('token');
      await api.delete(`/user-games/${gameToRemove}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGames(games.filter(g => g.id !== gameToRemove));
      setSelectedGame(null);
      showToast('Jogo removido com sucesso!', 'success');
    } catch {
      showToast('Erro ao remover o jogo.', 'error');
    } finally {
      setGameToRemove(null);
    }
  };

  const filteredGames = games
    .filter((g) => statusFilter === 'Todos' || g.status === statusFilter)
    .filter((g) => g.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortOption) return 0;
      
      const [sortBy, sortOrder] = sortOption.split('-');
      const aVal = a[sortBy as keyof LibraryGame] ?? -1;
      const bVal = b[sortBy as keyof LibraryGame] ?? -1;
      
      return sortOrder === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

  if (loading) return <p>Carregando biblioteca...</p>;

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Minha Biblioteca</h2>

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
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className={styles.select}
        >
          <option value="">Ordenar por Padrão</option>
          <option value="rating-desc">Maior Nota</option>
          <option value="rating-asc">Menor Nota</option>
          <option value="played_year-desc">Jogados mais recentemente</option>
          <option value="played_year-asc">Jogados há mais tempo</option>
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
          onRemove={() => handleRemoveClick(selectedGame.id)}
        />
      )}

      <ConfirmModal
        isOpen={gameToRemove !== null}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da sua biblioteca? Você perderá sua nota e comentário."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmRemove}
        onCancel={() => setGameToRemove(null)}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}