import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';

import api from '../../services/api';

import SearchBar from '../../components/SearchBar/SearchBar';
import GameCard from '../../components/GameCard/GameCard';
import GameGrid from '../../components/GameGrid/GameGrid';
import GameModal from '../../components/GameModal/GameModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import Toast from '../../components/Toast/Toast';

import styles from './Dashboard.module.css';

interface GameResult {
  external_id: number;
  title: string;
  cover_url: string;
  release_year: number | null;
  platforms: string[];
  genres: string[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [searchResults, setSearchResults] = useState<GameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedGames, setAddedGames] = useState<Map<number, string>>(new Map());
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [gameToRemove, setGameToRemove] = useState<number | null>(null);

  const loadUserLibrary = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const meResponse = await api.get('/users/me', { headers });
      const userId = meResponse.data.id;

      const libraryResponse = await api.get(`/user-games/user/${userId}`, { headers });

      const externalIdToUserGameId = new Map<number, string>(
        libraryResponse.data.map((ug: any) => [ug.external_id, ug.id])
      );

      setAddedGames(externalIdToUserGameId);
    } catch {
      navigate('/login');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    loadUserLibrary().finally(() => setLoadingAuth(false));
  }, [navigate]);

  const handleAddGame = async (game: GameResult) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const gameResponse = await api.post('/games/', {
        external_id: game.external_id,
        title: game.title,
        cover_url: game.cover_url,
        release_year: game.release_year,
        platforms: game.platforms,
        genres: game.genres,
      }, { headers });

      await api.post('/user-games/', { game_id: gameResponse.data.id }, { headers });
      await loadUserLibrary();
      showToast('Jogo adicionado à biblioteca!', 'success');

    } catch (err: any) {
      if (err.response?.status === 400) {
        try {
          const token = localStorage.getItem('token');
          const headers = { Authorization: `Bearer ${token}` };
          const gamesResponse = await api.get('/games/', { headers });
          const existing = gamesResponse.data.find((g: any) => g.external_id === game.external_id);

          if (existing) {
            await api.post('/user-games/', { game_id: existing.id }, { headers });
            await loadUserLibrary();
            showToast('Jogo adicionado à biblioteca!', 'success');
          }
        } catch {
          showToast('Erro ao adicionar jogo.', 'error');
        }
      } else {
        showToast('Erro ao adicionar jogo.', 'error');
      }
    }
  };

  const handleRemoveClick = (externalId: number) => {
    setGameToRemove(externalId);
  };

  const confirmRemove = async () => {
    if (gameToRemove === null) return;

    try {
      const token = localStorage.getItem('token');
      const userGameId = addedGames.get(gameToRemove);

      await api.delete(`/user-games/${userGameId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await loadUserLibrary();
      setSelectedGame(null);
      showToast('Jogo removido da biblioteca.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    } finally {
      setGameToRemove(null);
    }
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await api.get(`/games/search?q=${query}`);
      setSearchResults(response.data.results || response.data);
    } catch {
      showToast('Não foi possível buscar os jogos.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loadingAuth) return <p>Verificando credenciais...</p>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>Adicione jogos a sua Biblioteca</h2>
      </header>
      <hr className={styles.divider} />
      <SearchBar onSearch={handleSearch} isSearching={isSearching} />
      <GameGrid>
        {searchResults.map((game) => (
          <GameCard
            key={game.external_id}
            title={game.title}
            coverUrl={game.cover_url}
            releaseYear={game.release_year}
            isAdded={addedGames.has(game.external_id)}
            onAdd={() => handleAddGame(game)}
            onRemove={() => handleRemoveClick(game.external_id)}
            onClick={() => setSelectedGame(game)}
          />
        ))}
      </GameGrid>
      {searchResults.length === 0 && !isSearching && (
        <div className={styles.emptyState}>
          Pesquise por um título para adicionar à sua coleção.
        </div>
      )}
      <GameModal
        game={selectedGame ? {
          title: selectedGame.title,
          coverUrl: selectedGame.cover_url,
          releaseYear: selectedGame.release_year,
          platforms: selectedGame.platforms,
          genres: selectedGame.genres,
        } : null}
        
        isAdded={selectedGame ? addedGames.has(selectedGame.external_id) : false}
        
        onClose={() => setSelectedGame(null)}
        onAdd={() => selectedGame && handleAddGame(selectedGame)}
        onRemove={() => selectedGame && handleRemoveClick(selectedGame.external_id)}
      />

      <ConfirmModal
        isOpen={gameToRemove !== null}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da sua biblioteca? Você perderá todos os dados salvos sobre ele."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmRemove}
        onCancel={() => setGameToRemove(null)}
      />
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}