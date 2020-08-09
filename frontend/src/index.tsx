import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';

import Routes from './routes';

const empty = {} as const;

const App: React.FC<typeof empty> = () => (
  <div>
    <Routes />
  </div>
);

ReactDOM.render(<App />, document.getElementById('root'));
