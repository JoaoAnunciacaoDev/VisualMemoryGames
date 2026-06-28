import styles from '@/pages/Library/Library.module.css';
import type { LibraryTab } from '@/pages/Library/Library.types';

interface Props {
  activeTab: LibraryTab;
  onChange: (tab: LibraryTab) => void;
}

const TABS: Array<{ key: LibraryTab; label: string }> = [
  { key: 'library', label: 'Meus Jogos' },
  { key: 'search', label: 'Pesquisar / Adicionar' },
  { key: 'lists', label: 'Minhas Listas' },
  { key: 'manual', label: 'Adicionar Manualmente' },
];

export default function LibraryTabs({ activeTab, onChange }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Seções da biblioteca">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={`${styles.tab} ${activeTab === tab.key ? styles.activeTab : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}