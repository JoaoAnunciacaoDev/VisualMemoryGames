import { useState, SyntheticEvent } from 'react';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import styles from '@/components/SearchBar/SearchBar.module.css';

interface Props {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export default function SearchBar({ onSearch, isSearching }: Props) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        aria-label="Pesquisar jogo online"
        placeholder="Busque um jogo Online..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button type="submit" disabled={isSearching}>
        {isSearching ? 'Buscando...' : 'Pesquisar'}
      </Button>
    </form>
  );
}