import { useState } from 'react';
import Button from '@/components/Button/Button';
import Input from '@/components/Input/Input';
import styles from '@/SearchBar.module.css';

interface Props {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export default function SearchBar({ onSearch, isSearching }: Props) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        placeholder="Busque um jogo na RAWG (ex: Elden Ring)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button type="submit" disabled={isSearching}>
        {isSearching ? 'Buscando...' : 'Pesquisar'}
      </Button>
    </form>
  );
}