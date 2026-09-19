import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { validateSocialSearch, type SocialSearch, type SocialTab } from '@/app/search';
import { myActivitiesQuery, setFollowing, socialFeedQuery, socialKeys, userSearchQuery, type UserProfile } from '@/features/social/queries';
import SocialFeed from './SocialFeed';
import SocialUserSearch from './SocialUserSearch';
import styles from './Social.module.css';

const TABS: { value: SocialTab; label: string }[] = [
  { value: 'feed', label: 'Feed de Notícias' },
  { value: 'my-activities', label: 'Minhas Atividades' },
  { value: 'search', label: 'Encontrar Pessoas' },
];

export default function Social() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = validateSocialSearch(useSearch({ strict: false }) as Record<string, unknown>);
  const updateSearch = (updates: Partial<SocialSearch>) => navigate({ to: '/social', search: (previous) => ({ ...validateSocialSearch(previous), ...updates }) });
  const feedQuery = useQuery({ ...socialFeedQuery(search.month, search.year, search.feedPage), enabled: search.tab === 'feed' });
  const activitiesQuery = useQuery({ ...myActivitiesQuery(search.month, search.year, search.myPage), enabled: search.tab === 'my-activities' });
  const usersQuery = useQuery(userSearchQuery(search.q));
  const followMutation = useMutation({
    mutationFn: setFollowing,
    onMutate: ({ userId, following }) => queryClient.setQueryData<UserProfile[]>(socialKeys.search(search.q), (current = []) => current.map((user) => user.id === userId ? { ...user, is_following: !following, followers_count: user.followers_count + (following ? -1 : 1) } : user)),
    onError: () => queryClient.invalidateQueries({ queryKey: socialKeys.search(search.q) }),
  });

  useEffect(() => window.scrollTo({ top: 0 }), [search.tab]);

  const changePage = (page: number) => {
    void updateSearch(search.tab === 'feed' ? { feedPage: page } : { myPage: page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loading = search.tab === 'feed' ? feedQuery.isFetching : search.tab === 'my-activities' ? activitiesQuery.isFetching : usersQuery.isFetching;

  return (
    <div className={styles.socialContainer}>
      <h1 className={styles.pageTitle}>Social</h1>
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => <button key={tab.value} role="tab" aria-selected={search.tab === tab.value} className={`${styles.tabBtn} ${search.tab === tab.value ? styles.active : ''}`} onClick={() => void updateSearch({ tab: tab.value })}>{tab.label}</button>)}
      </div>
      <div className={styles.content}>
        {search.tab === 'feed' && (
          <SocialFeed
            title="Atividades Recentes" activities={feedQuery.data?.activities.items ?? []}
            releases={feedQuery.data?.rawg_releases ?? []} emptyMessage="Nenhuma atividade recente. Siga mais pessoas!"
            loading={loading} month={search.month} year={search.year}
            page={feedQuery.data?.activities.page ?? search.feedPage} totalPages={feedQuery.data?.activities.total_pages ?? 1}
            onPeriodChange={(value) => void updateSearch({ ...value, feedPage: 1 })} onPageChange={changePage}
          />
        )}
        {search.tab === 'my-activities' && (
          <SocialFeed
            title="Minhas Atividades" activities={activitiesQuery.data?.items ?? []}
            emptyMessage="Você ainda não tem nenhuma atividade registrada no período selecionado."
            loading={loading} month={search.month} year={search.year}
            page={activitiesQuery.data?.page ?? search.myPage} totalPages={activitiesQuery.data?.total_pages ?? 1}
            onPeriodChange={(value) => void updateSearch({ ...value, myPage: 1 })} onPageChange={changePage}
          />
        )}
        {search.tab === 'search' && <SocialUserSearch query={search.q} users={usersQuery.data ?? []} loading={loading} onSearch={(q) => void updateSearch({ q })} onFollow={(userId, following) => followMutation.mutate({ userId, following })} />}
      </div>
    </div>
  );
}
