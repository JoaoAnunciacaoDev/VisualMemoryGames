import type { KeyboardEvent } from 'react';
import { Ban, BookOpen, CheckCircle2, Clock3, Gamepad2, Pause, Target, Trophy, type LucideIcon } from 'lucide-react';
import { STORE_OPTIONS } from '@/types/enums';
import type { UpdateLibraryGame } from '@/types/updateGame';
import styles from './GameEditModal.module.css';

interface StatusOption {
  name: string;
  icon: LucideIcon;
  className: string;
}

const statusOptions: StatusOption[] = [
  { name: 'Na biblioteca', icon: BookOpen, className: 'inLibrary' },
  { name: 'Quero Jogar', icon: Target, className: 'wantToPlay' },
  { name: 'Jogando', icon: Gamepad2, className: 'playing' },
  { name: 'Zerado', icon: CheckCircle2, className: 'completed' },
  { name: 'Em Espera', icon: Pause, className: 'onHold' },
  { name: 'Abandonado', icon: Ban, className: 'abandoned' },
  { name: 'Platinado', icon: Trophy, className: 'platinized' },
];

interface Props {
  form: Pick<UpdateLibraryGame, 'status' | 'store' | 'hours_played'>;
  canReview: boolean;
  activeEditField: string | null;
  disabled: boolean;
  onToggleEditField: (field: string) => void;
  onStatusChange: (status: string) => void;
  onFieldChange: <K extends keyof UpdateLibraryGame>(field: K, value: UpdateLibraryGame[K]) => void;
}

const activateOnKeyboard = (event: KeyboardEvent, action: () => void) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

export default function GameProgressFields({ form, canReview, activeEditField, disabled, onToggleEditField, onStatusChange, onFieldChange }: Props) {
  return (
    <div className={styles.statusSection}>
      <span className={styles.statusSectionLabel}>Status</span>
      <div className={styles.statusButtonsGrid}>
        {statusOptions.map((option) => {
          const Icon = option.icon;
          const selected = (form.status || 'Na biblioteca') === option.name;
          return (
            <button
              key={option.name}
              type="button"
              className={`${styles.statusGridBtn} ${selected ? styles[`statusGridBtn_${option.className}`] : ''}`}
              onClick={() => onStatusChange(option.name)}
              disabled={disabled}
              aria-pressed={selected}
            >
              <span className={styles.statusBtnIcon}><Icon aria-hidden="true" /></span>
              <span className={styles.statusBtnName}>{option.name}</span>
            </button>
          );
        })}
      </div>

      <hr className={styles.statusSectionDivider} />
      <div className={styles.storeAndHoursRow}>
        <div
          className={`${styles.storeFieldBlock} ${activeEditField === 'store' ? styles.fieldBlockEditing : ''}`}
          onClick={() => onToggleEditField('store')}
          onKeyDown={(event) => activateOnKeyboard(event, () => onToggleEditField('store'))}
          role="button"
          tabIndex={0}
          aria-label="Editar loja"
        >
          <span className={styles.fieldBlockLabel}>Loja</span>
          {activeEditField === 'store' ? (
            <select
              className={styles.gridSelect}
              value={form.store ?? ''}
              onChange={(event) => {
                onFieldChange('store', event.target.value || null);
                onToggleEditField('store');
              }}
              onClick={(event) => event.stopPropagation()}
              disabled={disabled}
              aria-label="Loja"
              autoFocus
            >
              <option value="">Selecione...</option>
              {STORE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : <div className={styles.gridTextValue}>{STORE_OPTIONS.find((option) => option.value === form.store)?.label || 'Não informada'}</div>}
        </div>

        {canReview && (
          <div
            className={`${styles.hoursFieldBlock} ${activeEditField === 'hours_played' ? styles.fieldBlockEditing : ''}`}
            onClick={() => onToggleEditField('hours_played')}
            onKeyDown={(event) => activateOnKeyboard(event, () => onToggleEditField('hours_played'))}
            role="button"
            tabIndex={0}
            aria-label="Editar horas jogadas"
          >
            <span className={styles.fieldBlockLabel}><Clock3 aria-hidden="true" size={15} /> Horas jogadas</span>
            {activeEditField === 'hours_played' ? (
              <input
                type="number"
                min={0}
                step={0.1}
                className={styles.gridInput}
                value={form.hours_played ?? ''}
                onChange={(event) => onFieldChange('hours_played', event.target.value === '' ? null : Number(event.target.value))}
                onClick={(event) => event.stopPropagation()}
                onBlur={() => onToggleEditField('hours_played')}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') onToggleEditField('hours_played');
                }}
                disabled={disabled}
                aria-label="Horas jogadas"
                autoFocus
              />
            ) : <div className={styles.gridTextValue}>{form.hours_played !== null && form.hours_played !== undefined ? `${form.hours_played}h` : 'Não informadas'}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
