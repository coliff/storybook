import { dirname, join } from 'path';
import type { StorybookConfig } from './types';

export * from './types';

const wrapForPnP = (input: string) => dirname(require.resolve(join(input, 'package.json')));

export const babel: StorybookConfig['babelDefault'] = (config) => {
  return {
    ...config,
    plugins: [
      [
        require.resolve('@babel/plugin-transform-react-jsx'),
        { importSource: 'preact', runtime: 'automatic' },
      ],
      ...(config.plugins || []).filter((p) => {
        const name = Array.isArray(p) ? p[0] : p;
        if (typeof name === 'string') {
          return !name.includes('plugin-transform-react-jsx');
        }
        return true;
      }),
    ],
    overrides: [
      // Transforms to apply only to first-party code:
      {
        exclude: '**/node_modules/**',
        presets: [require.resolve('@babel/preset-typescript')],
      },
    ],
  };
};

export const webpackFinal: StorybookConfig['webpackFinal'] = (config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias || {}),
        react: wrapForPnP('preact/compat'),
        'react-dom/test-utils': wrapForPnP('preact/test-utils'),
        'react-dom': wrapForPnP('preact/compat'),
        'react/jsx-runtime': wrapForPnP('preact/jsx-runtime'),
      },
    },
  };
};
