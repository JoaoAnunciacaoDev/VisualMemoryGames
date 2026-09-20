import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/Shared';
import {
  validateAdminSearch,
  validateLibrarySearch,
  validateSocialSearch,
} from '@/app/search';
import styles from './Header.module.css';

export default function HeaderNavigation({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();

  return (
    <div className={styles.navLinks}>
      <Button
        variant="ghost"
        onClick={() => navigate({ to: '/library', search: validateLibrarySearch({}) })}
      >
        Biblioteca
      </Button>
      <Button variant="ghost" onClick={() => navigate({ to: '/tierlists' })}>
        TierLists
      </Button>
      <Button variant="ghost" onClick={() => navigate({ to: '/recommendations' })}>
        Recomendações
      </Button>
      <Button
        variant="ghost"
        onClick={() => navigate({ to: '/social', search: validateSocialSearch({}) })}
      >
        Social
      </Button>
      {isAdmin && (
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/admin', search: validateAdminSearch({}) })}
        >
          Admin
        </Button>
      )}
    </div>
  );
}
