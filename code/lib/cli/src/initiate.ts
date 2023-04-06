import type { PackageJson } from 'read-pkg-up';
import chalk from 'chalk';
import prompts from 'prompts';
import { telemetry } from '@storybook/telemetry';
import { withTelemetry } from '@storybook/core-server';

import { installableProjectTypes, ProjectType } from './project_types';
import { detect, isStorybookInstalled, detectLanguage, detectBuilder, detectPnp } from './detect';
import { commandLog, codeLog, paddedLog } from './helpers';
import angularGenerator from './generators/ANGULAR';
import aureliaGenerator from './generators/AURELIA';
import emberGenerator from './generators/EMBER';
import reactGenerator from './generators/REACT';
import reactNativeGenerator from './generators/REACT_NATIVE';
import reactScriptsGenerator from './generators/REACT_SCRIPTS';
import nextjsGenerator from './generators/NEXTJS';
import sfcVueGenerator from './generators/SFC_VUE';
import vueGenerator from './generators/VUE';
import vue3Generator from './generators/VUE3';
import webpackReactGenerator from './generators/WEBPACK_REACT';
import mithrilGenerator from './generators/MITHRIL';
import marionetteGenerator from './generators/MARIONETTE';
import markoGenerator from './generators/MARKO';
import htmlGenerator from './generators/HTML';
import webComponentsGenerator from './generators/WEB-COMPONENTS';
import riotGenerator from './generators/RIOT';
import preactGenerator from './generators/PREACT';
import svelteGenerator from './generators/SVELTE';
import qwikGenerator from './generators/QWIK';
import svelteKitGenerator from './generators/SVELTEKIT';
import raxGenerator from './generators/RAX';
import solidGenerator from './generators/SOLID';
import serverGenerator from './generators/SERVER';
import type { JsPackageManager } from './js-package-manager';
import { JsPackageManagerFactory, useNpmWarning } from './js-package-manager';
import type { NpmOptions } from './NpmOptions';
import { automigrate } from './automigrate';
import type { CommandOptions } from './generators/types';
import { initFixes } from './automigrate/fixes';
import { HandledError } from './HandledError';

const logger = console;

const installStorybook = <Project extends ProjectType>(
  projectType: Project,
  packageManager: JsPackageManager,
  options: CommandOptions
): Promise<any> => {
  const npmOptions: NpmOptions = {
    installAsDevDependencies: true,
    skipInstall: options.skipInstall,
  };

  let packageJson;
  try {
    packageJson = packageManager.readPackageJson();
  } catch (err) {
    //
  }

  const language = detectLanguage(packageJson);
  const pnp = detectPnp();

  const generatorOptions = {
    language,
    builder: options.builder || detectBuilder(packageManager, projectType),
    linkable: !!options.linkable,
    pnp: pnp || options.usePnp,
  };

  const runGenerator: () => Promise<any> = async () => {
    switch (projectType) {
      case ProjectType.REACT_SCRIPTS:
        return reactScriptsGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Create React App" based project')
        );

      case ProjectType.REACT:
        return reactGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "React" app\n')
        );

      case ProjectType.REACT_NATIVE: {
        return reactNativeGenerator(packageManager, npmOptions).then(
          commandLog('Adding Storybook support to your "React Native" app\n')
        );
      }

      case ProjectType.QWIK: {
        return qwikGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Qwik" app\n')
        );
      }

      case ProjectType.WEBPACK_REACT:
        return webpackReactGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Webpack React" app\n')
        );

      case ProjectType.REACT_PROJECT:
        return reactGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "React" library\n')
        );

      case ProjectType.NEXTJS:
        return nextjsGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Next" app\n')
        );

      case ProjectType.SFC_VUE:
        return sfcVueGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Single File Components Vue" app\n')
        );

      case ProjectType.VUE:
        return vueGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Vue" app\n')
        );

      case ProjectType.VUE3:
        return vue3Generator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Vue 3" app\n')
        );

      case ProjectType.ANGULAR:
        commandLog('Adding Storybook support to your "Angular" app\n');
        return angularGenerator(packageManager, npmOptions, generatorOptions, options);

      case ProjectType.EMBER:
        return emberGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Ember" app\n')
        );

      case ProjectType.MITHRIL:
        return mithrilGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Mithril" app\n')
        );

      case ProjectType.MARIONETTE:
        return marionetteGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Marionette.js" app\n')
        );

      case ProjectType.MARKO:
        return markoGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Marko" app\n')
        );

      case ProjectType.HTML:
        return htmlGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "HTML" app\n')
        );

      case ProjectType.WEB_COMPONENTS:
        return webComponentsGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "web components" app\n')
        );

      case ProjectType.RIOT:
        return riotGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "riot.js" app\n')
        );

      case ProjectType.PREACT:
        return preactGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Preact" app\n')
        );

      case ProjectType.SVELTE:
        return svelteGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Svelte" app\n')
        );

      case ProjectType.SVELTEKIT:
        return svelteKitGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "SvelteKit" app\n')
        );

      case ProjectType.RAX:
        return raxGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Rax" app\n')
        );

      case ProjectType.AURELIA:
        return aureliaGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Aurelia" app\n')
        );

      case ProjectType.SERVER:
        return serverGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "Server" app\n')
        );

      case ProjectType.NX /* NX */:
        paddedLog(
          'We have detected Nx in your project. Please use `nx g @nrwl/storybook:configuration` to add Storybook to your project.'
        );
        paddedLog('For more information, please see https://nx.dev/packages/storybook');
        return Promise.reject();

      case ProjectType.SOLID:
        return solidGenerator(packageManager, npmOptions, generatorOptions).then(
          commandLog('Adding Storybook support to your "SolidJS" app\n')
        );

      case ProjectType.UNSUPPORTED:
        paddedLog(`We detected a project type that we don't support yet.`);
        paddedLog(
          `If you'd like your framework to be supported, please let use know about it at https://github.com/storybookjs/storybook/issues`
        );

        // Add a new line for the clear visibility.
        logger.log();

        return Promise.resolve();

      default:
        paddedLog(`We couldn't detect your project type. (code: ${projectType})`);
        paddedLog(
          'You can specify a project type explicitly via `sb init --type <type>`, see our docs on how to configure Storybook for your framework: https://storybook.js.org/docs/react/get-started/install'
        );

        // Add a new line for the clear visibility.
        logger.log();

        return projectTypeInquirer(options, packageManager);
    }
  };

  try {
    return runGenerator();
  } catch (err) {
    logger.error(`\n     ${chalk.red(err.stack)}`);
    throw new HandledError(err);
  }
};

