import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
    } else {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return <p style={{ padding: '20px' }}>Carregando a sua biblioteca...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
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
      
      <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px', textAlign: 'center' }}>
        <p>Acesso Autorizado! O seu Token JWT está funcionando perfeitamente.</p>
        <p style={{ color: '#555', fontSize: '14px' }}>Aqui vai ficar a sua lista de jogos e tier lists.</p>
      </div>
    </div>
  );
}