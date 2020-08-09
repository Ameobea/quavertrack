import { Callout } from '@blueprintjs/core';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

const styles: { [key: string]: React.CSSProperties } = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  searchContainer: {
    marginLeft: '10vw',
    marginRight: '10vw',
    maxWidth: '80vw',
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontSize: 22,
  },
  searchBox: {
    maxWidth: '70vw',
    width: '100%',
    height: 40,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 10,
    fontSize: 20,
    textAlign: 'center',
    color: '#ddd',
    backgroundColor: '#121212',
    border: '1px solid #777',
    outline: 0,
  },
};

const Home: React.FC = () => {
  const history = useHistory();
  const [searchContent, setSearchContent] = useState('');

  return (
    <div style={styles.root}>
      <h1 style={{ fontSize: 36 }}>Quavertrack</h1>

      <Callout style={styles.searchContainer}>
        Search User
        <input
          style={styles.searchBox}
          value={searchContent}
          onChange={(evt) => setSearchContent(evt.target.value)}
          onKeyPress={(evt) => {
            if (evt.key === 'Enter' && searchContent.length > 0) {
              history.push(`/user/${searchContent}`);
            }
          }}
        />
      </Callout>
    </div>
  );
};

export default Home;
