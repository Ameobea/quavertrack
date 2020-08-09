import React from 'react';
import dayjs from 'dayjs';

import { StatsUpdate } from '../api';
import * as colors from '../styles/colors';
import { Mode } from '../pages/UserInfo';
import './LastUpdateChanges.scss';

const NumberFormatter = new Intl.NumberFormat(undefined, {});

const formatNumber = (number: number) => NumberFormatter.format(number);

const Diff: React.FC<{ before: number; after: number; invert?: boolean }> = ({
  before,
  after,
  invert,
}) => {
  const diff = after - before;
  const color =
    after === before
      ? colors.same
      : (invert ? before > after : after > before)
      ? colors.increase
      : colors.decrease;

  return (
    <span style={{ color }}>
      {diff >= 0 ? '+' : null}
      {formatNumber(diff)}
    </span>
  );
};

const ChangeCell: React.FC<{
  label: string;
  before: number;
  after: number;
  invert?: boolean;
}> = ({ label, ...rest }) => (
  <div className='change-cell'>
    <div style={{ fontWeight: 'bold' }}>{label}:</div>
    <div>
      {formatNumber(rest.before)}⭢{formatNumber(rest.after)} (<Diff {...rest} />)
    </div>
  </div>
);

const RelativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { style: 'short' });

const formatTimeDiffSeconds = (seconds: number) => {
  if (seconds > 24 * 60 * 60 * 1.5) {
    const days = seconds / (24 * 60 * 60);
    return RelativeTimeFormatter.format(days, 'days');
  } else if (seconds > 60 * 60 * 1.5) {
    const hours = seconds / (60 * 60);
    return RelativeTimeFormatter.format(hours, 'hours');
  } else if (seconds > 60 * 2) {
    const mins = seconds / 60;
    return RelativeTimeFormatter.format(mins, 'minutes');
  } else {
    return RelativeTimeFormatter.format(seconds, 'seconds');
  }
};

const LastUpdateChanges: React.FC<{
  newUpdate: null | { '4k': StatsUpdate; '7k': StatsUpdate } | { error: string };
  lastUpdate: StatsUpdate | null;
  mode: Mode;
}> = ({ newUpdate, lastUpdate, mode }) => {
  if (!newUpdate) {
    return <>Loading...</>;
  } else if ('error' in newUpdate) {
    return <>{newUpdate.error}</>;
  } else if (!lastUpdate) {
    return <>This is your first update; go play a a map or two and then refresh this page!</>;
  }

  const newModeUpdate = mode === Mode.K4 ? newUpdate['4k'] : newUpdate['7k'];
  const timeDiffSeconds = dayjs(lastUpdate.recorded_at).diff(
    dayjs(newModeUpdate.recorded_at),
    'second'
  );

  return (
    <div className='last-update-changes'>
      <h2>Changes Since Last Update</h2>
      Last Update Time: {formatTimeDiffSeconds(timeDiffSeconds)}
      <div className='last-update-changes-grid'>
        <ChangeCell
          label='Global Rank'
          before={lastUpdate.global_rank}
          after={newModeUpdate.global_rank}
          invert
        />
        <ChangeCell
          label='Overall Performance Rating'
          before={lastUpdate.overall_performance_rating}
          after={newModeUpdate.overall_performance_rating}
        />
        <ChangeCell
          label='Country Rank'
          before={lastUpdate.country_rank}
          after={newModeUpdate.country_rank}
          invert
        />
        <ChangeCell
          label='Multiplayer Win Rank'
          before={lastUpdate.multiplayer_win_rank}
          after={newModeUpdate.multiplayer_win_rank}
          invert
        />
        <ChangeCell
          label='Playcount'
          before={lastUpdate.play_count}
          after={newModeUpdate.play_count}
        />
        <ChangeCell
          label='Overall Accuracy'
          before={lastUpdate.overall_accuracy}
          after={newModeUpdate.overall_accuracy}
        />
        <ChangeCell
          label='Total Score'
          before={lastUpdate.total_score}
          after={newModeUpdate.total_score}
        />
        <ChangeCell
          label='Ranked Score'
          before={lastUpdate.ranked_score}
          after={newModeUpdate.ranked_score}
        />
      </div>
    </div>
  );
};

export default LastUpdateChanges;
