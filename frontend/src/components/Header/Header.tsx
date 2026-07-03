import { useState, useEffect, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/Shared/Button/Button';
import SettingsModal from '@/components/SettingsModal/SettingsModal';
import { clearToken, isAuthenticated } from '@/services/auth';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';
import styles from '@/components/Header/Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const token = isAuthenticated();
  const { showToast } = useToast();

  const [user, setUser] = useState<{ username: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!token || !user) return;

    const hasSyncedThisSession = sessionStorage.getItem('steam_synced_session');
    if (hasSyncedThisSession) return;

    sessionStorage.setItem('steam_synced_session', 'true');

    api.post('/users/me/steam/sync')
      .then((res) => {
        const { new_games_count } = res.data;
        if (new_games_count > 0) {
          showToast(
            `Sincronização Steam: ${new_games_count} novo(s) jogo(s) adicionado(s) à sua biblioteca!`,
            'success'
          );
          window.dispatchEvent(new Event('steam-synced'));
        }
      })
      .catch((err) => {
        console.error('Erro na sincronização automática da Steam:', err);
      });
  }, [token, user, showToast]);

  useEffect(() => {
    let active = true;

    const fetchUser = () => {
      if (token) {
        api.get('/users/me')
          .then((res) => {
            if (active) setUser(res.data);
          })
          .catch(() => {
            if (active) setUser(null);
          });
      } else {
        setUser(null);
      }
    };

    fetchUser();

    const handleUpdate = () => {
      fetchUser();
    };

    window.addEventListener('user-updated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('user-updated', handleUpdate);
    };
  }, [token]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const closeDropdown = () => setDropdownOpen(false);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownOpen]);

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setDropdownOpen(false);
    navigate('/login');
  };

  const handleAvatarClick = (e: MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen((prev) => !prev);
  };

  // Pega a inicial do username
  const getInitial = () => {
    if (!user?.username) return 'U';
    return user.username.charAt(0).toUpperCase();
  };

  return (
    <header className={styles.header}>
      <button type="button" className={styles.logo} onClick={() => navigate('/')}>
        VisualMemory
      </button>
      <nav className={styles.nav}>
        {token && (
          <div className={styles.navLinks}>
            <Button variant="ghost" onClick={() => navigate('/library')}>
              Biblioteca
            </Button>
            <Button variant="ghost" onClick={() => navigate('/tierlists')}>
              TierLists
            </Button>
          </div>
        )}

        {token ? (
          <div className={styles.avatarContainer}>
            <button
              type="button"
              className={styles.avatar}
              onClick={handleAvatarClick}
            >
              {getInitial()}
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => navigate('/profile')}
                >
                  Ver Perfil
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => setSettingsOpen(true)}
                >
                  Configurações
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleLogout}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Entrar
          </Button>
        )}
      </nav>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </header>
  );
}