const projectTypeInquirer = async (
  options: CommandOptions & { yes?: boolean },
  packageManager: JsPackageManager
) => {
  const manualAnswer = options.yes
    ? true
    : await prompts([
        {
          type: 'confirm',
          name: 'manual',
          message: 'Do you want to manually choose a Storybook project type to install?',
        },
      ]);

  if (manualAnswer !== true && manualAnswer.manual) {
    const frameworkAnswer = await prompts([
      {
        type: 'select',
        name: 'manualFramework',
        message: 'Please choose a project type from the following list:',
        choices: installableProjectTypes.map((type) => ({
          title: type,
          value: type.toUpperCase(),
        })),
      },
    ]);
    return installStorybook(frameworkAnswer.manualFramework, packageManager, options);
  }
  return Promise.resolve();
};

async function doInitiate(options: CommandOptions, pkg: PackageJson): Promise<void> {
  let { packageManager: pkgMgr } = options;
  if (options.useNpm) {
    useNpmWarning();

    pkgMgr = 'npm';
  }
  const packageManager = JsPackageManagerFactory.getPackageManager({ force: pkgMgr });
  const welcomeMessage = 'storybook init - the simplest way to add a Storybook to your project.';
  logger.log(chalk.inverse(`\n ${welcomeMessage} \n`));

  // Update notify code.
  const { default: updateNotifier } = await import('simple-update-notifier');
  await updateNotifier({
    pkg: pkg as any,
    updateCheckInterval: 1000 * 60 * 60, // every hour (we could increase this later on.)
  });

  let projectType;
  const projectTypeProvided = options.type;
  const infoText = projectTypeProvided
    ? `Installing Storybook for user specified project type: ${projectTypeProvided}`
    : 'Detecting project type';
  const done = commandLog(infoText);

  const packageJson = packageManager.retrievePackageJson();

  if (projectTypeProvided) {
    if (installableProjectTypes.includes(projectTypeProvided)) {
      projectType = projectTypeProvided.toUpperCase();
    } else {
      done(`The provided project type was not recognized by Storybook: ${projectTypeProvided}`);
      logger.log(`\nThe project types currently supported by Storybook are:\n`);
      installableProjectTypes.sort().forEach((framework) => paddedLog(`- ${framework}`));
      logger.log();
      throw new HandledError(`Unknown project type supplied: ${projectTypeProvided}`);
    }
  } else {
    try {
      projectType = detect(packageJson, options);
    } catch (err) {
      done(err.message);
      throw new HandledError(err);
    }
  }
  done();

  const storybookInstalled = isStorybookInstalled(packageJson, options.force);

  if (storybookInstalled && projectType !== ProjectType.ANGULAR) {
    logger.log();
    paddedLog('There seems to be a Storybook already available in this project.');
    paddedLog('Apply following command to force:\n');
    codeLog(['sb init [options] -f']);

    // Add a new line for the clear visibility.
    logger.log();
    throw new HandledError(`Angular project already installed`);
  }

  const installResult = await installStorybook(projectType as ProjectType, packageManager, options);

  if (!options.skipInstall && !storybookInstalled) {
    packageManager.installDependencies();
  }

  if (!options.disableTelemetry) {
    telemetry('init', { projectType });
  }

  if (projectType !== ProjectType.REACT_NATIVE) {
    await automigrate({
      yes: options.yes || process.env.CI === 'true',
      packageManager: pkgMgr,
      fixes: initFixes,
      configDir: installResult?.configDir,
    });
  }

  logger.log('\nFor more information visit:', chalk.cyan('https://storybook.js.org'));

  if (projectType === ProjectType.ANGULAR) {
    logger.log('\nTo run your Storybook, type:\n');
    codeLog([`ng run ${installResult.projectName}:storybook`]);
  } else if (projectType === ProjectType.REACT_NATIVE) {
    logger.log();
    logger.log(chalk.yellow('NOTE: installation is not 100% automated.\n'));
    logger.log(`To quickly run Storybook, replace contents of your app entry with:\n`);
    codeLog(["export {default} from './.storybook';"]);
    logger.log('\n Then to run your Storybook, type:\n');
    codeLog([packageManager.getRunCommand('start')]);
    logger.log('\n For more in information, see the github readme:\n');
    logger.log(chalk.cyan('https://github.com/storybookjs/react-native'));
    logger.log();
  } else {
    logger.log('\nTo run your Storybook, type:\n');
    codeLog([packageManager.getRunStorybookCommand()]);
  }

  // Add a new line for the clear visibility.
  logger.log();
}

export async function initiate(options: CommandOptions, pkg: PackageJson): Promise<void> {
  await withTelemetry(
    'init',
    {
      cliOptions: options,
      printError: (err) => !err.handled && logger.error(err),
    },
    () => doInitiate(options, pkg)
  );
}
