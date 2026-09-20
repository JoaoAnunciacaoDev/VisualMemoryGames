import { Input } from '@/components/Shared';
import type { HoursOperator, OriginFilter, YearField } from './Library.types';
import type { LibraryFiltersProps } from './LibraryFilters.types';
import styles from './Library.module.css';

type Props = Pick<LibraryFiltersProps,
  | 'statusFilter' | 'onStatusFilterChange' | 'storeFilter' | 'onStoreFilterChange'
  | 'originFilter' | 'onOriginFilterChange' | 'yearField' | 'onYearFieldChange'
  | 'yearValue' | 'onYearValueChange' | 'hoursOperator' | 'onHoursOperatorChange'
  | 'hoursValue' | 'onHoursValueChange' | 'hoursValueMax' | 'onHoursValueMaxChange'
  | 'statusOptions' | 'storeOptions'
>;

const ORIGIN_OPTIONS: { value: OriginFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'imported', label: 'Importado' },
  { value: 'manual', label: 'Manual' },
];

export default function LibraryFilterFields(props: Props) {
  const {
    statusFilter, onStatusFilterChange, storeFilter, onStoreFilterChange,
    originFilter, onOriginFilterChange, yearField, onYearFieldChange,
    yearValue, onYearValueChange, hoursOperator, onHoursOperatorChange,
    hoursValue, onHoursValueChange, hoursValueMax, onHoursValueMaxChange,
    statusOptions, storeOptions,
  } = props;

  const numberValue = (value: string) => value === '' ? '' : Number(value);

  return (
    <div className={styles.filtersGrid}>
      <div className={styles.filterField}>
        <label className={styles.fieldLabel}>STATUS</label>
        <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className={styles.select}>
          {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
      <div className={styles.filterField}>
        <label className={styles.fieldLabel}>LOJA</label>
        <select value={storeFilter} onChange={(e) => onStoreFilterChange(e.target.value)} className={styles.select}>
          {storeOptions.map((store) => <option key={store} value={store}>{store}</option>)}
        </select>
      </div>
      <div className={styles.filterField}>
        <span className={styles.fieldLabel}>ORIGEM</span>
        <div className={styles.segmentedControl}>
          {ORIGIN_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.segmentBtn} ${originFilter === option.value ? styles.segmentBtnActive : ''}`}
              onClick={() => onOriginFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterPairRow}>
        <div className={styles.filterFieldFlex}>
          <label className={styles.fieldLabel}>TIPO DE ANO</label>
          <select value={yearField} onChange={(e) => onYearFieldChange(e.target.value as YearField | '')} className={styles.select}>
            <option value="">Ano de...</option>
            <option value="acquired_at">Aquisição</option>
            <option value="started_at">Início</option>
            <option value="finished_at">Conclusão</option>
            <option value="platinum_at">Platina</option>
          </select>
        </div>
        <div className={styles.filterFieldNarrow}>
          <label className={styles.fieldLabel}>ANO</label>
          <Input type="number" placeholder="2024" value={yearValue} onChange={(e) => onYearValueChange(numberValue(e.target.value))} disabled={!yearField} min={1970} max={new Date().getFullYear()} className={styles.numberInput} />
        </div>
      </div>
      <div className={styles.filterPairRow}>
        <div className={styles.filterFieldFlex}>
          <label className={styles.fieldLabel}>FILTRO DE HORAS</label>
          <select value={hoursOperator} onChange={(e) => onHoursOperatorChange(e.target.value as HoursOperator)} className={styles.select}>
            <option value="">Horas jogadas</option>
            <option value="lt">Menor que</option>
            <option value="gt">Maior que</option>
            <option value="between">Entre</option>
          </select>
        </div>
        <div className={styles.filterFieldNarrow}>
          <label className={styles.fieldLabel}>HORAS</label>
          {hoursOperator === 'between' ? (
            <div className={styles.rangeInputs}>
              <Input type="number" placeholder="Min" value={hoursValue} onChange={(e) => onHoursValueChange(numberValue(e.target.value))} min={0} step={0.1} />
              <Input type="number" placeholder="Máx" value={hoursValueMax} onChange={(e) => onHoursValueMaxChange(numberValue(e.target.value))} min={0} step={0.1} />
            </div>
          ) : (
            <Input type="number" placeholder="0" value={hoursValue} onChange={(e) => onHoursValueChange(numberValue(e.target.value))} disabled={!hoursOperator} min={0} step={0.1} className={styles.numberInput} />
          )}
        </div>
      </div>
    </div>
  );
}
