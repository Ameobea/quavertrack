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

export const getStatsHistory = async (
  _key: string,
  username: string,
  mode: string
): Promise<StatsUpdate[] | null> =>
  fetch(`/api/user/${username}/${mode}/stats_history`).then((res) => {
    if (res.ok) {
      return res.json();
    } else if (res.status === 404) {
      return null;
    }

    throw res.status;
  });

export const updateUser = (username: string): Promise<[StatsUpdate, StatsUpdate]> =>
  fetch(`/api/update/${username}`, { method: 'POST' }).then((res) => {
    if (res.ok) {
      return res.json();
    }

    throw res.status;
  });
