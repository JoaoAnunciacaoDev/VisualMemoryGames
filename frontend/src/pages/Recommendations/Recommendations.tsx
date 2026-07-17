import { useEffect, useState } from 'react';
import styles from './Recommendations.module.css';
import RecommendationCarousel from '@/components/RecommendationCarousel/RecommendationCarousel';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';

interface RecommendationCategory {
  title: string;
  games: any[];
}

export default function Recommendations() {
  const [categories, setCategories] = useState<RecommendationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await api.get('/users/me/recommendations');
        setCategories(response.data);
      } catch (err) {
        showToast('Erro ao buscar recomendações.', 'error');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) { 
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.loader}></div>
        <p>Buscando as melhores recomendações para você...</p>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Para Você</h1>
      
      {categories.length === 0 ? (
        <p>Ainda não temos recomendações suficientes. Adicione mais jogos à sua biblioteca, dê notas e favorites para gerarmos seu perfil!</p>
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
