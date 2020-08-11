import React, { useState } from 'react';

const styles: { [key: string]: React.CSSProperties } = {
  globalSearchWrapper: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  globalSearch: {
    background: '#283030',
  },
};

const UserSearch: React.FC<{ onSubmit: (value: string) => void }> = ({ onSubmit }) => {
  const [userSearchValue, setUserSearchValue] = useState('');

  return (
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
            if (onSubmit) {
              onSubmit(userSearchValue);
            }
            (e.target as any).blur();
            setUserSearchValue('');
          }
        }}
        dir='auto'
      />
    </div>
  );
};

export default UserSearch;
