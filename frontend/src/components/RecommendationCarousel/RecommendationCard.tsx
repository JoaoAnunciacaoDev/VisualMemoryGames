import { Star, X } from 'lucide-react';
import { Button } from '@/components/Shared';
import type {
  RecommendationGame,
  RecommendationGameDetails,
} from '@/features/recommendations/queries';
import styles from './RecommendationCarousel.module.css';

interface Props {
  game: RecommendationGame;
  details?: RecommendationGameDetails;
  expanded: boolean;
  loading: boolean;
  cardRef: (element: HTMLDivElement | null) => void;
  onToggle: () => void;
  onClose: () => void;
}

const openExternalLink = (url: string) =>
  window.open(url, '_blank', 'noopener,noreferrer');

export default function RecommendationCard({
  game,
  details,
  expanded,
  loading,
  cardRef,
  onToggle,
  onClose,
}: Props) {
  const providerUrl = game.source === 'igdb'
    ? `https://www.igdb.com/search?q=${encodeURIComponent(game.title)}`
    : game.source === 'rawg'
      ? `https://rawg.io/games/${game.external_id}`
      : null;
  const providerLabel = game.source === 'igdb' ? 'Ver no IGDB' : 'Ver no RAWG';

  return (
    <article
      ref={cardRef}
      className={`${styles.card} ${expanded ? styles.expanded : ''}`}
      onClick={onToggle}
      role={expanded ? undefined : 'button'}
      tabIndex={expanded ? undefined : 0}
      aria-expanded={expanded ? undefined : false}
      onKeyDown={(event) => {
        if (!expanded && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <div className={styles.mediaContainer}>
        {expanded && details?.trailer_url ? (
          <video
            className={styles.videoPlayer}
            src={details.trailer_url}
            autoPlay
            controls
            muted
          />
        ) : game.cover_url ? (
          <img src={game.cover_url} alt={game.title} className={styles.coverImage} />
        ) : (
          <div className={styles.coverFallback}>Sem Imagem</div>
        )}
        {expanded && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            aria-label="Fechar detalhes"
          >
            <X aria-hidden="true" size={18} />
          </button>
        )}
      </div>

      <div className={styles.cardContent}>
        <h4 className={styles.title}>{game.title}</h4>
        <div className={styles.year}>{game.release_year || 'Ano Desconhecido'}</div>

        {expanded && (
          <div className={styles.details} onClick={(event) => event.stopPropagation()}>
            {loading ? (
              <div className={styles.loader} aria-label="Carregando detalhes" />
            ) : (
              <>
                {details?.rating && (
                  <div className={styles.rating}>
                    <Star aria-hidden="true" size={16} />{' '}
                    {Math.round(details.rating * 20) / 10} / 10
                  </div>
                )}
                <div className={styles.genres}>
                  {details?.genres?.map((genre) => (
                    <span key={genre} className={styles.genreTag}>{genre}</span>
                  ))}
                </div>
                <div className={`${styles.synopsis} scrollbar-visualmemory`}>
                  {details?.synopsis || 'Sem descrição disponível.'}
                </div>
                <div className={styles.links}>
                  {providerUrl && (
                    <Button variant="primary" onClick={() => openExternalLink(providerUrl)}>
                      {providerLabel}
                    </Button>
                  )}
                  {details?.trailer_url && (
                    <Button variant="ghost" onClick={() => openExternalLink(details.trailer_url!)}>
                      Trailer Completo
                    </Button>
                  )}
                  {details?.stores && details.stores.length > 0 && (
                    <div className={styles.storeLinks}>
                      {details.stores.map((store) => (
                        <Button
                          key={store.id}
                          variant="ghost"
                          onClick={() => openExternalLink(store.url)}
                        >
                          {store.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
