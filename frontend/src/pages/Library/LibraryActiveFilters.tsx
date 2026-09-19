import { X } from 'lucide-react';
import type { SortBy, YearField } from './Library.types';
import type { LibraryFiltersProps } from './LibraryFilters.types';
import styles from './Library.module.css';

const YEAR_LABELS: Record<YearField, string> = {
  acquired_at: 'Aquisição', started_at: 'Início', finished_at: 'Conclusão', platinum_at: 'Platina',
};

const SORT_LABELS: Record<NonNullable<SortBy>, string> = {
  rating: 'Nota', started_at: 'Data de início', finished_at: 'Data de término',
  platinum_at: 'Data de platina', acquired_at: 'Data de aquisição', title: 'Título',
  hours_played: 'Horas jogadas',
};

interface Badge { id: string; label: string; onRemove: () => void }

function createBadges(props: LibraryFiltersProps): Badge[] {
  const badges: Badge[] = [];
  if (props.statusFilter !== 'Todos') badges.push({ id: 'status', label: `Status: ${props.statusFilter}`, onRemove: () => props.onStatusFilterChange('Todos') });
  if (props.storeFilter !== 'Todas') badges.push({ id: 'store', label: `Loja: ${props.storeFilter}`, onRemove: () => props.onStoreFilterChange('Todas') });
  if (props.originFilter !== 'all') badges.push({ id: 'origin', label: props.originFilter === 'manual' ? 'Manual' : 'Importado', onRemove: () => props.onOriginFilterChange('all') });
  if (props.yearField && props.yearValue !== '') badges.push({
    id: 'year', label: `Ano (${YEAR_LABELS[props.yearField]}): ${props.yearValue}`,
    onRemove: () => { props.onYearFieldChange(''); props.onYearValueChange(''); },
  });
  if (props.hoursOperator) {
    const label = props.hoursOperator === 'between'
      ? `Horas: ${props.hoursValue || 0} - ${props.hoursValueMax || '∞'}`
      : `Horas ${props.hoursOperator === 'gt' ? '>' : '<'} ${props.hoursValue || 0}`;
    badges.push({
      id: 'hours', label,
      onRemove: () => { props.onHoursOperatorChange(''); props.onHoursValueChange(''); props.onHoursValueMaxChange(''); },
    });
  }
  if (props.groupMode !== 'none') badges.push({ id: 'group', label: `Agrupar: ${props.groupMode === 'status' ? 'Status' : 'Loja'}`, onRemove: () => props.onGroupModeChange('none') });
  if (props.sortBy) badges.push({ id: 'sort', label: `Ordenar: ${SORT_LABELS[props.sortBy]} (${props.sortOrder === 'asc' ? 'Crescente' : 'Decrescente'})`, onRemove: () => props.onSortByChange(null) });
  return badges;
}

export default function LibraryActiveFilters(props: LibraryFiltersProps) {
  const badges = createBadges(props);
  return (
    <div className={styles.activeRow}>
      <span className={styles.activeLabel}>ATIVOS:</span>
      <div className={styles.activeBadgesList}>
        {badges.map((badge) => (
          <span key={badge.id} className={styles.activeChip}>
            {badge.label}
            <button type="button" onClick={badge.onRemove} className={styles.chipRemoveBtn} aria-label={`Remover filtro ${badge.label}`}><X aria-hidden="true" /></button>
          </span>
        ))}
        {badges.length > 0 && <button type="button" onClick={props.onClearAllFilters} className={styles.clearAllBtn}>Limpar tudo</button>}
      </div>
    </div>
  );
}
