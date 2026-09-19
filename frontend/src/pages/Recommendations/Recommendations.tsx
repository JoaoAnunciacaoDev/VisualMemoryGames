import { useQuery } from '@tanstack/react-query';
import styles from './Recommendations.module.css';
import RecommendationCarousel from '@/components/RecommendationCarousel/RecommendationCarousel';
import { Loader } from '@/components/Shared';
import { recommendationsQuery } from '@/features/recommendations/queries';

export default function Recommendations() {
  const { data: categories = [], isPending, isError } = useQuery(recommendationsQuery());

  if (isPending) {
    return <Loader message="Buscando as melhores recomendações para você..." minHeight="80vh" />;
  }

  if (isError) return <p className={styles.page}>Erro ao buscar recomendações.</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Para Você</h1>
      
      {categories.length === 0 ? (
        <p>Ainda não temos recomendações suficientes. Adicione mais jogos à sua biblioteca, dê notas e favorite para gerarmos seu perfil!</p>
      ) : (
        categories.map((category, index) => (
          <RecommendationCarousel 
            key={index} 
            title={category.title} 
            games={category.games} 
          />
        ))
      )}
    </div>
  );
}
