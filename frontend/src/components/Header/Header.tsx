import { useState, useEffect, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/Shared/Button/Button';
import SettingsModal from '@/components/SettingsModal/SettingsModal';
import { isAuthenticated } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/components/Header/Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const token = isAuthenticated();
  const { user, loading, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!dropdownOpen) return;
    const closeDropdown = () => setDropdownOpen(false);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
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
    <>
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
              {user?.is_admin && (
                <Button variant="ghost" onClick={() => navigate('/admin')}>
                  Admin
                </Button>
              )}
            </div>
          )}

          {token ? (
            <div className={styles.avatarContainer}>
              <button
                type="button"
                className={`${styles.avatar} ${loading ? styles.avatarLoading : ''}`}
                onClick={handleAvatarClick}
                disabled={loading}
              >
                {loading ? '' : getInitial()}
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
      </header>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}