import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';

import Routes from './routes';

const empty = {} as const;

const App: React.FC<typeof empty> = () => <Routes />;

ReactDOM.render(<App />, document.getElementById('root'));
