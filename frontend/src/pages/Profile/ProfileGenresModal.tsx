import { ArrowLeft, Clock3, Star } from 'lucide-react';
import { Loader, Modal } from '@/components/Shared';
import type { LibraryGame } from '@/types';
import { getBestGameCover } from '@/services/media';
import { translateGenre } from '@/utils/genres';
import { STATUS_COLORS } from './profileUtils';
import styles from './Profile.module.css';

export default function ProfileGenresModal({
  gameCount,
  distribution,
  selectedGenre,
  games,
  loadingGames,
  onSelectGenre,
  onClose,
}: {
  gameCount: number;
  distribution: Record<string, number>;
  selectedGenre: string | null;
  games: LibraryGame[];
  loadingGames: boolean;
  onSelectGenre: (genre: string | null) => void;
  onClose: () => void;
}) {
  const selectedGames = selectedGenre
    ? games.filter((game) => Array.isArray(game.genres) && game.genres.includes(selectedGenre))
    : [];

  return (
    <Modal open onClose={onClose} maxWidth="600px" showCloseButton>
      <div className={styles.genresModalContainer}>
        {!selectedGenre ? (
          <>
            <h3 className={styles.modalHeading}>Distribuição de Gêneros</h3>
            <p className={styles.modalSubheading}>Frequência de gêneros presentes em seus {gameCount} jogos. Selecione um gênero para ver os jogos.</p>
            <div className={`${styles.genresGrid} scrollbar-visualmemory`}>
              {Object.entries(distribution).sort((a, b) => b[1] - a[1]).map(([genre, count]) => {
                const percentage = gameCount > 0 ? Math.round((count / gameCount) * 100) : 0;
                const radius = 30;
                const circumference = 2 * Math.PI * radius;
                return (
                  <button
                    type="button"
                    key={genre}
                    className={`${styles.genreProgressCard} ${styles.clickableCard}`}
                    onClick={() => onSelectGenre(genre)}
                  >
                    <div className={styles.circularProgressWrapper}>
                      <svg className={styles.circularSvg} width="80" height="80" aria-hidden="true">
                        <circle className={styles.circularBg} cx="40" cy="40" r={radius} />
                        <circle
                          className={styles.circularFill}
                          cx="40"
                          cy="40"
                          r={radius}
                          style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: circumference - (percentage / 100) * circumference,
                          }}
                        />
                      </svg>
                      <span className={styles.percentageText}>{percentage}%</span>
                    </div>
                    <div className={styles.genreProgressInfo}>
                      <strong className={styles.genreProgressName}>{translateGenre(genre)}</strong>
                      <span className={styles.genreProgressCount}>{count} {count === 1 ? 'jogo' : 'jogos'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className={styles.genreDetailsHeader}>
              <button type="button" className={styles.backButton} onClick={() => onSelectGenre(null)}>
                <ArrowLeft aria-hidden="true" size={16} /> Voltar
              </button>
              <h3 className={styles.modalHeading}>Jogos de {translateGenre(selectedGenre)}</h3>
            </div>
            {loadingGames ? <Loader message="Carregando jogos..." minHeight="200px" /> : (
              <div className={`${styles.genreGamesList} scrollbar-visualmemory`}>
                {selectedGames.map((game) => {
                  const cover = getBestGameCover(game);
                  return (
                    <div key={game.id} className={styles.genreGameCard}>
                      {cover
                        ? <img src={cover} alt={game.title} className={styles.genreGameCover} />
                        : <div className={styles.genreGameCoverPlaceholder}><span>Sem Capa</span></div>}
                      <div className={styles.genreGameInfo}>
                        <h4 className={styles.genreGameTitle} title={game.title}>{game.title}</h4>
                        <div className={styles.genreGameMeta}>
                          <span className={styles.genreGameStatus} style={{ color: STATUS_COLORS[game.status] || 'var(--text-secondary)' }}>{game.status}</span>
                          {game.hours_played != null && game.hours_played > 0 && <span className={styles.genreGameHours}><Clock3 aria-hidden="true" size={14} /> {game.hours_played}h</span>}
                          {game.rating !== null && <span className={styles.genreGameRating}><Star aria-hidden="true" size={14} /> {game.rating}/10</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
