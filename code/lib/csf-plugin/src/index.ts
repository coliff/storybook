import { createUnplugin } from 'unplugin';
import { loadCsf, enrichCsf, formatCsf } from '@storybook/csf-tools';
import type { EnrichCsfOptions } from '@storybook/csf-tools';

export type CsfPluginOptions = EnrichCsfOptions;

const STORIES_REGEX = /\.(story|stories)\.[tj]sx?$/;

const logger = console;

export const unplugin = createUnplugin<CsfPluginOptions>((options) => {
  return {
    name: 'unplugin-csf',
    transformInclude(id) {
      return STORIES_REGEX.test(id);
    },
    async transform(code) {
      try {
        const csf = loadCsf(code, { makeTitle: (userTitle) => userTitle || 'default' }).parse();
        enrichCsf(csf, options);
        return formatCsf(csf, { sourceMaps: true });
      } catch (err: any) {
        // This can be called on legacy storiesOf files, so just ignore
        // those errors. But warn about other errors.
        if (!err.message?.startsWith('CSF:')) {
          logger.warn(err.message);
        }
        return code;
      }
    },
    vite: {
      enforce: 'pre',
    },
  };
});

export const { esbuild } = unplugin;
export const { webpack } = unplugin;
export const { rollup } = unplugin;
export const { vite } = unplugin;
