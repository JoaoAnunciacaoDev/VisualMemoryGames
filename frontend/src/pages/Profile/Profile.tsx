import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Card from '@/components/Shared/Card/Card';
import PageTitle from '@/components/Shared/PageTitle/PageTitle';
import { translateGenre } from '@/utils/genres';
import { resolveImageUrl } from '@/services/media';
import styles from './Profile.module.css';

interface DashboardGame {
  title: string;
  cover_url: string | null;
  hours_played: number;
  rating: number | null;
  finished_at: string | null;
}

interface YearlyGames {
  year: number;
  games: DashboardGame[];
}

interface DashboardData {
  username: string;
  email: string;
  created_at: string | null;
  games_count: number;
  lists_count: number;
  tierlists_count: number;
  status_distribution: Record<string, number>;
  most_played_genre: string | null;
  yearly_games: YearlyGames[];
}

export default function Profile() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBoardYear, setSelectedBoardYear] = useState<number>(new Date().getFullYear());
  const [selectedBoardMonth, setSelectedBoardMonth] = useState<string>('all');

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    api.get('/users/me/dashboard')
      .then((res) => {
        const d: DashboardData = res.data;
        setData(d);
        if (d.yearly_games && d.yearly_games.length > 0) {
          setSelectedBoardYear(d.yearly_games[0].year);
        }
      })
      .catch(() => {
        showToast('Erro ao carregar dados do perfil.', 'error');
        navigate('/library');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate, showToast]);

  const getFilteredBoardGames = () => {
    if (!data) return [];
    const yearGroup = data.yearly_games.find((yg) => yg.year === selectedBoardYear);
    if (!yearGroup) return [];

    if (selectedBoardMonth === 'all') {
      return yearGroup.games;
    }

    const monthInt = parseInt(selectedBoardMonth, 10);
    return yearGroup.games.filter((game) => {
      if (!game.finished_at) return false;
      const date = new Date(game.finished_at);
      return date.getMonth() === monthInt;
    });
  };

  const boardGames = getFilteredBoardGames();

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Carregando perfil...</p>
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Data desconhecida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusPercentage = (count: number) => {
    if (data.games_count === 0) return 0;
    return Math.round((count / data.games_count) * 100);
  };

  const statusColors: Record<string, string> = {
    'Quero Jogar': 'var(--primary)',
    'Jogando': '#3b82f6',
    'Zerado': '#10b981',
    'Platinado': '#f59e0b',
    'Abandonado': '#ef4444',
    'Em Espera': '#6b7280',
  };

  return (
    <div className={styles.container}>
      {/* Header do Perfil */}
      <section className={styles.profileHeader}>
        <div className={styles.avatarLarge}>
          {data.username.charAt(0).toUpperCase()}
        </div>
        <div className={styles.profileInfo}>
          <PageTitle level="h1" className={styles.usernameTitle}>{data.username}</PageTitle>
          <p className={styles.emailText}>{data.email}</p>
          <p className={styles.joinedText}>
            Membro desde {formatDate(data.created_at)}
          </p>
        </div>
      </section>

      {/* Grade de Estatísticas Principais */}
      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <span className={styles.statValue}>{data.games_count}</span>
          <span className={styles.statLabel}>Jogos na Biblioteca</span>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statValue}>{data.lists_count}</span>
          <span className={styles.statLabel}>Listas Criadas</span>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statValue}>{data.tierlists_count}</span>
          <span className={styles.statLabel}>Tier Lists</span>
        </Card>
      </div>

      <div className={styles.detailsSection}>
        {/* Distribuição de Status */}
        <Card className={styles.detailsCard}>
          <h3 className={styles.cardTitle}>Distribuição por Status</h3>
          <div className={styles.statusList}>
            {Object.entries(data.status_distribution).map(([status, count]) => {
              const pct = getStatusPercentage(count);
              const color = statusColors[status] || 'var(--text-secondary)';
              return (
                <div key={status} className={styles.statusItem}>
                  <div className={styles.statusMeta}>
                    <span className={styles.statusName}>{status}</span>
                    <span className={styles.statusCount}>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {Object.keys(data.status_distribution).length === 0 && (
              <p className={styles.emptyText}>Nenhum jogo cadastrado com status.</p>
            )}
          </div>
        </Card>

        {/* Gênero Favorito */}
        <Card className={styles.detailsCard}>
          <h3 className={styles.cardTitle}>Gênero Favorito</h3>
          {data.most_played_genre ? (
            <div className={styles.genreHighlight}>
              <div className={styles.gamepadIcon}>🎮</div>
              <span className={styles.genreName}>
                {translateGenre(data.most_played_genre)}
              </span>
              <p className={styles.genreDesc}>
                Este é o gênero mais proeminente e jogado em sua biblioteca do GameLog.
              </p>
            </div>
          ) : (
            <div className={styles.genreHighlight}>
              <div className={styles.gamepadIcon}>❓</div>
              <p className={styles.emptyText}>Adicione jogos com gêneros para gerar estatísticas.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Board de Conclusões Interativo */}
      <section className={styles.boardSection}>
        <Card className={styles.boardCard}>
          <div className={styles.boardHeader}>
            <h3 className={styles.boardTitle}>Painel de Conclusões</h3>
            <div className={styles.boardFilters}>
              <select
                className={styles.boardSelect}
                value={selectedBoardYear}
                onChange={(e) => {
                  setSelectedBoardYear(Number(e.target.value));
                  setSelectedBoardMonth('all');
                }}
              >
                {data.yearly_games.map((yg) => (
                  <option key={yg.year} value={yg.year}>{yg.year}</option>
                ))}
                {data.yearly_games.length === 0 && (
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                )}
              </select>

              <select
                className={styles.boardSelect}
                value={selectedBoardMonth}
                onChange={(e) => setSelectedBoardMonth(e.target.value)}
              >
                <option value="all">Todos os Meses</option>
                {MONTH_NAMES.map((monthName, index) => (
                  <option key={index} value={index}>{monthName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.boardContent}>
            <div className={styles.boardCounterWrapper}>
              <span className={styles.boardCount}>{boardGames.length}</span>
              <span className={styles.boardCountLabel}>
                {boardGames.length === 1 ? 'jogo concluído' : 'jogos concluídos'} em{' '}
                {selectedBoardMonth === 'all'
                  ? `todo o ano de ${selectedBoardYear}`
                  : `${MONTH_NAMES[Number(selectedBoardMonth)]} de ${selectedBoardYear}`}
              </span>
            </div>

            {boardGames.length > 0 ? (
              <div className={styles.boardGamesGrid}>
                {boardGames.map((game, index) => (
                  <div key={index} className={styles.boardGameMiniCard}>
                    {game.cover_url ? (
                      <img
                        src={resolveImageUrl(game.cover_url)}
                        alt={game.title}
                        className={styles.boardGameCover}
                      />
                    ) : (
                      <div className={styles.boardGameCoverPlaceholder}>
                        <span>Sem capa</span>
                      </div>
                    )}
                    <div className={styles.boardGameDetails}>
                      <span className={styles.boardGameTitle} title={game.title}>
                        {game.title}
                      </span>
                      <span className={styles.boardGameMeta}>
                        🕒 {game.hours_played}h {game.rating !== null && ` | ⭐ ${game.rating}/10`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.boardEmptyText}>
                Nenhum jogo concluído neste período.
              </p>
            )}
          </div>
        </Card>
      </section>

    </div>
  );
}
