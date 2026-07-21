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

interface Activity {
  id: number;
  user_id: string;
  username: string;
  game: Game;
  action_type: string;
  context: string | null;
  created_at: string;
}

interface RawgRelease {
  title: string;
  cover_url: string | null;
  release_date: string | null;
  genres: string[];
}

interface FeedData {
  activities: Activity[];
  rawg_releases: RawgRelease[];
}

interface UserProfile {
  id: string;
  username: string;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean | null;
}

const Social: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"feed" | "search">("feed");
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

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

  const loadFeed = async (m: number, y: number) => {
    setLoading(true);
    try {
      const res = await api.get('/social/feed', {
        params: { month: m, year: y }
      });
      setFeedData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "feed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadFeed(selectedMonth, selectedYear);
    }
  }, [activeTab, selectedMonth, selectedYear]);

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
              {!loading && feedData?.activities.length === 0 && (
                <p className={styles.empty}>Nenhuma atividade recente. Siga mais pessoas!</p>
              )}
              <div className={styles.activityList}>
                {feedData?.activities.map((act) => (
                  <div key={act.id} className={styles.activityCard}>
                    <div className={styles.actHeader}>
                      <span className={styles.username}>
                        <Link to={`/profile/${act.username}`}>{act.username}</Link>
                      </span>{" "}
                      <span className={styles.actionText}>{renderActionText(act)}</span>{" "}
                      <span className={styles.gameTitle}>{act.game.title}</span>
                    </div>
                    {act.game.cover_url && (
                      <img
                        src={act.game.cover_url}
                        alt={act.game.title}
                        className={styles.actCover}
                      />
                    )}
                    <div className={styles.actDate}>
                      {formatDateTime(act.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.sidebarFeed}>
              <h2>Lançamentos da Semana</h2>
              {feedData?.rawg_releases.map((rel, idx) => (
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
