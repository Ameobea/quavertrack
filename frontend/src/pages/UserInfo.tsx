import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Option } from 'funfix-core';
import { Button, ButtonGroup } from '@blueprintjs/core';

import { getHiscores, getStatsHistory, StatsUpdate, updateUser, Map, Score } from '../api';
import { TrendChart, getSeriesDefaults, ScatterPlot } from '../components/Charts';
import * as colors from '../styles/colors';
import LastUpdateChanges from '../components/LastUpdateChanges';
import LargeUserSearch from '../components/LargeUserSearch';

const styles: { [key: string]: React.CSSProperties } = {
  root: {
    textAlign: 'center',
    marginLeft: 'max(4vw, 12px)',
    marginRight: 'max(4vw, 12px)',
  },
  rootNotFound: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  chartContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginBottom: 60,
  },
  globalSearchWrapper: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  globalSearch: {
    background: '#283030',
  },
};

export enum Mode {
  K4 = '4k',
  K7 = '7k',
}

const UserInfo: React.FC = () => {
  const history = useHistory();
  const match = useRouteMatch<{ username: string; mode: string }>();
  const { username, mode: rawMode } = match.params;
  const mode = Option.of(rawMode).getOrElse(Mode.K4);
  const { data: statsUpdates } = useQuery({
    queryKey: ['statsHistory', username, mode],
    queryFn: getStatsHistory,
    config: { refetchOnWindowFocus: false },
  });
  const { data: hiscores } = useQuery({
    queryKey: ['scoresHistory', username, mode],
    queryFn: getHiscores,
    config: { refetchOnWindowFocus: false },
  });
  const hiscoresSeries = useMemo(() => {
    if (!hiscores) {
      return null;
    }

    const groupedByGrade: {
      [grade: string]: { score: Score; srcIx: number }[];
    } = hiscores.scores.reduce((acc, score, srcIx) => {
      if (!acc[score.grade]) {
        acc[score.grade] = [];
      }
      acc[score.grade].push({ score, srcIx });
      return acc;
    }, {} as { [grade: string]: { score: Score; srcIx: number }[] });

    const RANKS = ['SS', 'S', 'A', 'B', 'C', 'D', 'F'];

    return RANKS.map((grade) => {
      const scores = groupedByGrade[grade] || [];

      const color = ({
        SS: colors.brightPink,
        S: colors.brightYellow,
        A: colors.increase,
        B: colors.darkerEmphasis,
        C: colors.orange,
        D: colors.redOrange,
        F: colors.decrease,
      } as { [key: string]: any })[grade];

      return {
        type: 'scatter',
        name: grade,
        color,
        data: scores.map(
          ({ score, srcIx }) =>
            ({
              value: [new Date(score.time), score.performance_rating, srcIx],
              itemStyle: {
                color,
              },
            } as any)
        ),
      };
    });
  }, [hiscores]);
  const [rankType, setRankType] = useState<'global_rank' | 'country_rank' | 'multiplayer_win_rank'>(
    'global_rank'
  );
  const [scoreType, setScoreType] = useState<'total_score' | 'ranked_score'>('total_score');
  const [playcountType, setPlaycountType] = useState<
    | 'play_count'
    | 'fail_count'
    | 'total_pauses'
    | 'multiplayer_wins'
    | 'multiplayer_losses'
    | 'multiplayer_ties'
    | 'replays_watched'
  >('play_count');
  const series: {
    rankSeries: echarts.EChartOption.Series[];
    scoreSeries: echarts.EChartOption.Series[];
    playcountSeries: echarts.EChartOption.Series[];
  } | null = useMemo(() => {
    if (!statsUpdates) {
      return null;
    }

    return {
      rankSeries: [
        {
          ...getSeriesDefaults(),
          name: {
            global_rank: 'Global Rank',
            country_rank: 'Country Rank',
            multiplayer_win_rank: 'Multiplayer Win Rank',
          }[rankType],
          data: statsUpdates.map(
            (update) => [new Date(update.recorded_at), update[rankType]] as const
          ) as any,
          lineStyle: { color: colors.emphasis },
          itemStyle: { color: colors.emphasis, borderColor: '#fff' },
        },
      ],
      scoreSeries: [
        {
          ...getSeriesDefaults(),
          name: {
            total_score: 'Total Score',
            ranked_score: 'Ranked Score',
          }[scoreType],
          data: statsUpdates.map(
            (update) => [new Date(update.recorded_at), update[scoreType]] as const
          ) as any,
          lineStyle: { color: colors.emphasis },
          itemStyle: { color: colors.emphasis, borderColor: '#fff' },
        },
      ],
      playcountSeries: [
        {
          ...getSeriesDefaults(),
          name: {
            play_count: 'Playcount',
            fail_count: 'Fail Count',
            total_pauses: 'Total Pauses',
            multiplayer_wins: 'Multiplayer Wins',
            multiplayer_losses: 'Multiplayer Losses',
            multiplayer_ties: 'Multiplayer Ties',
            replays_watched: 'Replays Watched',
          }[playcountType],
          data: statsUpdates.map(
            (update) => [new Date(update.recorded_at), update[playcountType]] as const
          ) as any,
          lineStyle: { color: colors.emphasis },
          itemStyle: { color: colors.emphasis, borderColor: '#fff' },
        },
      ],
    };
  }, [statsUpdates, rankType, scoreType, playcountType]);
  const [lastUpdate, setLastUpdate] = useState<
    null | { '4k': StatsUpdate; '7k': StatsUpdate } | { error: string }
  >(null);
  useEffect(() => {
    setLastUpdate(null);

    // Trigger an update and get the most recent stats for the user and display
    updateUser(username)
      .then(([update4k, update7k]) => setLastUpdate({ '4k': update4k, '7k': update7k }))
      .catch((resCode: number) => {
        console.warn(`Code ${resCode} when updating user ${username}`);
        switch (resCode) {
          case 404: {
            setLastUpdate({ error: 'User not found' });
            break;
          }
          case 429: {
            setLastUpdate({ error: 'Too soon since last update' });
            break;
          }
          case 500: {
            setLastUpdate({ error: 'Internal server error when updating user' });
            break;
          }
          default: {
            setLastUpdate({
              error: `Unknown error occurred when updating user; response code ${resCode}`,
            });
          }
        }
      });
  }, [username]);
  const [userSearchValue, setUserSearchValue] = useState('');

  if (mode !== '4k' && mode !== '7k') {
    history.push(`/user/${username}`);
    return null;
  }

  if (statsUpdates === null) {
    return (
      <div style={{ ...styles.root, ...styles.rootNotFound }}>
        <h1>User Not Found</h1>
        <LargeUserSearch />
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.globalSearchWrapper} className='bp3-input-group'>
        <span className='bp3-icon bp3-icon-search' />
        <input
          style={styles.globalSearch}
          className='bp3-input'
          value={userSearchValue}
          onChange={(evt) => setUserSearchValue(evt.target.value)}
          type='search'
          placeholder='Search User'
          size={14}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setLastUpdate(null);
              history.push(`/user/${userSearchValue}/${mode}`);
              (e.target as any).blur();
              setUserSearchValue('');
            }
          }}
          dir='auto'
        />
      </div>

      <h1>
        {mode} Stats for {username}
      </h1>
      {statsUpdates ? (
        <LastUpdateChanges
          lastUpdate={Option.of(statsUpdates[statsUpdates.length - 1]).orNull()}
          newUpdate={lastUpdate}
          mode={mode in Mode ? (mode as Mode) : Mode.K4}
        />
      ) : (
        <div style={{ minHeight: 100 }}>Loading...</div>
      )}

      {hiscores && hiscoresSeries ? (
        <ScatterPlot
          series={hiscoresSeries}
          tooltipFormatter={(params_) => {
            const params = Array.isArray(params_) ? params_[0]! : params_;
            const score = hiscores.scores[(params.value! as any)[2]];
            const map: Map | undefined = hiscores.maps[score.map_id];

            return `<b>${map?.title || 'Unknown'} - ${
              map?.difficulty_name || 'Unknown'
            }</b><br/>Performance Rating: ${score.performance_rating}, Grade: ${
              score.grade
            }<br/>Mods: ${score.mods_string}<br/>Date Earned: ${new Date(
              score.time
            ).toLocaleString()}`;
          }}
          style={{ marginTop: 40, marginBottom: 60 }}
        />
      ) : (
        <div style={{ height: '30vh' }}>Loading...</div>
      )}

      {series ? (
        <div style={styles.chartContainer}>
          <ButtonGroup>
            <Button onClick={() => setRankType('global_rank')} active={rankType === 'global_rank'}>
              Global Rank
            </Button>
            <Button
              onClick={() => setRankType('country_rank')}
              active={rankType === 'country_rank'}
            >
              Country Rank
            </Button>
            <Button
              onClick={() => setRankType('multiplayer_win_rank')}
              active={rankType === 'multiplayer_win_rank'}
            >
              Multiplayer Win Rank
            </Button>
          </ButtonGroup>
          <TrendChart series={series.rankSeries} inverse />
        </div>
      ) : (
        <div style={{ height: '30vh' }}>Loading...</div>
      )}
      {series ? (
        <div style={styles.chartContainer}>
          <ButtonGroup>
            <Button
              onClick={() => setScoreType('total_score')}
              active={scoreType === 'total_score'}
            >
              Total Score
            </Button>
            <Button
              onClick={() => setScoreType('ranked_score')}
              active={scoreType === 'ranked_score'}
            >
              Ranked Score
            </Button>
          </ButtonGroup>
          <TrendChart series={series.scoreSeries} />
        </div>
      ) : (
        <div style={{ height: '30vh' }}>Loading...</div>
      )}
      {series ? (
        <div style={styles.chartContainer}>
          <ButtonGroup>
            <Button
              onClick={() => setPlaycountType('play_count')}
              active={playcountType === 'play_count'}
            >
              Playcount
            </Button>
            <Button
              onClick={() => setPlaycountType('fail_count')}
              active={playcountType === 'fail_count'}
            >
              Fail Count
            </Button>
            <Button
              onClick={() => setPlaycountType('total_pauses')}
              active={playcountType === 'total_pauses'}
            >
              Total Pauses
            </Button>
            <Button
              onClick={() => setPlaycountType('multiplayer_wins')}
              active={playcountType === 'multiplayer_wins'}
            >
              Multiplayer Wins
            </Button>
            <Button
              onClick={() => setPlaycountType('multiplayer_losses')}
              active={playcountType === 'multiplayer_losses'}
            >
              Multiplayer Losses
            </Button>
            <Button
              onClick={() => setPlaycountType('multiplayer_ties')}
              active={playcountType === 'multiplayer_ties'}
            >
              Multiplayer Ties
            </Button>
            <Button
              onClick={() => setPlaycountType('replays_watched')}
              active={playcountType === 'replays_watched'}
            >
              Replays Watched
            </Button>
          </ButtonGroup>
          <TrendChart series={series.playcountSeries} />
        </div>
      ) : (
        <div style={{ height: '30vh' }}>Loading...</div>
      )}
    </div>
  );
};

export default UserInfo;
