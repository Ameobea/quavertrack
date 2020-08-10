export interface StatsUpdate {
  id: number;
  user_id: number;
  recorded_at: string;
  mode: number;
  total_score: number;
  ranked_score: number;
  overall_accuracy: number;
  overall_performance_rating: number;
  play_count: number;
  fail_count: number;
  max_combo: number;
  replays_watched: number;
  total_marv: number;
  total_perf: number;
  total_great: number;
  total_good: number;
  total_okay: number;
  total_miss: number;
  total_pauses: number;
  multiplayer_wins: number;
  multiplayer_losses: number;
  multiplayer_ties: number;
  global_rank: number;
  country_rank: number;
  multiplayer_win_rank: number;
}
export interface Map {
  id: number;
  mapset_id: number;
  md5: string;
  artist: string;
  title: string;
  difficulty_name: string;
  creator_id: number;
  creator_username: string;
  ranked_status: number;
}

export interface Score {
  id: number;
  user_id: number;
  time: string;
  mode: number;
  mods: number;
  mods_string: string;
  performance_rating: number;
  personal_best: boolean;
  is_donator_score?: boolean;
  total_score: number;
  accuracy: number;
  grade: string;
  max_combo: number;
  count_marv: number;
  count_perf: number;
  count_great: number;
  count_good: number;
  count_okay: number;
  count_miss: number;
  scroll_speed: number;
  ratio: number;
  map_id: number;
}

export const getStatsHistory = async (
  _key: string,
  user: string,
  mode: string
): Promise<StatsUpdate[] | null> =>
  fetch(`/api/user/${user}/${mode}/stats_history`).then((res) => {
    if (res.ok) {
      return res.json();
    } else if (res.status === 404) {
      return null;
    }

    throw res.status;
  });

export const getHiscores = async (
  _key: string,
  user: string,
  mode: string
): Promise<{ maps: { [id: number]: Map }; scores: Score[] }> =>
  fetch(`/api/user/${user}/${mode}/scores`)
    .then((res) => {
      if (res.ok) {
        return res.json();
      } else if (res.status === 404) {
        return null;
      }

      throw res.status;
    })
    .then(({ scores, maps }: { maps: Map[]; scores: Score[] }) => ({
      scores,
      maps: maps.reduce((acc, score) => {
        acc[score.id] = score;
        return acc;
      }, {} as { [id: number]: Map }),
    }));

export const updateUser = (username: string): Promise<[StatsUpdate, StatsUpdate]> =>
  fetch(`/api/update/${username}`, { method: 'POST' }).then((res) => {
    if (res.ok) {
      return res.json();
    }

    throw res.status;
  });
