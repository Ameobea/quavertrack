import React, { useMemo } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Option } from 'funfix-core';

import { getStatsHistory } from '../api';
import TrendChart, { getSeriesDefaults } from '../components/TrendChart';
import * as colors from '../styles/colors';

const styles: { [key: string]: React.CSSProperties } = {
  root: { textAlign: 'center' },
};

enum Mode {
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

  if (mode !== '4k' && mode !== '7k') {
    history.push(`/user/${username}`);
    return null;
  }

  return (
    <div style={styles.root}>
      <h1>User Stats for {username}</h1>

      {statsUpdates && rankSeries ? <TrendChart series={rankSeries} /> : 'Loading...'}
    </div>
  );
};

export default UserInfo;
