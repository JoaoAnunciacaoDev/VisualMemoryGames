import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import styles from './RecommendationCarousel.module.css';
import Button from '@/components/Shared/Button/Button';
import { Star, X } from 'lucide-react';
import {
  recommendationDetailsQuery,
  type RecommendationGame,
} from '@/features/recommendations/queries';

interface Props {
  title: string;
  games: RecommendationGame[];
}

export default function RecommendationCarousel({ title, games }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const expandedGame = games.find((game) => game.id === expandedId);
  const detailsQuery = useQuery(recommendationDetailsQuery(expandedGame?.external_id ?? null));

  const toggleExpand = (game: RecommendationGame) => {
    if (expandedId === game.id) {
      setExpandedId(null);
    } else {
      setExpandedId(game.id);
    }
  };
  
  useEffect(() => {
    if (expandedId && cardRefs.current[expandedId]) {
       cardRefs.current[expandedId]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [expandedId]);

  if (!games || games.length === 0) return null;

  return (
    <div className={styles.carouselSection}>
      <h3 className={styles.carouselTitle}>{title}</h3>
      <div className={styles.carouselContainer}>
        <div className={`${styles.carouselTrack} scrollbar-visualmemory`}>
          {games.map((game) => {
            const isExpanded = expandedId === game.id;
            const isLoading = isExpanded && detailsQuery.isFetching;
            const gameDetails = isExpanded ? detailsQuery.data : undefined;

            return (
              <div
                key={game.id}
                ref={el => cardRefs.current[game.id] = el}
                className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}
                onClick={() => toggleExpand(game)}
              >
                <div className={styles.mediaContainer}>
                  {isExpanded && gameDetails?.trailer_url ? (
                    <video 
                      className={styles.videoPlayer} 
                      src={gameDetails.trailer_url} 
                      autoPlay 
                      controls 
                      muted 
                    />
                  ) : (
                    game.cover_url ? (
                      <img src={game.cover_url} alt={game.title} className={styles.coverImage} />
                    ) : (
                      <div className={styles.coverFallback}>Sem Imagem</div>
                    )
                  )}
                  {isExpanded && (
                    <button
                      className={styles.closeButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(null);
                      }}
                      aria-label="Fechar"
                    >
                      <X aria-hidden="true" size={18} />
                    </button>
                  )}
                </div>

                <div className={styles.cardContent}>
                  <h4 className={styles.title}>{game.title}</h4>
                  <div className={styles.year}>{game.release_year || 'Ano Desconhecido'}</div>
                  
                  {isExpanded && (
                    <div className={styles.details} onClick={e => e.stopPropagation()}>
                      {isLoading ? (
                        <div className={styles.loader}></div>
                      ) : (
                        <>
                          {gameDetails?.rating && (
                            <div className={styles.rating}>
                              <Star aria-hidden="true" size={16} />{' '}
                              {Math.round(gameDetails.rating * 2 * 10) / 10} / 10
                            </div>
                          )}
                          <div className={styles.genres}>
                            {gameDetails?.genres?.map(g => (
                              <span key={g} className={styles.genreTag}>{g}</span>
                            ))}
                          </div>
                          <div className={`${styles.synopsis} scrollbar-visualmemory`}>
                            {gameDetails?.synopsis || 'Sem descrição disponível.'}
                          </div>
                          <div className={styles.links}>
                            <Button 
                              variant="primary" 
                              onClick={() => window.open(`https://rawg.io/games/${game.external_id}`, '_blank')}
                            >
                              Ver no RAWG
                            </Button>
                            {gameDetails?.trailer_url && (
                              <Button 
                                variant="ghost" 
                                onClick={() => window.open(gameDetails.trailer_url, '_blank')}
                              >
                                Trailer Completo
                              </Button>
                            )}
                            {gameDetails?.stores && gameDetails.stores.length > 0 && (
                              <div className={styles.storeLinks}>
                                {gameDetails.stores.map(store => (
                                  <Button
                                    key={store.id}
                                    variant="ghost"
                                    onClick={() => window.open(store.url, '_blank')}
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
