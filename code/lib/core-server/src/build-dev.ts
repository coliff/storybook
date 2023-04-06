import type {
  BuilderOptions,
  CLIOptions,
  CoreConfig,
  LoadOptions,
  Options,
  StorybookConfig,
} from '@storybook/types';
import {
  cache,
  loadAllPresets,
  loadMainConfig,
  resolveAddonName,
  resolvePathInStorybookCache,
  validateFrameworkName,
} from '@storybook/core-common';
import prompts from 'prompts';
import { global } from '@storybook/global';
import { telemetry } from '@storybook/telemetry';

import { join, resolve } from 'path';
import { storybookDevServer } from './dev-server';
import { getReleaseNotesData, getReleaseNotesFailedState } from './utils/release-notes';
import { outputStats } from './utils/output-stats';
import { outputStartupInformation } from './utils/output-startup-information';
import { updateCheck } from './utils/update-check';
import { getServerPort, getServerChannelUrl } from './utils/server-address';
import { getManagerBuilder, getPreviewBuilder } from './utils/get-builders';
import { warnOnIncompatibleAddons } from './utils/warnOnIncompatibleAddons';

export async function buildDevStandalone(
  options: CLIOptions & LoadOptions & BuilderOptions
): Promise<{ port: number; address: string; networkAddress: string }> {
  const { packageJson, versionUpdates, releaseNotes } = options;
  const { version } = packageJson;

  // updateInfo and releaseNotesData are cached, so this is typically pretty fast
  const [port, versionCheck, releaseNotesData] = await Promise.all([
    getServerPort(options.port),
    versionUpdates
      ? updateCheck(version)
      : Promise.resolve({ success: false, cached: false, data: {}, time: Date.now() }),
    releaseNotes
      ? getReleaseNotesData(version, cache)
      : Promise.resolve(getReleaseNotesFailedState(version)),
  ]);

  if (!options.ci && !options.smokeTest && options.port != null && port !== options.port) {
    const { shouldChangePort } = await prompts({
      type: 'confirm',
      initial: true,
      name: 'shouldChangePort',
      message: `Port ${options.port} is not available. Would you like to run Storybook on port ${port} instead?`,
    });
    if (!shouldChangePort) process.exit(1);
  }

  /* eslint-disable no-param-reassign */
  options.port = port;
  options.versionCheck = versionCheck;
  options.releaseNotesData = releaseNotesData;
  options.configType = 'DEVELOPMENT';
  options.configDir = resolve(options.configDir);
  options.outputDir = options.smokeTest
    ? resolvePathInStorybookCache('public')
    : resolve(options.outputDir || resolvePathInStorybookCache('public'));
  options.serverChannelUrl = getServerChannelUrl(port, options);
  /* eslint-enable no-param-reassign */

  const config = await loadMainConfig(options);
  const { framework } = config;
  const corePresets = [];

  const frameworkName = typeof framework === 'string' ? framework : framework?.name;
  validateFrameworkName(frameworkName);

  corePresets.push(join(frameworkName, 'preset'));

  await warnOnIncompatibleAddons(config);

  // Load first pass: We need to determine the builder
  // We need to do this because builders might introduce 'overridePresets' which we need to take into account
  // We hope to remove this in SB8
  let presets = await loadAllPresets({
    corePresets,
    overridePresets: [],
    ...options,
  });

  const { renderer, builder, disableTelemetry } = await presets.apply<CoreConfig>('core', {});

  if (!options.disableTelemetry && !disableTelemetry) {
    if (versionCheck.success && !versionCheck.cached) {
      telemetry('version-update');
    }
  }

  const builderName = typeof builder === 'string' ? builder : builder?.name;
  const [previewBuilder, managerBuilder] = await Promise.all([
    getPreviewBuilder(builderName, options.configDir),
    getManagerBuilder(),
  ]);

  // Load second pass: all presets are applied in order
  presets = await loadAllPresets({
    corePresets: [
      require.resolve('@storybook/core-server/dist/presets/common-preset'),
      ...(managerBuilder.corePresets || []),
      ...(previewBuilder.corePresets || []),
      ...(renderer ? [resolveAddonName(options.configDir, renderer, options)] : []),
      ...corePresets,
      require.resolve('@storybook/core-server/dist/presets/babel-cache-preset'),
    ],
    overridePresets: previewBuilder.overridePresets,
    ...options,
  });

  const features = await presets.apply<StorybookConfig['features']>('features');
  global.FEATURES = features;

  const fullOptions: Options = {
    ...options,
    presets,
    features,
  };

  const { address, networkAddress, managerResult, previewResult } = await storybookDevServer(
    fullOptions
  );

  const previewTotalTime = previewResult && previewResult.totalTime;
  const managerTotalTime = managerResult && managerResult.totalTime;

  const previewStats = previewResult && previewResult.stats;
  const managerStats = managerResult && managerResult.stats;

  if (options.webpackStatsJson) {
    const target = options.webpackStatsJson === true ? options.outputDir : options.webpackStatsJson;
    await outputStats(target, previewStats);
  }

  if (options.smokeTest) {
    const warnings: Error[] = [];
    warnings.push(...(managerStats?.toJson()?.warnings || []));
    warnings.push(...(previewStats?.toJson()?.warnings || []));

    const problems = warnings
      .filter((warning) => !warning.message.includes(`export 'useInsertionEffect'`))
      .filter((warning) => !warning.message.includes(`compilation but it's unused`))
      .filter(
        (warning) => !warning.message.includes(`Conflicting values for 'process.env.NODE_ENV'`)
      );

    // eslint-disable-next-line no-console
    console.log(problems.map((p) => p.stack));
    process.exit(problems.length > 0 ? 1 : 0);
  } else {
    const name =
      frameworkName.split('@storybook/').length > 1
        ? frameworkName.split('@storybook/')[1]
        : frameworkName;

    outputStartupInformation({
      updateInfo: versionCheck,
      version,
      name,
      address,
      networkAddress,
      managerTotalTime,
      previewTotalTime,
    });
  }
  return { port, address, networkAddress };
}
