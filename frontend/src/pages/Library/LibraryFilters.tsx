import { Input, Button } from '@/components/Shared';
import styles from '@/pages/Library/Library.module.css';
import type { SortBy, YearField } from '@/pages/Library/Library.types';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  yearField: YearField | '';
  onYearFieldChange: (value: YearField | '') => void;
  yearValue: number | '';
  onYearValueChange: (value: number | '') => void;
  hoursOperator: 'gt' | 'lt' | '';
  onHoursOperatorChange: (value: 'gt' | 'lt' | '') => void;
  hoursValue: number | '';
  onHoursValueChange: (value: number | '') => void;
  groupByStatus: boolean;
  onToggleGroupByStatus: () => void;
  statusOptions: string[];
}

export default function LibraryFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  yearField,
  onYearFieldChange,
  yearValue,
  onYearValueChange,
  hoursOperator,
  onHoursOperatorChange,
  hoursValue,
  onHoursValueChange,
  groupByStatus,
  onToggleGroupByStatus,
  statusOptions,
}: Props) {
  return (
    <div className={styles.controls}>
      <Input
        className={styles.searchInput}
        type="text"
        placeholder="Pesquisar na biblioteca..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Pesquisar na biblioteca"
      />

      <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className={styles.select}>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      <select
        value={sortBy ?? ''}
        onChange={(e) => onSortByChange(e.target.value === '' ? null : (e.target.value as Exclude<SortBy, null>))}
        className={styles.select}
      >
        <option value="">Ordenar por</option>
        <option value="rating">Nota</option>
        <option value="started_at">Data de início</option>
        <option value="finished_at">Data de término</option>
        <option value="platinum_at">Data de platina</option>
      </select>

      <select value={sortOrder} onChange={(e) => onSortOrderChange(e.target.value as 'asc' | 'desc')} className={styles.select}>
        <option value="desc">Decrescente</option>
        <option value="asc">Crescente</option>
      </select>

      <div className={styles.filterPair}>
        <select
          value={yearField}
          onChange={(e) => onYearFieldChange(e.target.value as YearField | '')}
          className={styles.select}
        >
          <option value="">Ano de...</option>
          <option value="started_at">Início</option>
          <option value="finished_at">Conclusão</option>
          <option value="platinum_at">Platina</option>
        </select>
        <Input
          type="number"
          placeholder="Ano"
          value={yearValue}
          onChange={(e) => onYearValueChange(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={!yearField}
          min={1970}
          max={new Date().getFullYear()}
        />
      </div>

      <div className={styles.filterPair}>
        <select
          value={hoursOperator}
          onChange={(e) => onHoursOperatorChange(e.target.value as 'gt' | 'lt' | '')}
          className={styles.select}
        >
          <option value="">Horas jogadas</option>
          <option value="gt">Maior que</option>
          <option value="lt">Menor que</option>
        </select>
        <Input
          type="number"
          placeholder="Horas"
          value={hoursValue}
          onChange={(e) => onHoursValueChange(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={!hoursOperator}
          min={0}
          step={0.1}
        />
      </div>

      <Button
        variant={groupByStatus ? 'primary' : 'ghost'}
        onClick={onToggleGroupByStatus}
        className={styles.groupToggle}
      >
        Agrupar por Status
      </Button>
    </div>
  );
}