import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Sentry from '@sentry/react';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';

import Routes from './routes';

Sentry.init({
  dsn: 'https://54a7bf50d9c46c0c18dfc8a0557c4fab@sentry.ameo.design/10',
});

const empty = {} as const;

const App: React.FC<typeof empty> = () => <Routes />;

ReactDOM.render(
  <Sentry.ErrorBoundary fallback={'An error has occurred'}>
    <App />
  </Sentry.ErrorBoundary>,
  document.getElementById('root')
);
