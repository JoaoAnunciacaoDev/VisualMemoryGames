import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';

import api from '../../services/api';

import LibraryCard from '../../components/LibraryCard/LibraryCard';
import GameEditModal from '../../components/GameEditModal/GameEditModal';
import CustomListsTab from '../../components/CustomListTab/CustomListTab';
import Toast from '../../components/Toast/Toast';

import SearchBar from '../../components/SearchBar/SearchBar';
import GameCard from '../../components/GameCard/GameCard';
import GameGrid from '../../components/GameGrid/GameGrid';
import GameModal from '../../components/GameModal/GameModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';

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
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
}

interface GameResult {
  external_id: number;
  title: string;
  cover_url: string;
  release_year: number | null;
  platforms: string[];
  genres: string[];
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

type Tab = 'library' | 'lists' | 'search';
type SortBy = 'rating' | 'started_at' | 'finished_at' | null;

export default function Library() {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('library');

  const [games, setGames] = useState<LibraryGame[]>([]);
  const [selectedLibraryGame, setSelectedLibraryGame] = useState<LibraryGame | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState<SortBy>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [searchResults, setSearchResults] = useState<GameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearchGame, setSelectedSearchGame] = useState<GameResult | null>(null);
  const [gameToRemove, setGameToRemove] = useState<number | null>(null);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const addedGames = useMemo(() => {
    return new Map<number, string>(games.map((g) => [g.external_id, g.id]));
  }, [games]);

  const loadLibrary = async () => {
    try {
      const headers = getAuthHeaders();
      const meResponse = await api.get('/users/me', { headers });
      const id = meResponse.data.id;
      setUserId(id);

      const libraryResponse = await api.get(`/user-games/user/${id}`, { headers });
      setGames(libraryResponse.data);
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
    
    loadLibrary().finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSaveLibraryGame = async (data: {
    status: string;
    rating: number | null;
    started_at: string | null;
    finished_at: string | null;
    notes: string | null;
  }) => {
    if (!selectedLibraryGame) return;

    try {
      await api.put(`/user-games/${selectedLibraryGame.id}`, data, {
        headers: getAuthHeaders()
      });
      await loadLibrary();
      setSelectedLibraryGame(null);
      showToast('Jogo atualizado com sucesso!', 'success');
    } catch {
      showToast('Erro ao salvar alterações.', 'error');
    }
  };

  const filteredGames = games
    .filter((g) => statusFilter === 'Todos' || g.status === statusFilter)
    .filter((g) => g.title.toLowerCase().includes(librarySearch.toLowerCase()))
    .sort((a, b) => {
      if (!sortBy) return 0;

      if (sortBy === 'rating') {
        const aVal = a.rating ?? -1;
        const bVal = b.rating ?? -1;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const dateField = sortBy;
      const aDate = a[dateField] ? new Date(a[dateField] as string).getTime() : 0;
      const bDate = b[dateField] ? new Date(b[dateField] as string).getTime() : 0;

      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    });

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

  const handleAddGame = async (game: GameResult) => {
    try {
      const headers = getAuthHeaders();

      const gameResponse = await api.post('/games/', {
        external_id: game.external_id,
        title: game.title,
        cover_url: game.cover_url,
        release_year: game.release_year,
        platforms: game.platforms,
        genres: game.genres,
      }, { headers });

      await api.post('/user-games/', { game_id: gameResponse.data.id }, { headers });
      await loadLibrary();
      showToast('Jogo adicionado à biblioteca!', 'success');

    } catch (err: any) {
      if (err.response?.status === 400) {
        try {
          const headers = getAuthHeaders();
          const gamesResponse = await api.get('/games/', { headers });
          const existing = gamesResponse.data.find((g: any) => g.external_id === game.external_id);

          if (existing) {
            await api.post('/user-games/', { game_id: existing.id }, { headers });
            await loadLibrary();
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
      const userGameId = addedGames.get(gameToRemove);

      await api.delete(`/user-games/${userGameId}`, {
        headers: getAuthHeaders()
      });

      await loadLibrary();
      setSelectedSearchGame(null);
      showToast('Jogo removido da biblioteca.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    } finally {
      setGameToRemove(null);
    }
  };

  if (loading) return <p>Carregando biblioteca...</p>;

  return (
    <div className={styles.page}>
      
      <header className={styles.header}>
        <h2 className={styles.heading}>Minha Biblioteca</h2>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'library' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('library')}
        >
          Meus Jogos
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'search' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Pesquisar / Adicionar
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'lists' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('lists')}
        >
          Minhas Listas
        </button>
      </div>

      {activeTab === 'library' && (
        <>
          <div className={styles.controls}>
            <input
              type="text"
              placeholder="Pesquisar na biblioteca..."
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
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
              onChange={(e) =>
                setSortBy(e.target.value === '' ? null : (e.target.value as Exclude<SortBy, null>))
              }
              className={styles.select}
            >
              <option value="">Ordenar por</option>
              <option value="rating">Nota</option>
              <option value="started_at">Data de início</option>
              <option value="finished_at">Data de término</option>
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
                ? 'Sua biblioteca está vazia. Vá na aba "Pesquisar / Adicionar" para buscar jogos!'
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
                  startedAt={game.started_at}
                  finishedAt={game.finished_at}
                  onClick={() => setSelectedLibraryGame(game)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'search' && (
        <>
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
                onClick={() => setSelectedSearchGame(game)}
              />
            ))}
          </GameGrid>
          
          {searchResults.length === 0 && !isSearching && (
            <div className={styles.emptyState}>
              Pesquise por um título para adicionar à sua coleção.
            </div>
          )}
        </>
      )}

      {activeTab === 'lists' && (
        <CustomListsTab userId={userId} libraryGames={games} />
      )}

      {selectedLibraryGame && (
        <GameEditModal
          userGameId={selectedLibraryGame.id}
          title={selectedLibraryGame.title}
          coverUrl={selectedLibraryGame.cover_url}
          initialStatus={selectedLibraryGame.status}
          initialRating={selectedLibraryGame.rating}
          initialStartedAt={selectedLibraryGame.started_at}
          initialFinishedAt={selectedLibraryGame.finished_at}
          initialNotes={selectedLibraryGame.notes}
          onSave={handleSaveLibraryGame}
          onClose={() => setSelectedLibraryGame(null)}
        />
      )}

      <GameModal
        game={selectedSearchGame ? {
          title: selectedSearchGame.title,
          coverUrl: selectedSearchGame.cover_url,
          releaseYear: selectedSearchGame.release_year,
          platforms: selectedSearchGame.platforms,
          genres: selectedSearchGame.genres,
        } : null}
        isAdded={selectedSearchGame ? addedGames.has(selectedSearchGame.external_id) : false}
        onClose={() => setSelectedSearchGame(null)}
        onAdd={() => selectedSearchGame && handleAddGame(selectedSearchGame)}
        onRemove={() => selectedSearchGame && handleRemoveClick(selectedSearchGame.external_id)}
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}