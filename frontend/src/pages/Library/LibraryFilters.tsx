import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/Shared';
import LibraryActiveFilters from './LibraryActiveFilters';
import LibraryFilterFields from './LibraryFilterFields';
import LibrarySortAndGroup from './LibrarySortAndGroup';
import type { LibraryFiltersProps } from './LibraryFilters.types';
import styles from './Library.module.css';

export default function LibraryFilters(props: LibraryFiltersProps) {
  return (
    <div className={styles.filterSectionContainer}>
      <div className={styles.searchRow}>
        <div className={styles.searchInputWrapper}>
          <Search aria-hidden="true" className={styles.searchIcon} />
          <Input
            className={styles.searchInput}
            type="text"
            placeholder="Pesquisar na biblioteca..."
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            aria-label="Pesquisar na biblioteca"
          />
        </div>
      </div>
      <div className={styles.sectionHeader}>
        <SlidersHorizontal aria-hidden="true" className={styles.sectionIcon} />
        <span>FILTROS</span>
      </div>
      <LibraryFilterFields {...props} />
      <div className={styles.sectionDivider} />
      <LibrarySortAndGroup {...props} />
      <LibraryActiveFilters {...props} />
    </div>
  );
}
