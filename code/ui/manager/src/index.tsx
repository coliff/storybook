import { global } from '@storybook/global';
import type { FC } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';

import { Location, LocationProvider, useNavigate } from '@storybook/router';
import { Provider as ManagerProvider } from '@storybook/manager-api';
import type { Combo } from '@storybook/manager-api';
import { ThemeProvider, ensure as ensureTheme } from '@storybook/theming';

import { HelmetProvider } from 'react-helmet-async';

import App from './app';

import Provider from './provider';

// @ts-expect-error (Converted from ts-ignore)
ThemeProvider.displayName = 'ThemeProvider';
// @ts-expect-error (Converted from ts-ignore)
HelmetProvider.displayName = 'HelmetProvider';

export interface RootProps {
  provider: Provider;
  history?: History;
}

export const Root: FC<RootProps> = ({ provider }) => (
  <HelmetProvider key="helmet.Provider">
    <LocationProvider key="location.provider">
      <Main provider={provider} />
    </LocationProvider>
  </HelmetProvider>
);

const Main: FC<{ provider: Provider }> = ({ provider }) => {
  const navigate = useNavigate();
  return (
    <Location key="location.consumer">
      {(locationData) => (
        <ManagerProvider
          key="manager"
          provider={provider}
          {...locationData}
          navigate={navigate}
          docsOptions={global?.DOCS_OPTIONS || {}}
        >
          {({ state, api }: Combo) => {
            const panelCount = Object.keys(api.getPanels()).length;
            const story = api.getData(state.storyId, state.refId);
            const isLoading = story
              ? !!state.refs[state.refId] && !state.refs[state.refId].previewInitialized
              : !state.previewInitialized;

            return (
              <ThemeProvider key="theme.provider" theme={ensureTheme(state.theme)}>
                <App
                  key="app"
                  viewMode={state.viewMode}
                  layout={isLoading ? { ...state.layout, showPanel: false } : state.layout}
                  panelCount={panelCount}
                />
              </ThemeProvider>
            );
          }}
        </ManagerProvider>
      )}
    </Location>
  );
};

export function renderStorybookUI(domNode: HTMLElement, provider: Provider) {
  if (!(provider instanceof Provider)) {
    throw new Error('provider is not extended from the base Provider');
  }

  ReactDOM.render(<Root key="root" provider={provider} />, domNode);
}

export { Provider };
