import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Megaphone } from 'lucide-react';
import { validatePatchNotesSearch } from '@/app/search';
import type { User } from '@/types';
import styles from './Header.module.css';

interface Props {
  user: User;
  loading: boolean;
  hasUnreadPatchNotes: boolean;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function HeaderUserMenu({
  user,
  loading,
  hasUnreadPatchNotes,
  onOpenSettings,
  onLogout,
}: Props) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!dropdownOpen) return;
    const closeDropdown = () => setDropdownOpen(false);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownOpen]);

  const toggleDropdown = (event: MouseEvent) => {
    event.stopPropagation();
    setDropdownOpen((current) => !current);
  };

  const logout = () => {
    setDropdownOpen(false);
    onLogout();
  };

  return (
    <div className={styles.navActions}>
      <button
        type="button"
        className={`${styles.megaphoneBtn} ${hasUnreadPatchNotes ? styles.hasUnread : ''}`}
        onClick={() =>
          navigate({ to: '/patch-notes', search: validatePatchNotesSearch({}) })
        }
        aria-label="Abrir notas de atualização"
        title="Patch Notes"
      >
        <Megaphone aria-hidden="true" size={18} />
      </button>

      <div className={styles.avatarContainer}>
        <button
          type="button"
          className={`${styles.avatar} ${loading ? styles.avatarLoading : ''}`}
          onClick={toggleDropdown}
          disabled={loading}
          aria-label={`Abrir menu de ${user.username}`}
          aria-expanded={dropdownOpen}
        >
          {loading ? '' : user.username.charAt(0).toUpperCase() || 'U'}
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
            <button type="button" className={styles.dropdownItem} onClick={onOpenSettings}>
              Configurações
            </button>
            <button type="button" className={styles.dropdownItem} onClick={logout}>
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
