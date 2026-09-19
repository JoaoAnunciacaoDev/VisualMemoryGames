import { useMemo, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import styles from './ManualGameModal.module.css';

interface Option { id: string; label: string }

export default function SearchableTagSelector({
  label,
  singular,
  options,
  selected,
  onChange,
  disabled,
}: {
  label: string;
  singular: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(() => options.filter((option) => (
    !selected.includes(option.id)
    && (option.label.toLowerCase().includes(normalizedSearch) || option.id.toLowerCase().includes(normalizedSearch))
  )), [normalizedSearch, options, selected]);
  const matchingOption = options.find((option) => (
    option.label.toLowerCase() === normalizedSearch || option.id.toLowerCase() === normalizedSearch
  ));
  const customValue = search.trim();
  const showCustom = !!customValue
    && !selected.some((value) => value.toLowerCase() === normalizedSearch)
    && !matchingOption;

  const add = (value: string) => {
    if (!selected.includes(value)) onChange([...selected, value]);
    setSearch('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !customValue) return;
    event.preventDefault();
    add(matchingOption?.id ?? customValue);
  };

  return (
    <div className={styles.genresSection}>
      <span className={styles.genresLabel}>{label}</span>
      {selected.length > 0 && (
        <div className={styles.genreTagsContainer}>
          {selected.map((value) => (
            <span key={value} className={styles.selectedGenreTag}>
              {options.find((option) => option.id === value)?.label ?? value}
              <button type="button" className={styles.removeTagBtn} onClick={() => onChange(selected.filter((item) => item !== value))} disabled={disabled} aria-label={`Remover ${value}`}>
                <X aria-hidden="true" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder={`Pesquisar ou adicionar ${singular}...`}
          className={styles.genreSearchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        {isOpen && (filtered.length > 0 || showCustom) && (
          <div className={`${styles.dropdownList} scrollbar-visualmemory`}>
            {filtered.map((option) => <button key={option.id} type="button" className={styles.dropdownItem} onMouseDown={() => add(option.id)}>{option.label}</button>)}
            {showCustom && (
              <button type="button" className={`${styles.dropdownItem} ${styles.customItem}`} onMouseDown={() => add(customValue)}>
                + Adicionar &quot;{customValue}&quot; como {singular} personalizada
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
