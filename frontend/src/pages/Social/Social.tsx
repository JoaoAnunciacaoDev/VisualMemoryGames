import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from '@/services/api';
import styles from "./Social.module.css";
import { formatDate, formatDateTime } from "@/utils/date";
import { Loader } from "@/components/Shared";

interface Game {
  id: string;
  external_id: number;
  title: string;
  cover_url: string;
  release_year: number;
  platforms: string[];
  genres: string[];
}

interface UserProfile {
  id: string;
  username: string;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean | null;
}

interface Activity {
  id: number;
  user_id: string;
  username: string;
  game: Game | null;
  action_type: string;
  context: string | null;
  created_at: string;
  target_user?: UserProfile | null;
  tierlist_id?: string | null;
  tierlist_title?: string | null;
  commentary?: string | null;
}

interface RawgRelease {
  title: string;
  cover_url: string | null;
  release_date: string | null;
  genres: string[];
}

interface PaginatedActivities {
  items: Activity[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface FeedData {
  activities: PaginatedActivities;
  rawg_releases: RawgRelease[];
}

const Social: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"feed" | "my-activities" | "search">("feed");
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);

  const [myActivities, setMyActivities] = useState<Activity[]>([]);
  const [myPage, setMyPage] = useState(1);
  const [myTotalPages, setMyTotalPages] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const loadFeed = async (m: number, y: number, page: number = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/social/feed', {
        params: { month: m, year: y, page }
      });
      setFeedData(res.data);
      setFeedPage(res.data.activities?.page || page);
      setFeedTotalPages(res.data.activities?.total_pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyActivities = async (m: number, y: number, page: number = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/social/activities/me', {
        params: { month: m, year: y, page }
      });
      setMyActivities(res.data.items || []);
      setMyPage(res.data.page || page);
      setMyTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "feed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadFeed(selectedMonth, selectedYear, 1);
    } else if (activeTab === "my-activities") {
      loadMyActivities(selectedMonth, selectedYear, 1);
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const handlePageChange = (newPage: number) => {
    if (activeTab === "feed") {
      loadFeed(selectedMonth, selectedYear, newPage);
    } else if (activeTab === "my-activities") {
      loadMyActivities(selectedMonth, selectedYear, newPage);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPageNumbers = (current: number, total: number): (number | '...')[] => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, '...', total];
    if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const renderPagination = (currentPage: number, totalPages: number) => {
    if (totalPages <= 1) return null;
    return (
      <div className={styles.pagination}>
        <button
          className={styles.pageBtn}
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
        >
          ‹ Anterior
        </button>

        {getPageNumbers(currentPage, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
          ) : (
            <button
              key={`page-${p}`}
              className={`${styles.pageBtn} ${p === currentPage ? styles.activePage : ''}`}
              onClick={() => handlePageChange(p as number)}
            >
              {p}
            </button>
          )
        )}

        <button
          className={styles.pageBtn}
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          Próximo ›
        </button>
      </div>
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/social/users/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        await api.delete(`/social/users/${userId}/follow`);
      } else {
        await api.post(`/social/users/${userId}/follow`);
      }
      
      setSearchResults((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              is_following: !currentlyFollowing,
              followers_count: currentlyFollowing
                ? u.followers_count - 1
                : u.followers_count + 1,
            };
          }
          return u;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const renderActionText = (activity: Activity) => {
    switch (activity.action_type) {
      case "ADDED":
        return "adicionou à biblioteca";
      case "UPDATED_STATUS":
        return `mudou o status para ${activity.context?.replace("_", " ")}`;
      case "RATED":
        return `avaliou com ${activity.context} estrelas`;
      case "PLATINUM":
        return "platinou";
      default:
        return "interagiu com";
    }
  };

  const renderActivityHeader = (act: Activity) => {
    const userLink = (
      <span className={styles.username}>
        <Link to={`/profile/${act.username}`}>{act.username}</Link>
      </span>
    );

    if (act.action_type === "FOLLOW" && act.target_user) {
      return (
        <>
          {userLink} começou a seguir{" "}
          <span className={styles.targetUsername}>
            <Link to={`/profile/${act.target_user.username}`}>{act.target_user.username}</Link>
          </span>
        </>
      );
    }

    if (act.action_type === "CREATED_TIERLIST") {
      return (
        <>
          {userLink} criou a Tier List{" "}
          <span className={styles.tierlistLink}>
            <Link to={`/tierlists/${act.tierlist_id}`}>{act.tierlist_title}</Link>
          </span>
        </>
      );
    }

    if (act.action_type === "UPDATED_TIERLIST") {
      return (
        <>
          {userLink} atualizou a Tier List{" "}
          <span className={styles.tierlistLink}>
            <Link to={`/tierlists/${act.tierlist_id}`}>{act.tierlist_title}</Link>
          </span>
        </>
      );
    }

    return (
      <>
        {userLink} <span className={styles.actionText}>{renderActionText(act)}</span>{" "}
        <span className={styles.gameTitle}>{act.game?.title}</span>
      </>
    );
  };

  const renderActivityList = (activities: Activity[], emptyMessage: string) => {
    if (activities.length === 0) {
      return <p className={styles.empty}>{emptyMessage}</p>;
    }

    return (
      <div className={styles.activityList}>
        {activities.map((act) => (
          <div key={act.id} className={styles.activityCard}>
            <div className={styles.actHeader}>
              {renderActivityHeader(act)}
            </div>
            {act.game && act.game.cover_url && (
              <img
                src={act.game.cover_url}
                alt={act.game.title}
                className={styles.actCover}
              />
            )}
            {act.action_type === "RATED" && act.commentary && (
              <div className={styles.commentaryBox}>
                <span className={styles.commentaryQuote}>“</span>
                <p className={styles.commentaryText}>{act.commentary}</p>
                <span className={styles.commentaryQuote}>”</span>
              </div>
            )}
            <div className={styles.actDate}>
              {formatDateTime(act.created_at)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.socialContainer}>
      <h1 className={styles.pageTitle}>Social</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === "feed" ? styles.active : ""}`}
          onClick={() => setActiveTab("feed")}
        >
          Feed de Notícias
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "my-activities" ? styles.active : ""}`}
          onClick={() => setActiveTab("my-activities")}
        >
          Minhas Atividades
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "search" ? styles.active : ""}`}
          onClick={() => setActiveTab("search")}
        >
          Encontrar Pessoas
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "feed" && (
          <div className={styles.feedLayout}>
            <div className={styles.mainFeed}>
              <div className={styles.feedHeaderRow}>
                <h2>Atividades Recentes</h2>
                <div className={styles.feedFilters}>
                  <select
                    className={styles.filterSelect}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    disabled={loading}
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    className={styles.filterSelect}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    disabled={loading}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              {loading && <Loader message="Carregando feed..." />}
              {!loading && (
                <>
                  {renderActivityList(feedData?.activities?.items || [], "Nenhuma atividade recente. Siga mais pessoas!")}
                  {renderPagination(feedPage, feedTotalPages)}
                </>
              )}
            </div>

            <div className={styles.sidebarFeed}>
              <h2>Lançamentos da Semana</h2>
              {feedData?.rawg_releases?.map((rel, idx) => (
                <div key={idx} className={styles.releaseCard}>
                  {rel.cover_url && (
                    <img
                      src={rel.cover_url}
                      alt={rel.title}
                      className={styles.releaseCover}
                    />
                  )}
                  <div className={styles.releaseInfo}>
                    <h4>{rel.title}</h4>
                    <p>{formatDate(rel.release_date)}</p>
                    <p className={styles.releaseGenres}>{rel.genres.slice(0, 3).join(", ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "my-activities" && (
          <div className={styles.myActivitiesLayout}>
            <div className={styles.mainFeed}>
              <div className={styles.feedHeaderRow}>
                <h2>Minhas Atividades</h2>
                <div className={styles.feedFilters}>
                  <select
                    className={styles.filterSelect}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    disabled={loading}
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    className={styles.filterSelect}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    disabled={loading}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              {loading && <Loader message="Carregando minhas atividades..." />}
              {!loading && (
                <>
                  {renderActivityList(myActivities, "Você ainda não tem nenhuma atividade registrada no período selecionado.")}
                  {renderPagination(myPage, myTotalPages)}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "search" && (
          <div className={styles.searchSection}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <input
                type="text"
                placeholder="Pesquisar por nome de usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchBtn} disabled={loading}>
                Buscar
              </button>
            </form>

            <div className={styles.userList}>
              {loading && <p>Pesquisando...</p>}
              {!loading && searchResults.length === 0 && searchQuery && (
                <p className={styles.empty}>Nenhum usuário encontrado.</p>
              )}
              {searchResults.map((user) => (
                <div key={user.id} className={styles.userCard}>
                  <div className={styles.userInfo}>
                    <Link to={`/profile/${user.username}`} className={styles.usernameLink}>
                      {user.username}
                    </Link>
                    <span className={styles.stats}>
                      {user.followers_count} seguidores • {user.following_count} seguindo
                    </span>
                  </div>
                  <button
                    className={`${styles.followBtn} ${
                      user.is_following ? styles.following : ""
                    }`}
                    onClick={() => handleFollow(user.id, user.is_following || false)}
                  >
                    {user.is_following ? "Deixar de Seguir" : "Seguir"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Social;
