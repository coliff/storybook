import path from 'path';
import fs from 'fs';
import { sync as spawnSync } from 'cross-spawn';

import { getStorybookInfo } from '@storybook/core-common';
import { readConfig, writeConfig } from '@storybook/csf-tools';

import { commandLog } from './helpers';
import {
  JsPackageManagerFactory,
  useNpmWarning,
  type PackageManagerName,
} from './js-package-manager';

const logger = console;

const LEGACY_CONFIGS = ['addons', 'config', 'presets'];

const postinstallAddon = async (addonName: string, isOfficialAddon: boolean) => {
  let skipMsg = null;
  if (!isOfficialAddon) {
    skipMsg = 'unofficial addon';
  } else if (!fs.existsSync('.storybook')) {
    skipMsg = 'no .storybook config';
  } else {
    skipMsg = 'no codmods found';
    LEGACY_CONFIGS.forEach((config) => {
      try {
        const codemod = require.resolve(
          // @ts-expect-error (it is broken)
          `${getPackageName(addonName, isOfficialAddon)}/postinstall/${config}.js`
        );
        commandLog(`Running postinstall script for ${addonName}`)();
        let configFile = path.join('.storybook', `${config}.ts`);
        if (!fs.existsSync(configFile)) {
          configFile = path.join('.storybook', `${config}.js`);
          if (!fs.existsSync(configFile)) {
            fs.writeFileSync(configFile, '', 'utf8');
          }
        }
        spawnSync('npx', ['jscodeshift', '-t', codemod, configFile], {
          stdio: 'inherit',
          shell: true,
        });
        skipMsg = null;
      } catch (err) {
        // resolve failed, skip
      }
    });
  }

  if (skipMsg) {
    commandLog(`Skipping postinstall for ${addonName}, ${skipMsg}`)();
  }
};

const getVersionSpecifier = (addon: string) => {
  const groups = /^(...*)@(.*)$/.exec(addon);
  return groups ? [groups[1], groups[2]] : [addon, undefined];
};

/**
 * Install the given addon package and add it to main.js
 *
 * Usage:
 * - sb add @storybook/addon-docs
 * - sb add @storybook/addon-interactions@7.0.1
 *
 * If there is no version specifier and it's a storybook addon,
 * it will try to use the version specifier matching your current
 * Storybook install version.
 */
export async function add(
  addon: string,
  options: { useNpm: boolean; packageManager: PackageManagerName; skipPostinstall: boolean }
) {
  let { packageManager: pkgMgr } = options;
  if (options.useNpm) {
    useNpmWarning();
    pkgMgr = 'npm';
  }
  const packageManager = JsPackageManagerFactory.getPackageManager({ force: pkgMgr });
  const packageJson = packageManager.retrievePackageJson();
  const [addonName, versionSpecifier] = getVersionSpecifier(addon);

  const { mainConfig, version: storybookVersion } = getStorybookInfo(packageJson);
  if (!mainConfig) {
    logger.error('Unable to find storybook main.js config');
    return;
  }
  const main = await readConfig(mainConfig);
  logger.log(`Verifying ${addonName}`);
  const latestVersion = packageManager.latestVersion(addonName);
  if (!latestVersion) {
    logger.error(`Unknown addon ${addonName}`);
  }

  // add to package.json
  const isStorybookAddon = addonName.startsWith('@storybook/');
  const version = versionSpecifier || (isStorybookAddon ? storybookVersion : latestVersion);
  const addonWithVersion = `${addonName}@${version}`;
  logger.log(`Installing ${addonWithVersion}`);
  packageManager.addDependencies({ installAsDevDependencies: true }, [addonWithVersion]);

  // add to main.js
  logger.log(`Adding '${addon}' to main.js addons field.`);
  main.appendValueToArray(['addons'], addonName);
  await writeConfig(main);

  if (!options.skipPostinstall) {
    await postinstallAddon(addon, isStorybookAddon);
  }
}
