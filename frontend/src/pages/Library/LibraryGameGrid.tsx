import LibraryCard from '@/components/LibraryCard/LibraryCard';
import { getBestGameCover } from '@/services/media';
import type { LibraryGame } from '@/types';
import styles from './Library.module.css';

interface Props {
  games: LibraryGame[];
  onSelectGame: (game: LibraryGame) => void;
}

export default function LibraryGameGrid({ games, onSelectGame }: Props) {
  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <LibraryCard
          key={game.id}
          title={game.title}
          coverUrl={getBestGameCover(game)}
          status={game.status}
          rating={game.rating}
          startedAt={game.started_at}
          finishedAt={game.finished_at}
          platinumAt={game.platinum_at}
          store={game.store}
          favorite={game.favorite}
          onClick={() => onSelectGame(game)}
        />
      ))}
    </div>
  );
}
