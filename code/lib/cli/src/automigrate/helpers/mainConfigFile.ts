import { getStorybookInfo, loadMainConfig } from '@storybook/core-common';
import type { StorybookConfig } from '@storybook/types';
import type { ConfigFile } from '@storybook/csf-tools';
import { readConfig, writeConfig as writeConfigFile } from '@storybook/csf-tools';
import chalk from 'chalk';
import semver from 'semver';
import dedent from 'ts-dedent';
import type { JsPackageManager } from '../../js-package-manager';

const logger = console;

export const getStorybookData = async ({
  packageManager,
  configDir: userDefinedConfigDir,
}: {
  packageManager: JsPackageManager;
  configDir: string;
}) => {
  const packageJson = packageManager.retrievePackageJson();
  const {
    mainConfig: mainConfigPath,
    version: storybookVersionSpecifier,
    configDir: configDirFromScript,
    previewConfig: previewConfigPath,
  } = getStorybookInfo(packageJson, userDefinedConfigDir);
  const storybookVersion =
    storybookVersionSpecifier && semver.coerce(storybookVersionSpecifier)?.version;

  const configDir = userDefinedConfigDir || configDirFromScript || '.storybook';

  let mainConfig: StorybookConfig;
  try {
    mainConfig = await loadMainConfig({ configDir, noCache: true });
  } catch (err) {
    throw new Error(
      dedent`Unable to find or evaluate ${chalk.blue(mainConfigPath)}: ${err.message}`
    );
  }

  return {
    configDir,
    mainConfig,
    storybookVersionSpecifier,
    storybookVersion,
    mainConfigPath,
    previewConfigPath,
  };
};
export type GetStorybookData = typeof getStorybookData;

/**
 * A helper function to safely read and write the main config file. At the end of the callback, main.js will be overwritten.
 * If it fails, it will handle the error and log a message to the user explaining what to do.
 *
 * It receives a mainConfigPath and a callback
 * which will have access to utilities to manipulate main.js.
 *
 * @example
 * ```ts
 * await safeWriteMain({ mainConfigPath, dryRun }, async ({ main }) => {
 *  // manipulate main.js here
 * });
 * ```
 */
export const updateMainConfig = async (
  { mainConfigPath, dryRun }: { mainConfigPath: string; dryRun: boolean },
  callback: (main: ConfigFile) => Promise<void>
) => {
  try {
    const main = await readConfig(mainConfigPath);
    await callback(main);
    if (!dryRun) {
      await writeConfigFile(main);
    }
  } catch (e) {
    logger.info(
      `❌ The migration failed to update your ${chalk.blue(
        mainConfigPath
      )} on your behalf because of the following error:
        ${e}\n`
    );
    logger.info(
      `⚠️ Storybook automigrations are based on AST parsing and it's possible that your ${chalk.blue(
        mainConfigPath
      )} file contains a non-standard format (e.g. your export is not an object) or that there was an error when parsing dynamic values (e.g. "require" calls, or usage of environment variables). When your main config is non-standard, automigrations are unfortunately not possible. Please follow the instructions given previously and follow the documentation to make the updates manually.`
    );
  }
};

export const getAddonNames = (mainConfig: StorybookConfig): string[] => {
  const addons = mainConfig.addons || [];
  const addonList = addons.map((addon) => {
    let name = '';
    if (typeof addon === 'string') {
      name = addon;
    } else if (typeof addon === 'object') {
      name = addon.name;
    }

    if (name.startsWith('.')) {
      return undefined;
    }

    return name
      .replace(/\/dist\/.*/, '')
      .replace(/\.[mc]?[tj]?s[x]?$/, '')
      .replace(/\/register$/, '')
      .replace(/\/manager$/, '')
      .replace(/\/preset$/, '');
  });

  return addonList.filter(Boolean);
};
