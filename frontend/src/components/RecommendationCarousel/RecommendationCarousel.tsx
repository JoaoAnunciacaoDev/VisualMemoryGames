import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  recommendationDetailsQuery,
  type RecommendationGame,
} from '@/features/recommendations/queries';
import RecommendationCard from './RecommendationCard';
import styles from './RecommendationCarousel.module.css';

interface Props {
  title: string;
  games: RecommendationGame[];
}

export default function RecommendationCarousel({ title, games }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const expandedGame = games.find((game) => game.id === expandedId);
  const detailsQuery = useQuery(recommendationDetailsQuery(
    expandedGame?.external_id ?? null,
    expandedGame?.source,
  ));

  useEffect(() => {
    if (expandedId) {
      cardRefs.current[expandedId]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [expandedId]);

  if (games.length === 0) return null;

  return (
    <section className={styles.carouselSection}>
      <h3 className={styles.carouselTitle}>{title}</h3>
      <div className={styles.carouselContainer}>
        <div className={`${styles.carouselTrack} scrollbar-visualmemory`}>
          {games.map((game) => {
            const expanded = expandedId === game.id;
            return (
              <RecommendationCard
                key={game.id}
                game={game}
                details={expanded ? detailsQuery.data : undefined}
                expanded={expanded}
                loading={expanded && detailsQuery.isFetching}
                cardRef={(element) => {
                  cardRefs.current[game.id] = element;
                }}
                onToggle={() => setExpandedId(expanded ? null : game.id)}
                onClose={() => setExpandedId(null)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
