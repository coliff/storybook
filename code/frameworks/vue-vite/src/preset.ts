import path from 'path';
import type { PresetProperty } from '@storybook/types';
import { mergeConfig } from 'vite';
import type { StorybookConfig } from './types';
import { vueDocgen } from './plugins/vue-docgen';

export const core: PresetProperty<'core', StorybookConfig> = async (config, options) => {
  const framework = await options.presets.apply<StorybookConfig['framework']>('framework');

  return {
    ...config,
    builder: {
      name: path.dirname(
        require.resolve(path.join('@storybook/builder-vite', 'package.json'))
      ) as '@storybook/builder-vite',
      options: typeof framework === 'string' ? {} : framework?.options.builder || {},
    },
    renderer: '@storybook/vue',
  };
};

export const typescript: PresetProperty<'typescript', StorybookConfig> = async (config) => ({
  ...config,
  skipBabel: true,
});

export const viteFinal: StorybookConfig['viteFinal'] = async (config, { presets }) => {
  return mergeConfig(config, {
    plugins: [vueDocgen()],
    resolve: {
      alias: {
        vue: 'vue/dist/vue.esm.js',
      },
    },
  });
};
