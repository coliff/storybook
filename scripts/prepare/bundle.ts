#!/usr/bin/env ../../node_modules/.bin/ts-node

import * as fs from 'fs-extra';
import path, { dirname, join, relative } from 'path';
import type { Options } from 'tsup';
import type { PackageJson } from 'type-fest';
import { build } from 'tsup';
import aliasPlugin from 'esbuild-plugin-alias';
import dedent from 'ts-dedent';
import slash from 'slash';
import { exec } from '../utils/exec';

/* TYPES */

type Formats = 'esm' | 'cjs';
type BundlerConfig = {
  entries: string[];
  nodeEntries: string[];
  browserEntries: string[];
  externals: string[];
  platform: Options['platform'];
  pre: string;
  post: string;
  formats: Formats[];
};
type PackageJsonWithBundlerConfig = PackageJson & {
  bundler: BundlerConfig;
};
type DtsConfigSection = Pick<Options, 'dts' | 'tsconfig'>;

/* MAIN */

const run = async ({ cwd, flags }: { cwd: string; flags: string[] }) => {
  const {
    name,
    dependencies,
    peerDependencies,
    bundler: {
      entries = [],
      nodeEntries = [],
      browserEntries = [],
      externals: extraExternals = [],
      platform,
      pre,
      post,
      formats = ['esm', 'cjs'],
    },
  } = (await fs.readJson(join(cwd, 'package.json'))) as PackageJsonWithBundlerConfig;

  if (pre) {
    await exec(`node -r ${__dirname}/../node_modules/esbuild-register/register.js ${pre}`, { cwd });
  }

  const reset = hasFlag(flags, 'reset');
  const watch = hasFlag(flags, 'watch');
  const optimized = hasFlag(flags, 'optimized');

  if (reset) {
    await fs.emptyDir(join(process.cwd(), 'dist'));
  }

  const tasks: Promise<any>[] = [];

  const outDir = join(process.cwd(), 'dist');
  const externals = [
    name,
    ...extraExternals,
    ...Object.keys(dependencies || {}),
    ...Object.keys(peerDependencies || {}),
  ];

  const { dtsBuild, dtsConfig, tsConfigExists } = await getDTSConfigs({
    formats,
    entries,
    optimized,
  });

  if (formats.includes('esm') && [...entries, ...browserEntries].length > 0) {
    tasks.push(
      build({
        treeshake: true,
        silent: true,
        entry: [...entries, ...browserEntries].map((e: string) => slash(join(cwd, e))),
        watch,
        outDir,
        format: ['esm'],
        target: 'chrome100',
        clean: !watch,
        ...(dtsBuild === 'esm' ? dtsConfig : {}),
        platform: platform || 'browser',
        esbuildPlugins: [
          aliasPlugin({
            process: path.resolve('../node_modules/process/browser.js'),
            util: path.resolve('../node_modules/util/util.js'),
          }),
        ],
        external: externals,

        esbuildOptions: (c) => {
          /* eslint-disable no-param-reassign */
          c.conditions = ['module'];
          c.platform = platform || 'browser';
          Object.assign(c, getESBuildOptions(optimized));
          /* eslint-enable no-param-reassign */
        },
      })
    );
  }

  if (formats.includes('cjs') && [...entries, ...nodeEntries].length > 0) {
    tasks.push(
      build({
        silent: true,
        entry: [...entries, ...nodeEntries].map((e: string) => slash(join(cwd, e))),
        watch,
        outDir,
        format: ['cjs'],
        target: 'node16',
        ...(dtsBuild === 'cjs' ? dtsConfig : {}),
        platform: 'node',
        clean: !watch,
        external: externals,

        esbuildOptions: (c) => {
          /* eslint-disable no-param-reassign */
          c.platform = 'node';
          Object.assign(c, getESBuildOptions(optimized));
          /* eslint-enable no-param-reassign */
        },
      })
    );
  }

  await Promise.all(tasks);

  if (tsConfigExists && !optimized) {
    await Promise.all(entries.map(generateDTSMapperFile));
  }

  if (post) {
    await exec(
      `node -r ${__dirname}/../node_modules/esbuild-register/register.js ${post}`,
      { cwd },
      { debug: true }
    );
  }

  console.log('done');
};

/* UTILS */

async function getDTSConfigs({
  formats,
  entries,
  optimized,
}: {
  formats: Formats[];
  entries: string[];
  optimized: boolean;
}) {
  const tsConfigPath = join(cwd, 'tsconfig.json');
  const tsConfigExists = await fs.pathExists(tsConfigPath);

  const dtsBuild = optimized && formats[0] && tsConfigExists ? formats[0] : undefined;

  const dtsConfig: DtsConfigSection = {
    tsconfig: tsConfigPath,
    dts: {
      entry: entries,
      resolve: true,
    },
  };

  return { dtsBuild, dtsConfig, tsConfigExists };
}

function getESBuildOptions(optimized: boolean) {
  return {
    logLevel: 'error',
    legalComments: 'none',
    minifyWhitespace: optimized,
    minifyIdentifiers: false,
    minifySyntax: optimized,
  };
}

async function generateDTSMapperFile(file: string) {
  const { name: entryName, dir } = path.parse(file);

  const pathName = join(process.cwd(), dir.replace('./src', 'dist'), `${entryName}.d.ts`);
  const srcName = join(process.cwd(), file);
  const rel = relative(dirname(pathName), dirname(srcName)).split(path.sep).join(path.posix.sep);

  await fs.ensureFile(pathName);
  await fs.writeFile(
    pathName,
    dedent`
      // dev-mode
      export * from '${rel}/${entryName}';
    `,
    { encoding: 'utf-8' }
  );
}

const hasFlag = (flags: string[], name: string) => !!flags.find((s) => s.startsWith(`--${name}`));

/* SELF EXECUTION */

const flags = process.argv.slice(2);
const cwd = process.cwd();

run({ cwd, flags }).catch((err: unknown) => {
  // We can't let the stack try to print, it crashes in a way that sets the exit code to 0.
  // Seems to have something to do with running JSON.parse() on binary / base64 encoded sourcemaps
  // in @cspotcode/source-map-support
  if (err instanceof Error) {
    console.error(err.stack);
  }
  process.exit(1);
});
