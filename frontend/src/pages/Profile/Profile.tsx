import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { LockKeyhole } from 'lucide-react';
import { Loader } from '@/components/Shared';
import { profileDashboardQuery, profileGamesQuery, profileKeys, toggleProfileFollow } from '@/features/profile/queries';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import FollowListModal from './FollowListModal';
import { PeriodGameBoard, SimpleGameBoard } from './ProfileGameBoards';
import ProfileGenresModal from './ProfileGenresModal';
import ProfileHeader from './ProfileHeader';
import ProfileOverview from './ProfileOverview';
import { filterYearlyGames } from './profileUtils';
import styles from './Profile.module.css';

type FollowListType = 'followers' | 'following';

export default function Profile() {
  const { userId } = useParams({ strict: false });
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery(profileDashboardQuery(userId));
  const data = dashboardQuery.data ?? null;

  const currentYear = new Date().getFullYear();
  const [boardPeriod, setBoardPeriod] = useState({ year: currentYear, month: 'all' });
  const [platinumPeriod, setPlatinumPeriod] = useState({ year: currentYear, month: 'all' });
  const [collapsed, setCollapsed] = useState({ playing: false, completed: false, platinum: false, favorites: false });
  const [showGenresModal, setShowGenresModal] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [followModal, setFollowModal] = useState<FollowListType | null>(null);

  const gamesQuery = useQuery({ ...profileGamesQuery(userId), enabled: showGenresModal });
  const followMutation = useMutation({
    mutationFn: toggleProfileFollow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.dashboard(userId) }),
  });

  const isOwnProfile = !userId || !!currentUser && (
    userId.toLowerCase() === currentUser.id.toLowerCase()
    || userId.toLowerCase() === currentUser.username.toLowerCase()
  );

  const toggleBoard = (board: keyof typeof collapsed) => {
    setCollapsed((current) => ({ ...current, [board]: !current[board] }));
  };

  const handleFollowToggle = async () => {
    if (!data) return;
    try {
      await followMutation.mutateAsync({ username: data.username, following: !!data.is_following });
      showToast(data.is_following ? 'Deixou de seguir o usuário.' : 'Seguindo o usuário!', data.is_following ? 'info' : 'success');
    } catch {
      showToast('Erro ao atualizar status de seguir.', 'error');
    }
  };

  const closeGenresModal = () => {
    setShowGenresModal(false);
    setSelectedGenre(null);
  };

  if (dashboardQuery.isPending) return <Loader message="Carregando perfil..." />;

  if (!data) {
    return (
      <div className={styles.container}>
        <section className={styles.privateProfile}>
          <LockKeyhole aria-hidden="true" size={48} />
          <h3>Perfil Privado</h3>
          <p>Este perfil é privado. Você precisa seguir este usuário para visualizar suas atividades e biblioteca.</p>
        </section>
      </div>
    );
  }

  const boardGames = filterYearlyGames(data.yearly_games, boardPeriod.year, boardPeriod.month);
  const platinumGames = filterYearlyGames(data.yearly_platinums, platinumPeriod.year, platinumPeriod.month);

  return (
    <div className={styles.container}>
      <ProfileHeader
        data={data}
        isOwnProfile={isOwnProfile}
        isFollowingPending={followMutation.isPending}
        onFollowToggle={handleFollowToggle}
        onOpenFollowers={() => setFollowModal('followers')}
        onOpenFollowing={() => setFollowModal('following')}
      />
      {followModal && <FollowListModal userId={userId || 'me'} type={followModal} onClose={() => setFollowModal(null)} />}
      <ProfileOverview data={data} onOpenGenres={() => setShowGenresModal(true)} />
      <SimpleGameBoard title="Jogos em Andamento (Jogando)" games={data.playing_games ?? []} emptyMessage="Nenhum jogo em andamento no momento." collapsed={collapsed.playing} onToggle={() => toggleBoard('playing')} />
      <PeriodGameBoard
        title="Painel de Conclusões (Zerados)" games={boardGames} groups={data.yearly_games}
        selectedYear={boardPeriod.year} selectedMonth={boardPeriod.month}
        itemLabel={['jogo concluído', 'jogos concluídos']} emptyMessage="Nenhum jogo concluído neste período."
        collapsed={collapsed.completed} onToggle={() => toggleBoard('completed')}
        onYearChange={(year) => setBoardPeriod({ year, month: 'all' })}
        onMonthChange={(month) => setBoardPeriod((period) => ({ ...period, month }))}
      />
      <PeriodGameBoard
        title="Painel de Conclusões Puras (Platinados)" games={platinumGames} groups={data.yearly_platinums}
        selectedYear={platinumPeriod.year} selectedMonth={platinumPeriod.month}
        itemLabel={['jogo platinado', 'jogos platinados']} emptyMessage="Nenhum jogo platinado neste período."
        collapsed={collapsed.platinum} onToggle={() => toggleBoard('platinum')}
        onYearChange={(year) => setPlatinumPeriod({ year, month: 'all' })}
        onMonthChange={(month) => setPlatinumPeriod((period) => ({ ...period, month }))}
      />
      <SimpleGameBoard title="Jogos Favoritos" games={data.favorite_games ?? []} emptyMessage="Nenhum jogo favoritado." collapsed={collapsed.favorites} onToggle={() => toggleBoard('favorites')} />
      {showGenresModal && (
        <ProfileGenresModal
          gameCount={data.games_count} distribution={data.genre_distribution} selectedGenre={selectedGenre}
          games={gamesQuery.data ?? []} loadingGames={gamesQuery.isPending}
          onSelectGenre={setSelectedGenre} onClose={closeGenresModal}
        />
      )}
    </div>
  );
}
