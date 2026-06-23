import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import SearchBar from '../../components/SearchBar/SearchBar';
import GameCard from '../../components/GameCard/GameCard';
import GameGrid from '../../components/GameGrid/GameGrid';
import styles from './Dashboard.module.css';

interface GameResult {
  external_id: number;
  title: string;
  cover_url: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [searchResults, setSearchResults] = useState<GameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    else setLoadingAuth(false);
  }, [navigate]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await api.get(`/games/search?q=${query}`);
      setSearchResults(response.data.results || response.data);
    } catch {
      alert('Não foi possível buscar os jogos.');
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
        <h2>Sua Biblioteca GameLog 🎮</h2>
        <button className={styles.logoutButton} onClick={handleLogout}>Sair</button>
      </header>
      <hr className={styles.divider} />
      <SearchBar onSearch={handleSearch} isSearching={isSearching} />
      <GameGrid>
        {searchResults.map((game) => (
          <GameCard
            key={game.external_id}
            title={game.title}
            coverUrl={game.cover_url}
            onAdd={() => console.log('Adicionar', game.title)}
          />
        ))}
      </GameGrid>
      {searchResults.length === 0 && !isSearching && (
        <div className={styles.emptyState}>
          Pesquise por um título para adicionar à sua coleção.
        </div>
      )}
    </div>
  );
}