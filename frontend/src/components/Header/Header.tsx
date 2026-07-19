import { useState, useEffect, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/Shared/Button/Button';
import SettingsModal from '@/components/SettingsModal/SettingsModal';
import { isAuthenticated } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/components/Header/Header.module.css';
import api from '@/services/api';
import { FaBullhorn } from 'react-icons/fa';
import logoIcon from '@/assets/VisualMemoryIcon.png';

export default function Header() {
  const navigate = useNavigate();
  const token = isAuthenticated();
  const { user, loading, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!token) return;

    const checkUnread = async () => {
      try {
        const res = await api.get('/patch-notes/unread');
        setHasUnread(res.data.unread);
      } catch (err) {
        console.error('Erro ao verificar patch notes não lidos:', err);
      }
    };

    checkUnread();

    const handleRead = () => setHasUnread(false);
    window.addEventListener('patches-read', handleRead);
    return () => window.removeEventListener('patches-read', handleRead);
  }, [token]);

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
          <img src={logoIcon} alt="VisualMemory Logo" className={styles.logoIcon} />
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
              <Button variant="ghost" onClick={() => navigate('/recommendations')}>
                Recomendações
              </Button>
              <Button variant="ghost" onClick={() => navigate('/social')}>
                Social
              </Button>
              {user?.is_admin && (
                <Button variant="ghost" onClick={() => navigate('/admin')}>
                  Admin
                </Button>
              )}
            </div>
          )}

          {token ? (
            <div className={styles.navActions}>
              <button
                type="button"
                className={`${styles.megaphoneBtn} ${hasUnread ? styles.hasUnread : ''}`}
                onClick={() => navigate('/patch-notes')}
                title="Patch Notes"
              >
                <FaBullhorn />
              </button>

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