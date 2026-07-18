import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Card, PageTitle, Button, Modal } from '@/components/Shared';
import { translateGenre } from '@/utils/genres';
import { resolveImageUrl } from '@/services/media';
import { LibraryGame } from '@/types';
import styles from './Profile.module.css';
import FollowListModal from './FollowListModal';

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
  favorites_count: number;
  status_distribution: Record<string, number>;
  most_played_genre: string | null;
  genre_distribution: Record<string, number>;
  has_pending_genres: boolean;
  followers_count: number;
  following_count: number;
  yearly_games: YearlyGames[];
  yearly_platinums: YearlyGames[];
}

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBoardYear, setSelectedBoardYear] = useState<number>(new Date().getFullYear());
  const [selectedBoardMonth, setSelectedBoardMonth] = useState<string>('all');
  const [selectedPlatYear, setSelectedPlatYear] = useState<number>(new Date().getFullYear());
  const [selectedPlatMonth, setSelectedPlatMonth] = useState<string>('all');
  const [boardCollapsed, setBoardCollapsed] = useState(false);
  const [platCollapsed, setPlatCollapsed] = useState(false);
  const [showGenresModal, setShowGenresModal] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [userGames, setUserGames] = useState<LibraryGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [followModal, setFollowModal] = useState<{isOpen: boolean, type: 'followers' | 'following'}>({ isOpen: false, type: 'followers' });

  const handleCloseModal = () => {
    setShowGenresModal(false);
    setSelectedGenre(null);
  };

  useEffect(() => {
    if (!showGenresModal || userGames.length > 0) return;

    const fetchGames = async () => {
      setLoadingGames(true);
      try {
        const endpoint = userId ? `/user-games/user/${userId}` : '/user-games/me';
        const res = await api.get(endpoint);
        setUserGames(res.data);
      } catch (err) {
        console.error('Erro ao carregar jogos da biblioteca:', err);
      } finally {
        setLoadingGames(false);
      }
    };

    void fetchGames();
  }, [showGenresModal, userGames.length, userId]);

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const endpoint = userId ? `/users/${userId}/dashboard` : '/users/me/dashboard';
    
    api.get(endpoint)
      .then((res) => {
        const d: DashboardData = res.data;
        setData(d);
        if (d.yearly_games && d.yearly_games.length > 0) {
          setSelectedBoardYear(d.yearly_games[0].year);
        }
        if (d.yearly_platinums && d.yearly_platinums.length > 0) {
          setSelectedPlatYear(d.yearly_platinums[0].year);
        }
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          showToast('Perfil privado ou você não tem permissão.', 'error');
        } else {
          showToast('Erro ao carregar dados do perfil.', 'error');
        }
        navigate('/library');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate, showToast, userId]);

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

  const getFilteredPlatGames = () => {
    if (!data) return [];
    const yearGroup = data.yearly_platinums.find((yg) => yg.year === selectedPlatYear);
    if (!yearGroup) return [];

    if (selectedPlatMonth === 'all') {
      return yearGroup.games;
    }

    const monthInt = parseInt(selectedPlatMonth, 10);
    return yearGroup.games.filter((game) => {
      if (!game.finished_at) return false;
      const date = new Date(game.finished_at);
      return date.getMonth() === monthInt;
    });
  };

  const boardGames = getFilteredBoardGames();
  const platGames = getFilteredPlatGames();

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
          <div className={styles.followStats}>
            <span 
              className={styles.followStatItem} 
              onClick={() => setFollowModal({ isOpen: true, type: 'followers' })}
              style={{ cursor: 'pointer' }}
            >
              <strong>{data.followers_count}</strong> seguidores
            </span>
            <span 
              className={styles.followStatItem}
              onClick={() => setFollowModal({ isOpen: true, type: 'following' })}
              style={{ cursor: 'pointer' }}
            >
              <strong>{data.following_count}</strong> seguindo
            </span>
          </div>
        </div>
      </section>

      {followModal.isOpen && (
        <FollowListModal 
          userId={userId || 'me'} 
          type={followModal.type} 
          onClose={() => setFollowModal({ isOpen: false, type: 'followers' })} 
        />
      )}

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
        <Card className={styles.statCard}>
          <span className={styles.statValue}>{data.favorites_count}</span>
          <span className={styles.statLabel}>Jogos Favoritos</span>
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
                Este é o gênero mais proeminente e jogado em sua biblioteca do VisualMemory.
              </p>
              {data.genre_distribution && Object.keys(data.genre_distribution).length > 0 && (
                <Button
                  variant="ghost"
                  className={styles.viewGenresButton}
                  onClick={() => setShowGenresModal(true)}
                >
                  Ver todos os gêneros
                </Button>
              )}
            </div>
          ) : (
            <div className={styles.genreHighlight}>
              <div className={styles.gamepadIcon}>❓</div>
              <p className={styles.emptyText}>Adicione jogos com gêneros para gerar estatísticas.</p>
            </div>
          )}

          {data.has_pending_genres && (
            <div className={styles.pendingGenresNotice}>
              <span className={styles.pendingGenresIcon}>🔄</span>
              <span className={styles.pendingGenresText}>
                Sincronizando gêneros e anos de lançamento da Steam em segundo plano, os dados serão atualizados gradualmente.
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Board de Conclusões Interativo */}
      <section className={styles.boardSection}>
        <Card className={styles.boardCard}>
          <div
            className={styles.boardHeader}
            onClick={() => setBoardCollapsed(!boardCollapsed)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.boardTitleWrapper}>
              <span className={styles.collapseIcon}>
                {boardCollapsed ? '▶' : '▼'}
              </span>
              <h3 className={styles.boardTitle}>Painel de Conclusões (Zerados)</h3>
            </div>
            <div className={styles.boardFilters} onClick={(e) => e.stopPropagation()}>
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

          {!boardCollapsed && (
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
          )}
        </Card>
      </section>

      {/* Board de Conclusões Puras (Platinados) */}
      <section className={styles.boardSection}>
        <Card className={styles.boardCard}>
          <div
            className={styles.boardHeader}
            onClick={() => setPlatCollapsed(!platCollapsed)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.boardTitleWrapper}>
              <span className={styles.collapseIcon}>
                {platCollapsed ? '▶' : '▼'}
              </span>
              <h3 className={styles.boardTitle}>Painel de Conclusões Puras (Platinados)</h3>
            </div>
            <div className={styles.boardFilters} onClick={(e) => e.stopPropagation()}>
              <select
                className={styles.boardSelect}
                value={selectedPlatYear}
                onChange={(e) => {
                  setSelectedPlatYear(Number(e.target.value));
                  setSelectedPlatMonth('all');
                }}
              >
                {data.yearly_platinums.map((yg) => (
                  <option key={yg.year} value={yg.year}>{yg.year}</option>
                ))}
                {data.yearly_platinums.length === 0 && (
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                )}
              </select>

              <select
                className={styles.boardSelect}
                value={selectedPlatMonth}
                onChange={(e) => setSelectedPlatMonth(e.target.value)}
              >
                <option value="all">Todos os Meses</option>
                {MONTH_NAMES.map((monthName, index) => (
                  <option key={index} value={index}>{monthName}</option>
                ))}
              </select>
            </div>
          </div>

          {!platCollapsed && (
            <div className={styles.boardContent}>
              <div className={styles.boardCounterWrapper}>
                <span className={styles.boardCount}>{platGames.length}</span>
                <span className={styles.boardCountLabel}>
                  {platGames.length === 1 ? 'jogo platinado' : 'jogos platinados'} em{' '}
                  {selectedPlatMonth === 'all'
                    ? `todo o ano de ${selectedPlatYear}`
                    : `${MONTH_NAMES[Number(selectedPlatMonth)]} de ${selectedPlatYear}`}
                </span>
              </div>

              {platGames.length > 0 ? (
                <div className={styles.boardGamesGrid}>
                  {platGames.map((game, index) => (
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
                  Nenhum jogo platinado neste período.
                </p>
              )}
            </div>
          )}
        </Card>
      </section>

      {showGenresModal && (
        <Modal
          open={showGenresModal}
          onClose={handleCloseModal}
          maxWidth="600px"
          showCloseButton
        >
          <div className={styles.genresModalContainer}>
            {!selectedGenre ? (
              <>
                <h3 className={styles.modalHeading}>Distribuição de Gêneros</h3>
                <p className={styles.modalSubheading}>
                  Frequência de gêneros presentes em seus {data.games_count} jogos. Clique em um gênero para ver os jogos.
                </p>
                <div className={`${styles.genresGrid} scrollbar-visualmemory`}>
                  {Object.entries(data.genre_distribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([genre, count]) => {
                      const pct = data.games_count > 0 ? Math.round((count / data.games_count) * 100) : 0;
                      const radius = 30;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (pct / 100) * circumference;

                      return (
                        <div
                          key={genre}
                          className={`${styles.genreProgressCard} ${styles.clickableCard}`}
                          onClick={() => setSelectedGenre(genre)}
                        >
                          <div className={styles.circularProgressWrapper}>
                            <svg className={styles.circularSvg} width="80" height="80">
                              <circle
                                className={styles.circularBg}
                                cx="40"
                                cy="40"
                                r={radius}
                              />
                              <circle
                                className={styles.circularFill}
                                cx="40"
                                cy="40"
                                r={radius}
                                style={{
                                  strokeDasharray: circumference,
                                  strokeDashoffset: strokeDashoffset,
                                }}
                              />
                            </svg>
                            <span className={styles.percentageText}>{pct}%</span>
                          </div>
                          <div className={styles.genreProgressInfo}>
                            <strong className={styles.genreProgressName}>
                              {translateGenre(genre)}
                            </strong>
                            <span className={styles.genreProgressCount}>
                              {count} {count === 1 ? 'jogo' : 'jogos'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <>
                <div className={styles.genreDetailsHeader}>
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={() => setSelectedGenre(null)}
                  >
                    ← Voltar
                  </button>
                  <h3 className={styles.modalHeading}>
                    Jogos de {translateGenre(selectedGenre)}
                  </h3>
                </div>
                
                {loadingGames ? (
                  <div className={styles.modalLoaderContainer}>
                    <div className={styles.loader}></div>
                    <p>Carregando jogos...</p>
                  </div>
                ) : (
                  <div className={`${styles.genreGamesList} scrollbar-visualmemory`}>
                    {userGames
                      .filter((ug) => {
                        if (!ug.genres || !Array.isArray(ug.genres)) return false;
                        return ug.genres.includes(selectedGenre);
                      })
                      .map((ug) => {
                        const cover = ug.custom_cover_url || ug.cover_url;
                        return (
                          <div key={ug.id} className={styles.genreGameCard}>
                            {cover ? (
                              <img
                                src={resolveImageUrl(cover)}
                                alt={ug.title}
                                className={styles.genreGameCover}
                              />
                            ) : (
                              <div className={styles.genreGameCoverPlaceholder}>
                                <span>Sem Capa</span>
                              </div>
                            )}
                            <div className={styles.genreGameInfo}>
                              <h4 className={styles.genreGameTitle} title={ug.title}>
                                {ug.title}
                              </h4>
                              <div className={styles.genreGameMeta}>
                                <span
                                  className={styles.genreGameStatus}
                                  style={{
                                    color: statusColors[ug.status] || 'var(--text-secondary)',
                                  }}
                                >
                                  {ug.status}
                                </span>
                                {ug.hours_played != null && ug.hours_played > 0 && (
                                  <span className={styles.genreGameHours}>
                                    🕒 {ug.hours_played}h
                                  </span>
                                )}
                                {ug.rating !== null && (
                                  <span className={styles.genreGameRating}>
                                    ⭐ {ug.rating}/10
                                  </span>
                                )}
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
      )}
    </div>
  );
}
