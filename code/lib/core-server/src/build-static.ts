import chalk from 'chalk';
import { copy, emptyDir, ensureDir } from 'fs-extra';
import { dirname, isAbsolute, join, resolve } from 'path';
import { dedent } from 'ts-dedent';
import { global } from '@storybook/global';

import { logger } from '@storybook/node-logger';
import { telemetry, getPrecedingUpgrade } from '@storybook/telemetry';
import type {
  BuilderOptions,
  CLIOptions,
  CoreConfig,
  DocsOptions,
  LoadOptions,
  Options,
  StorybookConfig,
} from '@storybook/types';
import {
  loadAllPresets,
  loadMainConfig,
  logConfig,
  normalizeStories,
  resolveAddonName,
} from '@storybook/core-common';

import isEqual from 'lodash/isEqual.js';
import { outputStats } from './utils/output-stats';
import {
  copyAllStaticFiles,
  copyAllStaticFilesRelativeToMain,
} from './utils/copy-all-static-files';
import { getBuilders } from './utils/get-builders';
import { extractStoriesJson, convertToIndexV3 } from './utils/stories-json';
import { extractStorybookMetadata } from './utils/metadata';
import { StoryIndexGenerator } from './utils/StoryIndexGenerator';
import { summarizeIndex } from './utils/summarizeIndex';
import { defaultStaticDirs } from './utils/constants';
import { warnOnIncompatibleAddons } from './utils/warnOnIncompatibleAddons';

export type BuildStaticStandaloneOptions = CLIOptions &
  LoadOptions &
  BuilderOptions & { outputDir: string };

