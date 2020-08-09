import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Option } from 'funfix-core';

import { getStatsHistory, StatsUpdate, updateUser } from '../api';
import TrendChart, { getSeriesDefaults } from '../components/TrendChart';
import * as colors from '../styles/colors';
import LastUpdateChanges from '../components/LastUpdateChanges';

const styles: { [key: string]: React.CSSProperties } = {
  root: { textAlign: 'center' },
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
  const rankSeries: echarts.EChartOption.Series[] | null = useMemo(() => {
    if (!statsUpdates) {
      return null;
    }

    return [
      {
        ...getSeriesDefaults(),
        name: 'Rank',
        data: statsUpdates.map(
          (update) => [new Date(update.recorded_at), update.global_rank] as const
        ) as any,
        lineStyle: { color: colors.emphasis },
        itemStyle: { color: colors.emphasis, borderColor: '#fff' },
      },
    ];
  }, [statsUpdates]);
  const [lastUpdate, setLastUpdate] = useState<
    null | { '4k': StatsUpdate; '7k': StatsUpdate } | { error: string }
  >(null);
  useEffect(() => {
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

  if (mode !== '4k' && mode !== '7k') {
    history.push(`/user/${username}`);
    return null;
  }

  return (
    <div style={styles.root}>
      <h1>User Stats for {username}</h1>
      {statsUpdates ? (
        <LastUpdateChanges
          lastUpdate={statsUpdates[statsUpdates.length - 1]}
          newUpdate={lastUpdate}
          mode={mode in Mode ? (mode as Mode) : Mode.K4}
        />
      ) : (
        'Loading...'
      )}

      {rankSeries ? <TrendChart series={rankSeries} /> : 'Loading...'}
    </div>
  );
};

export default UserInfo;
