import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Option } from 'funfix-core';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { Select, IItemRendererProps, IItemListRendererProps } from '@blueprintjs/select';
import { PromiseResolveType, Without } from 'ameo-utils';

import { getHiscores, getStatsHistory, StatsUpdate, updateUser, Map, Score } from '../api';
import { TrendChart, getSeriesDefaults, ScatterPlot } from '../components/Charts';
import * as colors from '../styles/colors';
import LastUpdateChanges from '../components/LastUpdateChanges';
import LargeUserSearch from '../components/LargeUserSearch';
import { withMobileOrDesktop } from '../components/ResponsiveHelpers';
import './UserInfo.scss';
import UserSearch from '../components/UserSearch';

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
};

export enum Mode {
  K4 = '4k',
  K7 = '7k',
}

interface ModeSelectorProps<T extends string> {
  value: T;
  onChange: (newVal: T) => void;
  options: { value: T; label: string }[];
}

function ModeSelectorButton<T extends string>(
  { label }: { value: T; label: string },
  { handleClick }: IItemRendererProps
) {
  return <Button onClick={handleClick}>{label}</Button>;
}

function MobileModeSelectListRenderer<T extends string>({
  items,
  renderItem,
}: IItemListRendererProps<T>) {
  return <ButtonGroup vertical>{items.map((item, i) => renderItem(item, i))}</ButtonGroup>;
}

function MobileModeSelector<T extends string>({ value, onChange, options }: ModeSelectorProps<T>) {
  const ModeSelect = useMemo(() => Select.ofType<{ value: T; label: string }>(), []);

  const activeItem = options.find((option) => option.value === value)!;

  return (
    <div style={{ display: 'flex' }}>
      <ModeSelect
        onItemSelect={({ value }) => onChange(value)}
        items={options}
        activeItem={activeItem}
        itemRenderer={ModeSelectorButton}
        filterable={false}
        itemListRenderer={MobileModeSelectListRenderer}
      >
        <Button text={activeItem.label} rightIcon='chevron-down' />
      </ModeSelect>
    </div>
  );
}

