import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { STANDARD_GENRES } from '@/utils/genres';
import { STANDARD_PLATFORMS } from '@/utils/platforms';
import styles from './GameEditModal.module.css';

interface Option {
  id: string;
  label: string;
}

interface TagSelectorProps {
  field: 'platforms' | 'genres';
  title: string;
  singularLabel: string;
  values: string[];
  options: Option[];
  editable: boolean;
  editing: boolean;
  disabled: boolean;
  onToggle: (field: string) => void;
  onChange: (values: string[]) => void;
}

function TagSelector({ field, title, singularLabel, values, options, editable, editing, disabled, onToggle, onChange }: TagSelectorProps) {
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const customOptions = values.filter((value) => !options.some((option) => option.id === value));
  const availableOptions = [...options, ...customOptions.map((id) => ({ id, label: id }))];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOptions = availableOptions.filter((option) => (
    !values.includes(option.id)
    && (option.label.toLowerCase().includes(normalizedSearch) || option.id.toLowerCase().includes(normalizedSearch))
  ));
  const showCustomOption = Boolean(normalizedSearch)
    && !values.some((value) => value.toLowerCase() === normalizedSearch)
    && !availableOptions.some((option) => option.label.toLowerCase() === normalizedSearch || option.id.toLowerCase() === normalizedSearch);

  const addValue = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const standardOption = options.find((option) => option.label.toLowerCase() === trimmed.toLowerCase() || option.id.toLowerCase() === trimmed.toLowerCase());
    const value = standardOption?.id ?? trimmed;
    if (!values.includes(value)) onChange([...values, value]);
    setSearch('');
  };

  const handleActivationKey = (event: KeyboardEvent) => {
    if (!editable || (event.target as HTMLElement).tagName === 'INPUT') return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(field);
    }
  };

  return (
    <div
      className={`${styles.tagBlock} ${editing ? styles.tagBlockEditing : ''}`}
      onClick={() => editable && onToggle(field)}
      onKeyDown={handleActivationKey}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? `Editar ${title.toLowerCase()}` : undefined}
    >
      <div className={styles.tagBlockHeader}><span className={styles.tagBlockTitle}>{title}</span></div>
      <div className={styles.tagBlockContent}>
        {values.map((value) => (
          <span key={value} className={styles.tagBadge}>
            {availableOptions.find((option) => option.id === value)?.label ?? value}
            {editable && (
              <button
                type="button"
                className={styles.removeTagIcon}
                onClick={(event) => { event.stopPropagation(); onChange(values.filter((currentValue) => currentValue !== value)); }}
                disabled={disabled}
                aria-label={`Remover ${value}`}
              >
                <X aria-hidden="true" size={12} />
              </button>
            )}
          </span>
        ))}
        {editable && <button type="button" className={styles.addTagButton} onClick={(event) => { event.stopPropagation(); onToggle(field); }}>+ Adicionar</button>}
      </div>

      {editing && editable && (
        <div
          className={styles.dropdownWrapper}
          onClick={(event) => event.stopPropagation()}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDropdownOpen(false);
          }}
        >
          <input
            type="text"
            placeholder={`Pesquisar ou adicionar ${singularLabel}...`}
            className={styles.tagSearchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') {
                event.preventDefault();
                addValue(search);
              }
            }}
            disabled={disabled}
            aria-label={`Pesquisar ou adicionar ${singularLabel}`}
            autoFocus
          />
          {dropdownOpen && (filteredOptions.length > 0 || showCustomOption) && (
            <div className={`${styles.dropdownList} scrollbar-visualmemory`}>
              {filteredOptions.map((option) => (
                <button key={option.id} type="button" className={styles.dropdownItem} onMouseDown={() => addValue(option.id)}>{option.label}</button>
              ))}
              {showCustomOption && (
                <button type="button" className={`${styles.dropdownItem} ${styles.customItem}`} onMouseDown={() => addValue(search)}>+ Adicionar &quot;{search.trim()}&quot;</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  platforms: string[];
  genres: string[];
  editable: boolean;
  activeEditField: string | null;
  disabled: boolean;
  onToggleEditField: (field: string) => void;
  onPlatformsChange: (platforms: string[]) => void;
  onGenresChange: (genres: string[]) => void;
}

export default function GameMetadataFields(props: Props) {
  return (
    <div className={styles.platformsAndGenresRow}>
      <TagSelector field="platforms" title="Plataformas" singularLabel="plataforma" values={props.platforms} options={STANDARD_PLATFORMS} editable={props.editable} editing={props.activeEditField === 'platforms'} disabled={props.disabled} onToggle={props.onToggleEditField} onChange={props.onPlatformsChange} />
      <TagSelector field="genres" title="Gêneros" singularLabel="gênero" values={props.genres} options={STANDARD_GENRES} editable={props.editable} editing={props.activeEditField === 'genres'} disabled={props.disabled} onToggle={props.onToggleEditField} onChange={props.onGenresChange} />
    </div>
  );
}
