import React, { useEffect } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styles from "./Social.module.css";
import { formatDate, formatDateTime } from "@/utils/date";
import { Loader } from "@/components/Shared";
import {
  myActivitiesQuery,
  setFollowing,
  socialFeedQuery,
  socialKeys,
  userSearchQuery,
  type Activity,
  type UserProfile,
} from '@/features/social/queries';
import { validateSocialSearch, type SocialSearch, type SocialTab } from '@/app/search';

const Social: React.FC = () => {
  const navigate = useNavigate();
  const routeSearch = validateSocialSearch(useSearch({ strict: false }) as Record<string, unknown>);
  const {
    tab: activeTab,
    feedPage,
    myPage,
    month: selectedMonth,
    year: selectedYear,
    q: submittedSearch,
  } = routeSearch;
  const updateSearch = (updates: Partial<SocialSearch>) => navigate({
    to: '/social',
    search: (previous) => ({ ...validateSocialSearch(previous), ...updates }),
  });
  const now = new Date();
  const queryClient = useQueryClient();
  const feedQuery = useQuery({ ...socialFeedQuery(selectedMonth, selectedYear, feedPage), enabled: activeTab === 'feed' });
  const activitiesQuery = useQuery({ ...myActivitiesQuery(selectedMonth, selectedYear, myPage), enabled: activeTab === 'my-activities' });
  const searchResultsQuery = useQuery(userSearchQuery(submittedSearch));
  const feedData = feedQuery.data;
  const myActivities = activitiesQuery.data?.items ?? [];
  const searchResults = searchResultsQuery.data ?? [];
  const loading = activeTab === 'feed'
    ? feedQuery.isFetching
    : activeTab === 'my-activities'
      ? activitiesQuery.isFetching
      : searchResultsQuery.isFetching;

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

  const handlePageChange = (newPage: number) => {
    if (activeTab === "feed") void updateSearch({ feedPage: newPage });
    else if (activeTab === "my-activities") void updateSearch({ myPage: newPage });
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

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const query = String(form.get('q') ?? '').trim();
    if (!query) return;
    void updateSearch({ q: query });
  };

  const selectTab = (tab: SocialTab) => void updateSearch({ tab });

  const followMutation = useMutation({
    mutationFn: setFollowing,
    onMutate: ({ userId, following }) => {
      queryClient.setQueryData<UserProfile[]>(socialKeys.search(submittedSearch), (previous = []) =>
        previous.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              is_following: !following,
              followers_count: following
                ? u.followers_count - 1
                : u.followers_count + 1,
            };
          }
          return u;
        }),
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey: socialKeys.search(submittedSearch) }),
  });

  const handleFollow = (userId: string, currentlyFollowing: boolean) => {
    followMutation.mutate({ userId, following: currentlyFollowing });
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
        <Link to="/profile/$userId" params={{ userId: act.username }}>{act.username}</Link>
      </span>
    );

    if (act.action_type === "FOLLOW" && act.target_user) {
      return (
        <>
          {userLink} começou a seguir{" "}
          <span className={styles.targetUsername}>
            <Link to="/profile/$userId" params={{ userId: act.target_user.username }}>{act.target_user.username}</Link>
          </span>
        </>
      );
    }

    if (act.action_type === "CREATED_TIERLIST") {
      return (
        <>
          {userLink} criou a Tier List{" "}
          <span className={styles.tierlistLink}>
            <Link to="/tierlists/$id" params={{ id: act.tierlist_id! }}>{act.tierlist_title}</Link>
          </span>
        </>
      );
    }

    if (act.action_type === "UPDATED_TIERLIST") {
      return (
        <>
          {userLink} atualizou a Tier List{" "}
          <span className={styles.tierlistLink}>
            <Link to="/tierlists/$id" params={{ id: act.tierlist_id! }}>{act.tierlist_title}</Link>
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
          onClick={() => selectTab("feed")}
        >
          Feed de Notícias
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "my-activities" ? styles.active : ""}`}
          onClick={() => selectTab("my-activities")}
        >
          Minhas Atividades
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "search" ? styles.active : ""}`}
          onClick={() => selectTab("search")}
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
                    onChange={(e) => void updateSearch({ month: Number(e.target.value), feedPage: 1 })}
                    disabled={loading}
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    className={styles.filterSelect}
                    value={selectedYear}
                    onChange={(e) => void updateSearch({ year: Number(e.target.value), feedPage: 1 })}
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
                  {renderPagination(feedData?.activities?.page ?? feedPage, feedData?.activities?.total_pages ?? 1)}
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
                    onChange={(e) => void updateSearch({ month: Number(e.target.value), myPage: 1 })}
                    disabled={loading}
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    className={styles.filterSelect}
                    value={selectedYear}
                    onChange={(e) => void updateSearch({ year: Number(e.target.value), myPage: 1 })}
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
                  {renderPagination(activitiesQuery.data?.page ?? myPage, activitiesQuery.data?.total_pages ?? 1)}
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
                name="q"
                placeholder="Pesquisar por nome de usuário..."
                key={submittedSearch}
                defaultValue={submittedSearch}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchBtn} disabled={loading}>
                Buscar
              </button>
            </form>

            <div className={styles.userList}>
              {loading && <p>Pesquisando...</p>}
              {!loading && searchResults.length === 0 && submittedSearch && (
                <p className={styles.empty}>Nenhum usuário encontrado.</p>
              )}
              {searchResults.map((user) => (
                <div key={user.id} className={styles.userCard}>
                  <div className={styles.userInfo}>
                    <Link to="/profile/$userId" params={{ userId: user.username }} className={styles.usernameLink}>
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
