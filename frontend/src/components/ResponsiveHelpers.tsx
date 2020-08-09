import { Without } from 'ameo-utils';
import React from 'react';
import MediaQuery from 'react-responsive';

export function withMobileProp<T extends Record<string, any> & { mobile: boolean }>({
  ...mediaQueryProps
}: Record<string, any>) {
  return (Component: React.ComponentType<T>): React.ComponentType<Without<T, 'mobile'>> => ({
    ...props
  }: T) => (
    <MediaQuery {...mediaQueryProps}>
      {(mobile) => <Component {...props} mobile={mobile} />}
    </MediaQuery>
  );
}
