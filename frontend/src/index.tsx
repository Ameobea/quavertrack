import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';

import Routes from './routes';

Sentry.init({
  dsn: 'https://befed19dbb23476f8713714660c75e8e@sentry.ameo.design/3',
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 0.1,
});

const empty = {} as const;

const App: React.FC<typeof empty> = () => <Routes />;

ReactDOM.render(
  <Sentry.ErrorBoundary fallback={'An error has occurred'}>
    <App />
  </Sentry.ErrorBoundary>,
  document.getElementById('root')
);
