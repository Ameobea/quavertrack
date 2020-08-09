import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useQuery } from 'react-query';

import { getStatsHistory } from '../api';

const styles: { [key: string]: React.CSSProperties } = {
  root: {
    display: 'flex',
    justifyContent: 'center',
  },
};

const UserInfo: React.FC = () => {
  const match = useRouteMatch<{ username: string }>();
  const username = match.params['username'];
  const { data: statsUpdates } = useQuery({
    queryKey: ['statsHistory', username],
    queryFn: getStatsHistory,
  });
  console.log(statsUpdates);

  return (
    <div style={styles.root}>
      <h1>User Stats for {username}</h1>
    </div>
  );
};

export default UserInfo;
