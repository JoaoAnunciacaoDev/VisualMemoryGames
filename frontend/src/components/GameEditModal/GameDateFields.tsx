import type { KeyboardEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import type { UpdateLibraryGame } from '@/types/updateGame';
import styles from './GameEditModal.module.css';

type DateFieldName = 'acquired_at' | 'started_at' | 'finished_at' | 'platinum_at';

interface DateFieldProps {
  field: DateFieldName;
  label: string;
  value: string | null | undefined;
  editing: boolean;
  disabled: boolean;
  onToggle: (field: string) => void;
  onChange: <K extends keyof UpdateLibraryGame>(field: K, value: UpdateLibraryGame[K]) => void;
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'Não informada';
  const parts = date.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
};

function DateField({ field, label, value, editing, disabled, onToggle, onChange }: DateFieldProps) {
  const activateOnKeyboard = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(field);
    }
  };

  return (
    <div
      className={`${styles.dateInputWrapper} ${editing ? styles.dateInputWrapperEditing : ''}`}
      onClick={() => onToggle(field)}
      onKeyDown={activateOnKeyboard}
      role="button"
      tabIndex={0}
      aria-label={`Editar ${label.toLowerCase()}`}
    >
      <span className={styles.dateLabel}>{label}</span>
      {editing ? (
        <input
          type="date"
          max="9999-12-31"
          className={styles.dateInputField}
          value={value ?? ''}
          onChange={(event) => onChange(field, event.target.value || null)}
          onClick={(event) => event.stopPropagation()}
          onBlur={() => onToggle(field)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') onToggle(field);
          }}
          disabled={disabled}
          aria-label={label}
          autoFocus
        />
      ) : <div className={styles.gridTextValue}>{formatDate(value)}</div>}
    </div>
  );
}

interface Props {
  form: Pick<UpdateLibraryGame, 'status' | DateFieldName>;
  canReview: boolean;
  activeEditField: string | null;
  disabled: boolean;
  onToggleEditField: (field: string) => void;
  onFieldChange: <K extends keyof UpdateLibraryGame>(field: K, value: UpdateLibraryGame[K]) => void;
}

export default function GameDateFields({ form, canReview, activeEditField, disabled, onToggleEditField, onFieldChange }: Props) {
  const status = form.status || 'Na biblioteca';
  const showFinishedAt = canReview && (status === 'Zerado' || status === 'Platinado');

  return (
    <div className={styles.datesCardBlock}>
      <div className={styles.datesHeader}><span><CalendarDays aria-hidden="true" size={16} /> Datas</span></div>
      <div className={styles.datesGrid}>
        <DateField field="acquired_at" label="Adquirido em" value={form.acquired_at} editing={activeEditField === 'acquired_at'} disabled={disabled} onToggle={onToggleEditField} onChange={onFieldChange} />
        {canReview && <DateField field="started_at" label="Data de início" value={form.started_at} editing={activeEditField === 'started_at'} disabled={disabled} onToggle={onToggleEditField} onChange={onFieldChange} />}
        {showFinishedAt && <DateField field="finished_at" label="Data de conclusão" value={form.finished_at} editing={activeEditField === 'finished_at'} disabled={disabled} onToggle={onToggleEditField} onChange={onFieldChange} />}
        {canReview && status === 'Platinado' && <DateField field="platinum_at" label="Platinado em" value={form.platinum_at} editing={activeEditField === 'platinum_at'} disabled={disabled} onToggle={onToggleEditField} onChange={onFieldChange} />}
      </div>
    </div>
  );
}
