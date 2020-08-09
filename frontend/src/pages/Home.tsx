import React from 'react';

import LargeUserSearch from '../components/LargeUserSearch';

const styles: { [key: string]: React.CSSProperties } = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

const Home: React.FC = () => (
  <div style={styles.root}>
    <h1 style={{ fontSize: 36 }}>Quavertrack</h1>

    <LargeUserSearch />
  </div>
);

export default Home;
