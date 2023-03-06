import {
  BuilderContext,
  BuilderOutput,
  Target,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { BrowserBuilderOptions, StylePreprocessorOptions } from '@angular-devkit/build-angular';
import { from, Observable, of } from 'rxjs';
import { CLIOptions } from '@storybook/types';
import { map, switchMap, mapTo } from 'rxjs/operators';
import { sync as findUpSync } from 'find-up';
import { sync as readUpSync } from 'read-pkg-up';

import { buildDevStandalone, withTelemetry } from '@storybook/core-server';
import { StyleElement } from '@angular-devkit/build-angular/src/builders/browser/schema';
import { StandaloneOptions } from '../utils/standalone-options';
import { runCompodoc } from '../utils/run-compodoc';
import { printErrorDetails, errorSummary } from '../utils/error-handler';

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
    | 'port'
    | 'host'
    | 'configDir'
    | 'https'
    | 'sslCa'
    | 'sslCert'
    | 'sslKey'
    | 'smokeTest'
    | 'ci'
    | 'quiet'
    | 'disableTelemetry'
  >;

export type StorybookBuilderOutput = JsonObject & BuilderOutput & {};

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
        ci,
        configDir,
        docs,
        host,
        https,
        port,
        quiet,
        smokeTest,
        sslCa,
        sslCert,
        sslKey,
        disableTelemetry,
      } = options;

      const standaloneOptions: StandaloneOptions = {
        packageJson: readUpSync({ cwd: __dirname }).packageJson,
        ci,
        configDir,
        ...(docs ? { docs } : {}),
        host,
        https,
        port,
        quiet,
        smokeTest,
        sslCa,
        sslCert,
        sslKey,
        disableTelemetry,
        angularBrowserTarget: browserTarget,
        angularBuilderContext: context,
        angularBuilderOptions: {
          ...(stylePreprocessorOptions ? { stylePreprocessorOptions } : {}),
          ...(styles ? { styles } : {}),
        },
        tsConfig,
      };

      return standaloneOptions;
    }),
    switchMap((standaloneOptions) => runInstance(standaloneOptions)),
    map((port: number) => {
      return { success: true, info: { port } };
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
function runInstance(options: StandaloneOptions) {
  return new Observable<number>((observer) => {
    // This Observable intentionally never complete, leaving the process running ;)
    withTelemetry(
      'dev',
      {
        cliOptions: options,
        presetOptions: { ...options, corePresets: [], overridePresets: [] },
        printError: printErrorDetails,
      },
      () => buildDevStandalone(options)
    )
      .then(({ port }) => observer.next(port))
      .catch((error) => {
        observer.error(errorSummary(error));
      });
  });
}
