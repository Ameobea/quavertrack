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

export function withMobileOrDesktop<T>(
  mediaQueryProps: Record<string, any>,
  MobileComponent: React.ComponentType<T>,
  DesktopComponent: React.ComponentType<T>
): React.FC<T> {
  const WithMobileOrDesktop: React.FC<T> = (props: T) => (
    <MediaQuery {...mediaQueryProps}>
      {(mobile) => (mobile ? <MobileComponent {...props} /> : <DesktopComponent {...props} />)}
    </MediaQuery>
  );
  return WithMobileOrDesktop;
}
