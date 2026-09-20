import { Button, Loader } from '@/components/Shared';
import LibraryDialogs from './LibraryDialogs';
import LibraryTabContent from './LibraryTabContent';
import LibraryTabs from './LibraryTabs';
import { useLibraryPageController } from './useLibraryPageController';
import styles from './Library.module.css';

export default function Library() {
  const controller = useLibraryPageController();
  if (controller.loading) return <Loader message="Carregando biblioteca..." />;

  return (
    <div className={styles.page}>
      {controller.libraryError && (
        <div className={styles.emptyState} role="alert">
          <p>{controller.libraryError}</p>
          <Button variant="ghost" onClick={controller.loadLibrary}>Tentar novamente</Button>
        </div>
      )}
      <header className={styles.header}><h2 className={styles.heading}>Minha Biblioteca</h2></header>
      <LibraryTabs activeTab={controller.activeTab} onChange={controller.setActiveTab} />
      <LibraryTabContent controller={controller} />
      <LibraryDialogs controller={controller} />
    </div>
  );
}
