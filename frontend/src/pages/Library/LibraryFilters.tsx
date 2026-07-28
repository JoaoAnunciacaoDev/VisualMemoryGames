import { Input } from '@/components/Shared';
import { FiSearch, FiSliders, FiLayers, FiArrowDown, FiArrowUp, FiX, FiList } from 'react-icons/fi';
import styles from '@/pages/Library/Library.module.css';
import type { SortBy, YearField, HoursOperator, OriginFilter, GroupMode } from '@/pages/Library/Library.types';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  storeFilter: string;
  onStoreFilterChange: (value: string) => void;
  originFilter: OriginFilter;
  onOriginFilterChange: (value: OriginFilter) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  yearField: YearField | '';
  onYearFieldChange: (value: YearField | '') => void;
  yearValue: number | '';
  onYearValueChange: (value: number | '') => void;
  hoursOperator: HoursOperator;
  onHoursOperatorChange: (value: HoursOperator) => void;
  hoursValue: number | '';
  onHoursValueChange: (value: number | '') => void;
  hoursValueMax: number | '';
  onHoursValueMaxChange: (value: number | '') => void;
  groupMode: GroupMode;
  onGroupModeChange: (mode: GroupMode) => void;
  statusOptions: string[];
  storeOptions: string[];
  onClearAllFilters: () => void;
}