export async function buildStaticStandalone(options: BuildStaticStandaloneOptions) {
  /* eslint-disable no-param-reassign */
  options.configType = 'PRODUCTION';

  if (options.outputDir === '') {
    throw new Error("Won't remove current directory. Check your outputDir!");
  }

  if (options.staticDir?.includes('/')) {
    throw new Error("Won't copy root directory. Check your staticDirs!");
  }

  options.outputDir = isAbsolute(options.outputDir)
    ? options.outputDir
    : join(process.cwd(), options.outputDir);
  options.configDir = resolve(options.configDir);
  /* eslint-enable no-param-reassign */

  logger.info(chalk`=> Cleaning outputDir: {cyan ${options.outputDir.replace(process.cwd(), '')}}`);
  if (options.outputDir === '/') {
    throw new Error("Won't remove directory '/'. Check your outputDir!");
  }
  await emptyDir(options.outputDir);
  await ensureDir(options.outputDir);

  const config = await loadMainConfig(options);
  const { framework } = config;
  const corePresets = [];

  const frameworkName = typeof framework === 'string' ? framework : framework?.name;
  if (frameworkName) {
    corePresets.push(join(frameworkName, 'preset'));
  } else {
    logger.warn(`you have not specified a framework in your ${options.configDir}/main.js`);
  }

  await warnOnIncompatibleAddons(config);

  logger.info('=> Loading presets');
  let presets = await loadAllPresets({
    corePresets: [
      require.resolve('@storybook/core-server/dist/presets/common-preset'),
      ...corePresets,
    ],
    overridePresets: [],
    ...options,
  });

  const [previewBuilder, managerBuilder] = await getBuilders({ ...options, presets });
  const { renderer } = await presets.apply<CoreConfig>('core', {});

  presets = await loadAllPresets({
    corePresets: [
      require.resolve('@storybook/core-server/dist/presets/common-preset'),
      ...(managerBuilder.corePresets || []),
      ...(previewBuilder.corePresets || []),
      ...(renderer ? [resolveAddonName(options.configDir, renderer, options)] : []),
      ...corePresets,
      require.resolve('@storybook/core-server/dist/presets/babel-cache-preset'),
    ],
    overridePresets: previewBuilder.overridePresets || [],
    ...options,
  });

  const [features, core, staticDirs, storyIndexers, stories, docsOptions] = await Promise.all([
    presets.apply<StorybookConfig['features']>('features'),
    presets.apply<CoreConfig>('core'),
    presets.apply<StorybookConfig['staticDirs']>('staticDirs'),
    presets.apply('storyIndexers', []),
    presets.apply('stories'),
    presets.apply<DocsOptions>('docs', {}),
  ]);

  const fullOptions: Options = {
    ...options,
    presets,
    features,
  };

  if (options.staticDir && !isEqual(staticDirs, defaultStaticDirs)) {
    throw new Error(dedent`
      Conflict when trying to read staticDirs:
      * Storybook's configuration option: 'staticDirs'
      * Storybook's CLI flag: '--staticDir' or '-s'
      
      Choose one of them, but not both.
    `);
  }

  const effects: Promise<void>[] = [];

  global.FEATURES = features;

  await managerBuilder.build({ startTime: process.hrtime(), options: fullOptions });

  if (staticDirs) {
    effects.push(
      copyAllStaticFilesRelativeToMain(staticDirs, options.outputDir, options.configDir)
    );
  }
  if (options.staticDir) {
    effects.push(copyAllStaticFiles(options.staticDir, options.outputDir));
  }

  const coreServerPublicDir = join(
    dirname(require.resolve('@storybook/core-server/package.json')),
    'public'
  );
  effects.push(copy(coreServerPublicDir, options.outputDir));

  let initializedStoryIndexGenerator: Promise<StoryIndexGenerator> = Promise.resolve(undefined);
  if ((features?.buildStoriesJson || features?.storyStoreV7) && !options.ignorePreview) {
    const workingDir = process.cwd();
    const directories = {
      configDir: options.configDir,
      workingDir,
    };
    const normalizedStories = normalizeStories(stories, directories);
    const generator = new StoryIndexGenerator(normalizedStories, {
      ...directories,
      storyIndexers,
      docs: docsOptions,
      storiesV2Compatibility: !features?.storyStoreV7,
      storyStoreV7: !!features?.storyStoreV7,
    });

    initializedStoryIndexGenerator = generator.initialize().then(() => generator);
    effects.push(
      extractStoriesJson(
        join(options.outputDir, 'stories.json'),
        initializedStoryIndexGenerator,
        convertToIndexV3
      )
    );
    effects.push(
      extractStoriesJson(join(options.outputDir, 'index.json'), initializedStoryIndexGenerator)
    );
  }

  if (!core?.disableProjectJson) {
    effects.push(
      extractStorybookMetadata(join(options.outputDir, 'project.json'), options.configDir)
    );
  }

  if (options.debugWebpack) {
    logConfig('Preview webpack config', await previewBuilder.getConfig(fullOptions));
  }

  if (options.ignorePreview) {
    logger.info(`=> Not building preview`);
  }

  await Promise.all([
    ...(options.ignorePreview
      ? []
      : [
          previewBuilder
            .build({
              startTime: process.hrtime(),
              options: fullOptions,
            })
            .then(async (previewStats) => {
              if (options.webpackStatsJson) {
                const target =
                  options.webpackStatsJson === true ? options.outputDir : options.webpackStatsJson;
                await outputStats(target, previewStats);
              }
            }),
        ]),
    ...effects,
  ]);

  // Now the code has successfully built, we can count this as a 'dev' event.
  if (!core?.disableTelemetry) {
    effects.push(
      initializedStoryIndexGenerator.then(async (generator) => {
        const storyIndex = await generator?.getIndex();
        const payload = {
          precedingUpgrade: await getPrecedingUpgrade(),
        };
        if (storyIndex) {
          Object.assign(payload, {
            storyIndex: summarizeIndex(storyIndex),
          });
        }
        await telemetry('build', payload, { configDir: options.configDir });
      })
    );
  }

  logger.info(`=> Output directory: ${options.outputDir}`);
}
