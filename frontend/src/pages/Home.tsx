import React from 'react';
import { Callout } from '@blueprintjs/core';

import LargeUserSearch from '../components/LargeUserSearch';
import './Home.scss';

const Home: React.FC = () => (
  <div className='home'>
    <h1>Quavertrack</h1>

    <LargeUserSearch />

    <Callout title='About Quavertrack' intent='primary' icon='info-sign'>
      <p>
        Quavertrack is a tool for tracking your stats progression in{' '}
        <a href='https://quavergame.com/'>Quaver</a>, allowing you to see how you and other players
        improve over time. It tracks a variety of statistics ranging from global and country rank,
        total hits, accuracy, and more. Just search your username above to view your own stats or
        those of any other Quaver user.
      </p>
      <p>
        Every time you visit a user&apos;s page, their stats and hiscores will be refreshed. Stats
        are also periodically updated for all users.
      </p>
      <p>
        This site is very new and may have bugs. If you find any issues, let me know! I&apos;m
        @Ameo#0493 in the Quaver Discord Server, or you can email me at casey@cprimozic.net
      </p>
    </Callout>
  </div>
);

export default Home;
