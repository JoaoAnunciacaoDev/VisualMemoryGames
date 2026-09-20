import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/Shared';
import SettingsModal from '@/components/SettingsModal/SettingsModal';
import { unreadPatchNotesQuery } from '@/features/patch-notes/queries';
import { useAuth } from '@/hooks/useAuth';
import logoIcon from '@/assets/VisualMemoryIcon.png';
import HeaderNavigation from './HeaderNavigation';
import HeaderUserMenu from './HeaderUserMenu';
import styles from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: hasUnread = false } = useQuery({
    ...unreadPatchNotesQuery(),
    enabled: Boolean(user),
  });

  return (
    <>
      <header className={styles.header}>
        <button type="button" className={styles.logo} onClick={() => navigate({ to: '/' })}>
          <img src={logoIcon} alt="" className={styles.logoIcon} />
          VisualMemory
        </button>
        <nav className={styles.nav} aria-label="Navegação principal">
          {user && <HeaderNavigation isAdmin={user.is_admin} />}
          {user ? (
            <HeaderUserMenu
              user={user}
              loading={loading}
              hasUnreadPatchNotes={hasUnread}
              onOpenSettings={() => setSettingsOpen(true)}
              onLogout={logout}
            />
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
          onLogout={logout}
        />
      )}
    </>
  );
}