export default function LibraryFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  storeFilter,
  onStoreFilterChange,
  originFilter,
  onOriginFilterChange,
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
  hoursValueMax,
  onHoursValueMaxChange,
  groupMode,
  onGroupModeChange,
  statusOptions,
  storeOptions,
  onClearAllFilters,
}: Props) {
  // Construção das tags ativas (badges)
  const activeBadges: { id: string; label: string; onRemove: () => void }[] = [];

  if (statusFilter !== 'Todos') {
    activeBadges.push({
      id: 'status',
      label: `Status: ${statusFilter}`,
      onRemove: () => onStatusFilterChange('Todos'),
    });
  }

  if (storeFilter !== 'Todas') {
    activeBadges.push({
      id: 'store',
      label: `Loja: ${storeFilter}`,
      onRemove: () => onStoreFilterChange('Todas'),
    });
  }

  if (originFilter === 'manual') {
    activeBadges.push({
      id: 'origin',
      label: 'Manual',
      onRemove: () => onOriginFilterChange('all'),
    });
  } else if (originFilter === 'imported') {
    activeBadges.push({
      id: 'origin',
      label: 'Importado',
      onRemove: () => onOriginFilterChange('all'),
    });
  }

  if (yearField && yearValue !== '') {
    const fieldLabelMap: Record<YearField, string> = {
      acquired_at: 'Aquisição',
      started_at: 'Início',
      finished_at: 'Conclusão',
      platinum_at: 'Platina',
    };
    activeBadges.push({
      id: 'year',
      label: `Ano (${fieldLabelMap[yearField]}): ${yearValue}`,
      onRemove: () => {
        onYearFieldChange('');
        onYearValueChange('');
      },
    });
  }

  if (hoursOperator) {
    let hoursText = '';
    if (hoursOperator === 'gt') hoursText = `Horas > ${hoursValue || 0}`;
    else if (hoursOperator === 'lt') hoursText = `Horas < ${hoursValue || 0}`;
    else if (hoursOperator === 'between') hoursText = `Horas: ${hoursValue || 0} - ${hoursValueMax || '∞'}`;

    activeBadges.push({
      id: 'hours',
      label: hoursText,
      onRemove: () => {
        onHoursOperatorChange('');
        onHoursValueChange('');
        onHoursValueMaxChange('');
      },
    });
  }

  if (groupMode === 'status') {
    activeBadges.push({
      id: 'group',
      label: 'Agrupar: Status',
      onRemove: () => onGroupModeChange('none'),
    });
  } else if (groupMode === 'store') {
    activeBadges.push({
      id: 'group',
      label: 'Agrupar: Loja',
      onRemove: () => onGroupModeChange('none'),
    });
  }

  if (sortBy) {
    const sortLabelMap: Record<NonNullable<SortBy>, string> = {
      rating: 'Nota',
      started_at: 'Data de início',
      finished_at: 'Data de término',
      platinum_at: 'Data de platina',
      acquired_at: 'Data de aquisição',
      title: 'Título',
      hours_played: 'Horas jogadas',
    };
    activeBadges.push({
      id: 'sort',
      label: `Ordenar: ${sortLabelMap[sortBy]} (${sortOrder === 'asc' ? 'Crescente' : 'Decrescente'})`,
      onRemove: () => onSortByChange(null),
    });
  }

  return (
    <div className={styles.filterSectionContainer}>
      {/* Campo de pesquisa estilo barra superior */}
      <div className={styles.searchRow}>
        <div className={styles.searchInputWrapper}>
          <FiSearch className={styles.searchIcon} />
          <Input
            className={styles.searchInput}
            type="text"
            placeholder="Pesquisar na biblioteca..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Pesquisar na biblioteca"
          />
        </div>
      </div>

      {/* Seção FILTROS */}
      <div className={styles.sectionHeader}>
        <FiSliders className={styles.sectionIcon} />
        <span>FILTROS</span>
      </div>

      {/* Grid de Filtros */}
      <div className={styles.filtersGrid}>
        {/* Linha 1: STATUS, LOJA, ORIGEM */}
        <div className={styles.filterField}>
          <label className={styles.fieldLabel}>STATUS</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className={styles.select}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.fieldLabel}>LOJA</label>
          <select
            value={storeFilter}
            onChange={(e) => onStoreFilterChange(e.target.value)}
            className={styles.select}
          >
            {storeOptions.map((store) => (
              <option key={store} value={store}>
                {store}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.fieldLabel}>ORIGEM</label>
          <div className={styles.segmentedControl}>
            <button
              type="button"
              className={`${styles.segmentBtn} ${originFilter === 'all' ? styles.segmentBtnActive : ''}`}
              onClick={() => onOriginFilterChange('all')}
            >
              Todos
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${originFilter === 'imported' ? styles.segmentBtnActive : ''}`}
              onClick={() => onOriginFilterChange('imported')}
            >
              Importado
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${originFilter === 'manual' ? styles.segmentBtnActive : ''}`}
              onClick={() => onOriginFilterChange('manual')}
            >
              Manual
            </button>
          </div>
        </div>

        {/* Linha 2: TIPO DE ANO, ANO, FILTRO DE HORAS, HORAS */}
        <div className={styles.filterPairRow}>
          <div className={styles.filterFieldFlex}>
            <label className={styles.fieldLabel}>TIPO DE ANO</label>
            <select
              value={yearField}
              onChange={(e) => onYearFieldChange(e.target.value as YearField | '')}
              className={styles.select}
            >
              <option value="">Ano de...</option>
              <option value="acquired_at">Aquisição</option>
              <option value="started_at">Início</option>
              <option value="finished_at">Conclusão</option>
              <option value="platinum_at">Platina</option>
            </select>
          </div>

          <div className={styles.filterFieldNarrow}>
            <label className={styles.fieldLabel}>ANO</label>
            <Input
              type="number"
              placeholder="2024"
              value={yearValue}
              onChange={(e) => onYearValueChange(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={!yearField}
              min={1970}
              max={new Date().getFullYear()}
              className={styles.numberInput}
            />
          </div>
        </div>

        <div className={styles.filterPairRow}>
          <div className={styles.filterFieldFlex}>
            <label className={styles.fieldLabel}>FILTRO DE HORAS</label>
            <select
              value={hoursOperator}
              onChange={(e) => onHoursOperatorChange(e.target.value as HoursOperator)}
              className={styles.select}
            >
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
                <Input
                  type="number"
                  placeholder="Min"
                  value={hoursValue}
                  onChange={(e) => onHoursValueChange(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={!hoursOperator}
                  min={0}
                  step={0.1}
                />
                <Input
                  type="number"
                  placeholder="Máx"
                  value={hoursValueMax}
                  onChange={(e) => onHoursValueMaxChange(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={!hoursOperator}
                  min={0}
                  step={0.1}
                />
              </div>
            ) : (
              <Input
                type="number"
                placeholder="0"
                value={hoursValue}
                onChange={(e) => onHoursValueChange(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={!hoursOperator}
                min={0}
                step={0.1}
                className={styles.numberInput}
              />
            )}
          </div>
        </div>
      </div>

      <div className={styles.sectionDivider} />

      {/* Linha ORDENAÇÃO e AGRUPAR POR */}
      <div className={styles.sortAndGroupGrid}>
        {/* Coluna Esquerda: ORDENAÇÃO */}
        <div className={styles.sortContainer}>
          <div className={styles.sectionHeader}>
            <FiList className={styles.sectionIcon} />
            <span>ORDENAÇÃO</span>
          </div>
          <div className={styles.sortControlsRow}>
            <select
              value={sortBy ?? ''}
              onChange={(e) =>
                onSortByChange(e.target.value === '' ? null : (e.target.value as Exclude<SortBy, null>))
              }
              className={`${styles.select} ${styles.sortSelect}`}
            >
              <option value="">Ordenar por...</option>
              <option value="rating">Nota</option>
              <option value="started_at">Data de início</option>
              <option value="finished_at">Data de término</option>
              <option value="platinum_at">Data de platina</option>
              <option value="acquired_at">Data de aquisição</option>
              <option value="title">Título</option>
              <option value="hours_played">Horas jogadas</option>
            </select>

            <button
              type="button"
              className={styles.sortOrderBtn}
              onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
              aria-label="Alternar ordem de classificação"
            >
              {sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
            </button>
          </div>
        </div>

        {/* Coluna Direita: AGRUPAR POR */}
        <div className={styles.groupContainer}>
          <div className={styles.sectionHeader}>
            <FiLayers className={styles.sectionIcon} />
            <span>AGRUPAR POR</span>
          </div>
          <div className={styles.groupControlsRow}>
            <button
              type="button"
              className={`${styles.groupOptionBtn} ${groupMode === 'status' ? styles.groupOptionBtnActive : ''}`}
              onClick={() => onGroupModeChange(groupMode === 'status' ? 'none' : 'status')}
            >
              Status
            </button>
            <button
              type="button"
              className={`${styles.groupOptionBtn} ${groupMode === 'store' ? styles.groupOptionBtnActive : ''}`}
              onClick={() => onGroupModeChange(groupMode === 'store' ? 'none' : 'store')}
            >
              Loja
            </button>
          </div>
        </div>
      </div>

      {/* Linha ATIVOS */}
      <div className={styles.activeRow}>
        <span className={styles.activeLabel}>ATIVOS:</span>
        <div className={styles.activeBadgesList}>
          {activeBadges.map((badge) => (
            <span key={badge.id} className={styles.activeChip}>
              {badge.label}
              <button
                type="button"
                onClick={badge.onRemove}
                className={styles.chipRemoveBtn}
                aria-label={`Remover filtro ${badge.label}`}
              >
                <FiX />
              </button>
            </span>
          ))}
          {activeBadges.length > 0 && (
            <button type="button" onClick={onClearAllFilters} className={styles.clearAllBtn}>
              Limpar tudo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}