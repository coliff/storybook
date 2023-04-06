import { dedent } from 'ts-dedent';
import semver from 'semver';
import { getStorybookData, updateMainConfig } from '../helpers/mainConfigFile';
import type { Fix } from '../types';
import { getStorybookVersionSpecifier } from '../../helpers';

const logger = console;

interface Options {
  value?: boolean;
}

/**
 */
export const mdxgfm: Fix<Options> = {
  id: 'github-flavored-markdown-mdx',

  async check({ configDir, packageManager }) {
    const { mainConfig, storybookVersion } = await getStorybookData({ packageManager, configDir });

    if (!semver.gte(storybookVersion, '7.0.0')) {
      return null;
    }

    const usesMDX1 = mainConfig?.features?.legacyMdx1 === true || false;
    const skip =
      usesMDX1 ||
      !!mainConfig.addons?.find((item) => {
        if (item === '@storybook/addon-mdx-gfm') {
          return true;
        }
        if (typeof item === 'string') {
          return false;
        }
        if (item.name === '@storybook/addon-docs') {
          return item.options?.mdxPluginOptions?.mdxCompileOptions?.remarkPlugins?.length > 0;
        }
        return false;
      });

    if (skip) {
      return null;
    }

    return {};
  },

  prompt() {
    return dedent`
      In MDX1 you had the option of using GitHub flavored markdown.

      Storybook 7.0 uses MDX2 for compiling MDX, and thus no longer supports GFM out of the box.
      Because of this you need to explicitly add the GFM plugin in the addon-docs options:
      https://storybook.js.org/docs/react/writing-docs/mdx#lack-of-github-flavored-markdown-gfm

      We recommend you follow the guide on the link above, however we can add a temporary storybook addon that helps make this migration easier.
      We'll install the addon and add it to your storybook config.
    `;
  },

  async run({ packageManager, dryRun, mainConfigPath, skipInstall }) {
    if (!dryRun) {
      const packageJson = packageManager.retrievePackageJson();
      const versionToInstall = getStorybookVersionSpecifier(packageManager.retrievePackageJson());
      await packageManager.addDependencies(
        { installAsDevDependencies: true, skipInstall, packageJson },
        [`@storybook/addon-mdx-gfm@${versionToInstall}`]
      );

      await updateMainConfig({ mainConfigPath, dryRun }, async (main) => {
        logger.info(`✅ Adding "@storybook/addon-mdx-gfm" addon`);
        if (!dryRun) {
          main.appendValueToArray(['addons'], '@storybook/addon-mdx-gfm');
        }
      });
    }
  },
};
