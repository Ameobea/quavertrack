import { Button, ButtonGroup } from '@blueprintjs/core';
import React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';

const MODE_RGX = /\/[4|7]k/g;

const GlobalModeSelector: React.FC = () => {
  const {
    params: { mode },
    url,
  } = useRouteMatch<{ mode?: string }>();
  const history = useHistory();

  const setMode = (newMode: '4k' | '7k') => {
    if (newMode === mode) {
      return;
    }

    if (MODE_RGX.exec(url)) {
      history.push(url.replace(MODE_RGX, `/${newMode}`));
    } else if (url[url.length - 1] === '/') {
      history.push(`${url}${newMode}`);
    } else {
      history.push(`${url}/${newMode}`);
    }
  };

  return (
    <ButtonGroup style={{ maxHeight: 30, marginRight: 8 }}>
      <Button text='4k' active={!mode || mode === '4k'} onClick={() => setMode('4k')} />
      <Button text='7k' active={mode === '7k'} onClick={() => setMode('7k')} />
    </ButtonGroup>
  );
};

export default GlobalModeSelector;
