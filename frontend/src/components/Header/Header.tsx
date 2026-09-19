import { useState, useEffect, MouseEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/Shared/Button/Button';
import SettingsModal from '@/components/SettingsModal/SettingsModal';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/components/Header/Header.module.css';
import { unreadPatchNotesQuery } from '@/features/patch-notes/queries';
import { Megaphone } from 'lucide-react';
import logoIcon from '@/assets/VisualMemoryIcon.png';
import {
  validateAdminSearch,
  validateLibrarySearch,
  validatePatchNotesSearch,
  validateSocialSearch,
} from '@/app/search';

export default function Header() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const isLoggedIn = !!user;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: hasUnread = false } = useQuery({
    ...unreadPatchNotesQuery(),
    enabled: isLoggedIn,
  });

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
        <button type="button" className={styles.logo} onClick={() => navigate({ to: '/' })}>
          <img src={logoIcon} alt="VisualMemory Logo" className={styles.logoIcon} />
          VisualMemory
        </button>
        <nav className={styles.nav}>
          {isLoggedIn && (
            <div className={styles.navLinks}>
              <Button variant="ghost" onClick={() => navigate({
                to: '/library', search: validateLibrarySearch({}),
              })}>
                Biblioteca
              </Button>
              <Button variant="ghost" onClick={() => navigate({ to: '/tierlists' })}>
                TierLists
              </Button>
              <Button variant="ghost" onClick={() => navigate({ to: '/recommendations' })}>
                Recomendações
              </Button>
              <Button variant="ghost" onClick={() => navigate({
                to: '/social', search: validateSocialSearch({}),
              })}>
                Social
              </Button>
              {user?.is_admin && (
                <Button variant="ghost" onClick={() => navigate({
                  to: '/admin', search: validateAdminSearch({}),
                })}>
                  Admin
                </Button>
              )}
            </div>
          )}

          {isLoggedIn ? (
            <div className={styles.navActions}>
              <button
                type="button"
                className={`${styles.megaphoneBtn} ${hasUnread ? styles.hasUnread : ''}`}
                onClick={() => navigate({
                  to: '/patch-notes', search: validatePatchNotesSearch({}),
                })}
                title="Patch Notes"
              >
                <Megaphone aria-hidden="true" size={18} />
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
                      onClick={() => navigate({ to: '/profile' })}
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
            <Button variant="ghost" onClick={() => navigate({ to: '/login' })}>
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
