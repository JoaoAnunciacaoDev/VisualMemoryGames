import { ArrowDown, ArrowUp, Layers, List } from 'lucide-react';
import type { SortBy } from './Library.types';
import type { LibraryFiltersProps } from './LibraryFilters.types';
import styles from './Library.module.css';

type Props = Pick<LibraryFiltersProps,
  'sortBy' | 'onSortByChange' | 'sortOrder' | 'onSortOrderChange' | 'groupMode' | 'onGroupModeChange'
>;

export default function LibrarySortAndGroup({
  sortBy, onSortByChange, sortOrder, onSortOrderChange, groupMode, onGroupModeChange,
}: Props) {
  return (
    <div className={styles.sortAndGroupGrid}>
      <div className={styles.sortContainer}>
        <div className={styles.sectionHeader}><List aria-hidden="true" className={styles.sectionIcon} /><span>ORDENAÇÃO</span></div>
        <div className={styles.sortControlsRow}>
          <select
            value={sortBy ?? ''}
            onChange={(e) => onSortByChange(e.target.value === '' ? null : e.target.value as Exclude<SortBy, null>)}
            className={`${styles.select} ${styles.sortSelect}`}
          >
            <option value="">Ordenar por...</option>
            <option value="rating">Nota</option><option value="started_at">Data de início</option>
            <option value="finished_at">Data de término</option><option value="platinum_at">Data de platina</option>
            <option value="acquired_at">Data de aquisição</option><option value="title">Título</option>
            <option value="hours_played">Horas jogadas</option>
          </select>
          <button type="button" className={styles.sortOrderBtn} onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')} title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'} aria-label="Alternar ordem de classificação">
            {sortOrder === 'asc' ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className={styles.groupContainer}>
        <div className={styles.sectionHeader}><Layers aria-hidden="true" className={styles.sectionIcon} /><span>AGRUPAR POR</span></div>
        <div className={styles.groupControlsRow}>
          {(['status', 'store'] as const).map((mode) => (
            <button key={mode} type="button" className={`${styles.groupOptionBtn} ${groupMode === mode ? styles.groupOptionBtnActive : ''}`} onClick={() => onGroupModeChange(groupMode === mode ? 'none' : mode)}>
              {mode === 'status' ? 'Status' : 'Loja'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
