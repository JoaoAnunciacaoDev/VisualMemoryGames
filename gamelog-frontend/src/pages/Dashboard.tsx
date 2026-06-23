import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface GameResult {
  external_id: number;
  title: string;
  cover_url: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      setLoadingAuth(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSearch = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await api.get(`/games/search?q=${searchQuery}`);
      const gamesList = response.data.results || response.data; 
      setSearchResults(gamesList);
      
    } catch (err) {
      console.error("Erro ao buscar jogos:", err);
      alert('Não foi possível buscar os jogos. Verifique se o backend está rodando!');
    } finally {
      setIsSearching(false);
    }
  };

  if (loadingAuth) return <p style={{ padding: '20px' }}>Verificando credenciais...</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Sua Biblioteca GameLog 🎮</h2>
        <button 
          onClick={handleLogout} 
          style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Sair
        </button>
      </header>
      
      <hr style={{ margin: '20px 0' }} />
      
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="Busque um jogo na RAWG (ex: Elden Ring)..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
        />
        <button 
          type="submit" 
          disabled={isSearching}
          style={{ padding: '12px 24px', cursor: isSearching ? 'wait' : 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px' }}
        >
          {isSearching ? 'Buscando...' : 'Pesquisar'}
        </button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {searchResults.map((game) => (
          <div key={game.external_id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
            
            {game.cover_url ? (
              <img src={game.cover_url} alt={game.title} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '150px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#aaa' }}>Sem Imagem</span>
              </div>
            )}
            
            <div style={{ padding: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{game.title}</h3>
              
              <button style={{ marginTop: '15px', width: '100%', padding: '8px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Adicionar à Biblioteca
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {searchResults.length === 0 && !isSearching && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          Pesquise por um título para adicionar à sua coleção.
        </div>
      )}
    </div>
  );
}