import React from 'react';
import dayjs from 'dayjs';

import { StatsUpdate } from '../api';
import * as colors from '../styles/colors';
import { Mode } from '../pages/UserInfo';
import './LastUpdateChanges.scss';

const formatNumber = (number: number, decimals = 0) => {
  let magnitudeNum = number;
  let suffix = '';

  if (number > 1200000000) {
    suffix = 'b';
    magnitudeNum /= 1000000000;
  } else if (number > 1200000) {
    suffix = 'kk';
    magnitudeNum /= 1000000;
  } else if (number > 120000) {
    suffix = 'k';
    magnitudeNum /= 1000;
  }

  const formatted = magnitudeNum.toLocaleString(undefined, { maximumFractionDigits: decimals });
  return `${formatted}${suffix}`;
};

const Diff: React.FC<{
  before: number;
  after: number;
  invert?: boolean;
  decimals?: number;
}> = ({ before, after, invert, decimals }) => {
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
      {formatNumber(diff, decimals)}
    </span>
  );
};

const ChangeCell: React.FC<{
  label: string;
  before: number;
  after: number;
  invert?: boolean;
  decimals?: number;
}> = ({ label, decimals, ...rest }) => (
  <div className='change-cell'>
    <div style={{ fontWeight: 'bold' }}>{label}:</div>
    <div>
      {formatNumber(rest.before, decimals)}⭢{formatNumber(rest.after, decimals)} (
      <Diff decimals={decimals} {...rest} />)
    </div>
  </div>
);

const RelativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { style: 'long' });

const formatTimeDiffSeconds = (seconds: number) => {
  const absSeconds = Math.abs(seconds);
  if (absSeconds > 24 * 60 * 60 * 1.5) {
    const days = seconds / (24 * 60 * 60);
    return RelativeTimeFormatter.format(Math.round(days * 10) / 10, 'days');
  } else if (absSeconds > 60 * 60 * 1.5) {
    const hours = seconds / (60 * 60);
    return RelativeTimeFormatter.format(Math.round(hours * 10) / 10, 'hours');
  } else if (absSeconds > 60 * 2) {
    const mins = seconds / 60;
    return RelativeTimeFormatter.format(Math.round(mins * 10) / 10, 'minutes');
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
    return <div style={{ height: 130 }}>Loading...</div>;
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
          decimals={3}
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
          decimals={3}
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
