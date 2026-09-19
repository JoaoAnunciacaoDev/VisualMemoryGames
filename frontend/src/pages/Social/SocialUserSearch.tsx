import type { FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import type { UserProfile } from '@/features/social/queries';
import styles from './Social.module.css';

export default function SocialUserSearch({ query, users, loading, onSearch, onFollow }: {
  query: string;
  users: UserProfile[];
  loading: boolean;
  onSearch: (query: string) => void;
  onFollow: (userId: string, following: boolean) => void;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    if (value) onSearch(value);
  };
  return (
    <div className={styles.searchSection}>
      <form onSubmit={submit} className={styles.searchForm}>
        <input type="text" name="q" placeholder="Pesquisar por nome de usuário..." key={query} defaultValue={query} className={styles.searchInput} />
        <button type="submit" className={styles.searchBtn} disabled={loading}>Buscar</button>
      </form>
      <div className={styles.userList}>
        {loading && <p>Pesquisando...</p>}
        {!loading && users.length === 0 && query && <p className={styles.empty}>Nenhum usuário encontrado.</p>}
        {users.map((user) => (
          <article key={user.id} className={styles.userCard}>
            <div className={styles.userInfo}>
              <Link to="/profile/$userId" params={{ userId: user.username }} className={styles.usernameLink}>{user.username}</Link>
              <span className={styles.stats}>{user.followers_count} seguidores • {user.following_count} seguindo</span>
            </div>
            <button className={`${styles.followBtn} ${user.is_following ? styles.following : ''}`} onClick={() => onFollow(user.id, !!user.is_following)}>{user.is_following ? 'Deixar de Seguir' : 'Seguir'}</button>
          </article>
        ))}
      </div>
    </div>
  );
}
