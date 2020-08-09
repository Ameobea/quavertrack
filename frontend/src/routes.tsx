import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import Home from './pages/Home';
import UserInfo from './pages/UserInfo';

const Routes: React.FC = () => (
  <Router>
    <Switch>
      <Route exact path='/'>
        <Home />
      </Route>

      <Route exact path='/user/:username'>
        <UserInfo />
      </Route>
    </Switch>
  </Router>
);

export default Routes;
