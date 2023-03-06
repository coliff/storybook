import {
  BuilderContext,
  BuilderOutput,
  Target,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { Observable, from, of, throwError } from 'rxjs';
import { CLIOptions } from '@storybook/types';
import { catchError, map, mapTo, switchMap } from 'rxjs/operators';
import { sync as findUpSync } from 'find-up';
import { sync as readUpSync } from 'read-pkg-up';
import { BrowserBuilderOptions, StylePreprocessorOptions } from '@angular-devkit/build-angular';

import { buildStaticStandalone, withTelemetry } from '@storybook/core-server';
import { StyleElement } from '@angular-devkit/build-angular/src/builders/browser/schema';
import { StandaloneOptions } from '../utils/standalone-options';
import { runCompodoc } from '../utils/run-compodoc';
import { errorSummary, printErrorDetails } from '../utils/error-handler';

export type StorybookBuilderOptions = JsonObject & {
  browserTarget?: string | null;
  tsConfig?: string;
  docs: boolean;
  compodoc: boolean;
  compodocArgs: string[];
  styles?: StyleElement[];
  stylePreprocessorOptions?: StylePreprocessorOptions;
} & Pick<
    // makes sure the option exists
    CLIOptions,
    'outputDir' | 'configDir' | 'loglevel' | 'quiet' | 'webpackStatsJson' | 'disableTelemetry'
  >;

export type StorybookBuilderOutput = JsonObject & BuilderOutput & {};

type StandaloneBuildOptions = StandaloneOptions & { outputDir: string };

export default createBuilder<any, any>(commandBuilder);

function commandBuilder(
  options: StorybookBuilderOptions,
  context: BuilderContext
): Observable<StorybookBuilderOutput> {
  return from(setup(options, context)).pipe(
    switchMap(({ tsConfig }) => {
      const runCompodoc$ = options.compodoc
        ? runCompodoc({ compodocArgs: options.compodocArgs, tsconfig: tsConfig }, context).pipe(
            mapTo({ tsConfig })
          )
        : of({});

      return runCompodoc$.pipe(mapTo({ tsConfig }));
    }),
    map(({ tsConfig }) => {
      const {
        browserTarget,
        stylePreprocessorOptions,
        styles,
        configDir,
        docs,
        loglevel,
        outputDir,
        quiet,
        webpackStatsJson,
        disableTelemetry,
      } = options;

      const standaloneOptions: StandaloneBuildOptions = {
        packageJson: readUpSync({ cwd: __dirname }).packageJson,
        configDir,
        ...(docs ? { docs } : {}),
        loglevel,
        outputDir,
        quiet,
        disableTelemetry,
        angularBrowserTarget: browserTarget,
        angularBuilderContext: context,
        angularBuilderOptions: {
          ...(stylePreprocessorOptions ? { stylePreprocessorOptions } : {}),
          ...(styles ? { styles } : {}),
        },
        tsConfig,
        webpackStatsJson,
      };

      return standaloneOptions;
    }),
    switchMap((standaloneOptions) => runInstance({ ...standaloneOptions, mode: 'static' })),
    map(() => {
      return { success: true };
    })
  );
}

async function setup(options: StorybookBuilderOptions, context: BuilderContext) {
  let browserOptions: (JsonObject & BrowserBuilderOptions) | undefined;
  let browserTarget: Target | undefined;

  if (options.browserTarget) {
    browserTarget = targetFromTargetString(options.browserTarget);
    browserOptions = await context.validateOptions<JsonObject & BrowserBuilderOptions>(
      await context.getTargetOptions(browserTarget),
      await context.getBuilderNameForTarget(browserTarget)
    );
  }

  return {
    tsConfig:
      options.tsConfig ??
      findUpSync('tsconfig.json', { cwd: options.configDir }) ??
      browserOptions.tsConfig,
  };
}

function runInstance(options: StandaloneBuildOptions) {
  return from(
    withTelemetry(
      'build',
      {
        cliOptions: options,
        presetOptions: { ...options, corePresets: [], overridePresets: [] },
        printError: printErrorDetails,
      },
      () => buildStaticStandalone(options)
    )
  ).pipe(catchError((error: any) => throwError(errorSummary(error))));
}
