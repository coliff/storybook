import { logger } from '@storybook/node-logger';
import type { Options, StorybookConfig } from '@storybook/types';
import { getDirectoryFromWorkingDir } from '@storybook/core-common';
import chalk from 'chalk';
import express from 'express';
import { pathExists } from 'fs-extra';
import path from 'path';
import favicon from 'serve-favicon';
import isEqual from 'lodash/isEqual.js';

import { dedent } from 'ts-dedent';
import { defaultStaticDirs } from './constants';

export async function useStatics(router: any, options: Options) {
  const staticDirs = await options.presets.apply<StorybookConfig['staticDirs']>('staticDirs');
  const faviconPath = await options.presets.apply<string>('favicon');

  if (options.staticDir && !isEqual(staticDirs, defaultStaticDirs)) {
    throw new Error(dedent`
      Conflict when trying to read staticDirs:
      * Storybook's configuration option: 'staticDirs'
      * Storybook's CLI flag: '--staticDir' or '-s'
      
      Choose one of them, but not both.
    `);
  }

  const statics = [
    ...staticDirs.map((dir) => (typeof dir === 'string' ? dir : `${dir.from}:${dir.to}`)),
    ...(options.staticDir || []),
  ];

  if (statics && statics.length > 0) {
    await Promise.all(
      statics.map(async (dir) => {
        try {
          const relativeDir = staticDirs
            ? getDirectoryFromWorkingDir({
                configDir: options.configDir,
                workingDir: process.cwd(),
                directory: dir,
              })
            : dir;
          const { staticDir, staticPath, targetEndpoint } = await parseStaticDir(relativeDir);

          // Don't log for the internal static dir
          if (!targetEndpoint.startsWith('/sb-')) {
            logger.info(
              chalk`=> Serving static files from {cyan ${staticDir}} at {cyan ${targetEndpoint}}`
            );
          }

          router.use(targetEndpoint, express.static(staticPath, { index: false }));
        } catch (e) {
          logger.warn(e.message);
        }
      })
    );
  }

  router.use(favicon(faviconPath));
}

export const parseStaticDir = async (arg: string) => {
  // Split on last index of ':', for Windows compatibility (e.g. 'C:\some\dir:\foo')
  const lastColonIndex = arg.lastIndexOf(':');
  const isWindowsAbsolute = path.win32.isAbsolute(arg);
  const isWindowsRawDirOnly = isWindowsAbsolute && lastColonIndex === 1; // e.g. 'C:\some\dir'
  const splitIndex = lastColonIndex !== -1 && !isWindowsRawDirOnly ? lastColonIndex : arg.length;

  const targetRaw = arg.substring(splitIndex + 1) || '/';
  const target = targetRaw.split(path.sep).join(path.posix.sep); // Ensure target has forward-slash path

  const rawDir = arg.substring(0, splitIndex);
  const staticDir = path.isAbsolute(rawDir) ? rawDir : `./${rawDir}`;
  const staticPath = path.resolve(staticDir);
  const targetDir = target.replace(/^\/?/, './');
  const targetEndpoint = targetDir.substring(1);

  if (!(await pathExists(staticPath))) {
    throw new Error(
      dedent(chalk`
        Failed to load static files, no such directory: {cyan ${staticPath}}
        Make sure this directory exists, or omit the {bold -s (--static-dir)} option.
      `)
    );
  }

  return { staticDir, staticPath, targetDir, targetEndpoint };
};