function DesktopModeSelector<T extends string>({ value, options, onChange }: ModeSelectorProps<T>) {
  return (
    <ButtonGroup>
      {options.map((option) => (
        <Button
          key={option.value}
          onClick={() => onChange(option.value)}
          active={option.value === value}
        >
          {option.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function buildModeSelector<T extends string>(options: ModeSelectorProps<T>['options']) {
  const Comp = withMobileOrDesktop<ModeSelectorProps<T>>(
    { maxDeviceWidth: 800 },
    MobileModeSelector,
    DesktopModeSelector
  );

  const ModeSelector: React.FC<Without<ModeSelectorProps<T>, 'options'>> = (props) => (
    <Comp options={options} {...props} />
  );
  return ModeSelector;
}

type RankType = 'global_rank' | 'country_rank' | 'multiplayer_win_rank';
type ScoreType = 'total_score' | 'ranked_score';
type PlaycountType =
  | 'play_count'
  | 'fail_count'
  | 'total_pauses'
  | 'multiplayer_wins'
  | 'multiplayer_losses'
  | 'multiplayer_ties'
  | 'replays_watched';

const { RankModeSelector, ScoreModeSelector, PlaycountModeSelector } = {
  RankModeSelector: buildModeSelector([
    { value: 'global_rank', label: 'Global Rank' },
    { value: 'country_rank', label: 'Country Rank' },
    { value: 'multiplayer_win_rank', label: 'Multiplayer Win Rank' },
  ] as { value: RankType; label: string }[]),
  ScoreModeSelector: buildModeSelector([
    { value: 'total_score', label: 'Total Score' },
    { value: 'ranked_score', label: 'Ranked Score' },
  ] as { value: ScoreType; label: string }[]),
  PlaycountModeSelector: buildModeSelector([
    { value: 'play_count', label: 'Playcount' },
    { value: 'fail_count', label: 'Fail Count' },
    { value: 'total_pauses', label: 'Total Pauses' },
    { value: 'multiplayer_wins', label: 'Multiplayer Wins' },
    { value: 'multiplayer_losses', label: 'Multiplayer Losses' },
    { value: 'multiplayer_ties', label: 'Muiltiplayer Ties' },
    { value: 'replays_watched', label: 'Replays Watched' },
  ] as { value: PlaycountType; label: string }[]),
};

const useSeries = ({
  rankType,
  scoreType,
  playcountType,
  statsUpdates,
  lastUpdate,
  mode,
}: {
  rankType: RankType;
  scoreType: ScoreType;
  playcountType: PlaycountType;
  statsUpdates: StatsUpdate[] | null | undefined;
  lastUpdate: {
    '4k': StatsUpdate;
    '7k': StatsUpdate;
  } | null;
  mode: '4k' | '7k';
}) => {
  const rankSeries = useMemo(() => {
    if (!statsUpdates) {
      return null;
    }

    const ret = {
      ...getSeriesDefaults(),
      name: {
        global_rank: 'Global Rank',
        country_rank: 'Country Rank',
        multiplayer_win_rank: 'Multiplayer Win Rank',
      }[rankType],
      data: statsUpdates.map(
        (update) => [new Date(update.recorded_at + 'Z'), update[rankType]] as const
      ) as any,
      lineStyle: { color: colors.emphasis },
      itemStyle: { color: colors.emphasis, borderColor: '#fff' },
    };

    if (lastUpdate) {
      ret.data.push([new Date(lastUpdate[mode].recorded_at + 'Z'), lastUpdate[mode][rankType]]);
    }

    return [ret];
  }, [statsUpdates, rankType, lastUpdate, mode]);
  const scoreSeries = useMemo(() => {
    if (!statsUpdates) {
      return null;
    }

    const ret = {
      ...getSeriesDefaults(),
      name: {
        total_score: 'Total Score',
        ranked_score: 'Ranked Score',
      }[scoreType],
      data: statsUpdates.map(
        (update) => [new Date(update.recorded_at + 'Z'), update[scoreType]] as const
      ) as any,
      lineStyle: { color: colors.emphasis },
      itemStyle: { color: colors.emphasis, borderColor: '#fff' },
    };

    if (lastUpdate) {
      ret.data.push([new Date(lastUpdate[mode].recorded_at + 'Z'), lastUpdate[mode][scoreType]]);
    }

    return [ret];
  }, [statsUpdates, scoreType, lastUpdate, mode]);
  const playcountSeries = useMemo(() => {
    if (!statsUpdates) {
      return null;
    }

    const ret = {
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
        (update) => [new Date(update.recorded_at + 'Z'), update[playcountType]] as const
      ) as any,
      lineStyle: { color: colors.emphasis },
      itemStyle: { color: colors.emphasis, borderColor: '#fff' },
    };

    if (lastUpdate) {
      ret.data.push([
        new Date(lastUpdate[mode].recorded_at + 'Z'),
        lastUpdate[mode][playcountType],
      ]);
    }

    return [ret];
  }, [statsUpdates, playcountType, lastUpdate, mode]);

  return rankSeries && scoreSeries && playcountSeries
    ? { rankSeries, scoreSeries, playcountSeries }
    : null;
};

const GradesToColors: { [key: string]: any } = {
  SS: colors.brightPink,
  S: colors.brightYellow,
  A: colors.increase,
  B: colors.darkerEmphasis,
  C: colors.orange,
  D: colors.redOrange,
  F: colors.decrease,
};

const getModeID = (mode: '4k' | '7k') => {
  if (mode === '4k') {
    return 1;
  }
  return 2;
};

const buildHiscoresSeries = (
  hiscores: PromiseResolveType<ReturnType<typeof getHiscores>>,
  lastUpdate: { '4k': StatsUpdate; '7k': StatsUpdate; newScores: Score[]; maps: Map[] } | null,
  mode: '4k' | '7k'
) => {
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

    const color = GradesToColors[grade];

    const data = scores.map(
      ({ score, srcIx }) =>
        ({
          value: [new Date(score.time + 'Z'), score.performance_rating, srcIx],
          itemStyle: { color },
        } as any)
    );
    const oldScoresCount = data.length;

    if (lastUpdate) {
      lastUpdate.newScores.forEach((score, ix) => {
        if (score.mode === getModeID(mode) && score.grade === grade) {
          data.push({
            // Negative source indices refer to the series in `lastUpdate`
            value: [new Date(score.time + 'Z'), score.performance_rating, -(ix + 1)],
            // Add a special marker if this isn't the user's first update
            symbol: oldScoresCount > 0 ? 'diamond' : undefined,
            symbolSize: oldScoresCount > 0 ? 12 : undefined,
            itemStyle: { color, borderColor: oldScoresCount > 0 ? '#fff' : undefined },
          });
        }
      });
    }

    return {
      type: 'scatter',
      name: grade,
      color,
      symbolSize: 6.5,
      data,
    };
  });
};

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
  const [lastUpdate, setLastUpdate] = useState<
    | null
    | { '4k': StatsUpdate; '7k': StatsUpdate; newScores: Score[]; maps: Map[] }
    | { error: string }
  >(null);
  const hiscoresSeries = useMemo(
    () =>
      hiscores
        ? buildHiscoresSeries(
            hiscores,
            lastUpdate && '4k' in lastUpdate ? lastUpdate : null,
            mode === '4k' || mode === '7k' ? mode : '4k'
          )
        : null,
    [hiscores, lastUpdate, mode]
  );
  const [rankType, setRankType] = useState<RankType>('global_rank');
  const [scoreType, setScoreType] = useState<ScoreType>('total_score');
  const [playcountType, setPlaycountType] = useState<PlaycountType>('play_count');

  const series = useSeries({
    rankType,
    scoreType,
    playcountType,
    statsUpdates,
    lastUpdate: lastUpdate && '4k' in lastUpdate ? lastUpdate : null,
    mode: mode === '4k' || mode === '7k' ? mode : '4k',
  });

  useEffect(() => {
    setLastUpdate(null);

    // Trigger an update and get the most recent stats for the user and display
    updateUser(username)
      .then(({ stats_4k, stats_7k, new_scores, maps }) =>
        setLastUpdate({ '4k': stats_4k, '7k': stats_7k, newScores: new_scores, maps })
      )
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

  if (mode !== '4k' && mode !== '7k') {
    history.push(`/user/${username}`);
    return null;
  }

  if (statsUpdates === null) {
    return (
      <div className='user-info' style={{ ...styles.root, ...styles.rootNotFound }}>
        <h1>User Not Found</h1>
        <LargeUserSearch />
      </div>
    );
  }

  return (
    <div className='user-info' style={styles.root}>
      <UserSearch
        onSubmit={(userSearchValue) => {
          setLastUpdate(null);
          history.push(`/user/${userSearchValue}/${mode}`);
        }}
      />

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
            const srcIx = (params.value! as any)[2];
            // Negative source indices refer to the series in `lastUpdate`
            const score =
              srcIx < 0 && lastUpdate && 'newScores' in lastUpdate
                ? lastUpdate.newScores[-(srcIx + 1)]
                : hiscores.scores[srcIx];
            const map: Map | undefined =
              srcIx < 0 && lastUpdate && 'newScores' in lastUpdate
                ? lastUpdate.maps[score.map_id]
                : hiscores.maps[score.map_id];

            return `<b>${map?.title || 'Unknown'} - ${
              map?.difficulty_name || 'Unknown'
            }</b><br/>Performance Rating: ${score.performance_rating}, Grade: ${
              score.grade
            }<br/>Mods: ${score.mods_string}<br/>Date Earned: ${new Date(
              score.time + 'Z'
            ).toLocaleString(undefined, { timeZoneName: 'short' })}`;
          }}
          style={{ marginTop: 40, marginBottom: 60 }}
        />
      ) : (
        <div style={{ height: '30vh' }}>Loading...</div>
      )}

      {series ? (
        <div style={styles.chartContainer}>
          <RankModeSelector value={rankType} onChange={setRankType} />
          <TrendChart series={series.rankSeries} inverse />
        </div>
      ) : (
        <div style={{ height: '30vh' }}>Loading...</div>
      )}
      {series ? (
        <div style={styles.chartContainer}>
          <ScoreModeSelector value={scoreType} onChange={setScoreType} />
          <TrendChart series={series.scoreSeries} />
        </div>
      ) : (
        <div style={{ height: '30vh' }}>Loading...</div>
      )}
      {series ? (
        <div style={styles.chartContainer}>
          <PlaycountModeSelector value={playcountType} onChange={setPlaycountType} />
          <TrendChart series={series.playcountSeries} />
        </div>
      ) : (
        <div style={{ height: '30vh' }}>Loading...</div>
      )}
    </div>
  );
};

export default UserInfo;
