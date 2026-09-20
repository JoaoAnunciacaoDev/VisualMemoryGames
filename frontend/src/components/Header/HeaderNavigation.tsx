import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/Shared';
import {
  validateAdminSearch,
  validateLibrarySearch,
  validateSocialSearch,
} from '@/app/search';
import styles from './Header.module.css';

export default function HeaderNavigation({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navigateFromMenu = (navigateToPage: () => void) => {
    setMenuOpen(false);
    navigateToPage();
  };

  return (
    <div className={styles.navigationContainer}>
      <button
        type="button"
        className={styles.mobileMenuButton}
        aria-label={menuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation-links"
        onClick={() => setMenuOpen((current) => !current)}
      >
        {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
      </button>

      <div
        id="primary-navigation-links"
        className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ''}`}
      >
        <Button
          variant="ghost"
          onClick={() =>
            navigateFromMenu(() => {
              void navigate({ to: '/library', search: validateLibrarySearch({}) });
            })
          }
        >
          Biblioteca
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigateFromMenu(() => { void navigate({ to: '/tierlists' }); })}
        >
          TierLists
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigateFromMenu(() => { void navigate({ to: '/recommendations' }); })}
        >
          Recomendações
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            navigateFromMenu(() => {
              void navigate({ to: '/social', search: validateSocialSearch({}) });
            })
          }
        >
          Social
        </Button>
        {isAdmin && (
          <Button
            variant="ghost"
            onClick={() =>
              navigateFromMenu(() => {
                void navigate({ to: '/admin', search: validateAdminSearch({}) });
              })
            }
          >
            Admin
          </Button>
        )}
      </div>
    </div>
  );
}
